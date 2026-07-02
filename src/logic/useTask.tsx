import { create } from 'zustand';
import { usePlayer } from './usePlayer';
import { useStats } from "./useStats";
import { useData } from "./useData";
import { useItems } from "./useItems";
import { useConsole } from './useConsole';
import { useCombat } from './useCombat';
import { useFarming } from './useFarming';
import { Task, FixedItem } from "../types/gameTypes";
import { useSettings } from './useSettings';

interface TaskStore {
    energy: number;
    actions: number;
    pause: boolean;
    updatedActionsBar: boolean;
    updatedEnergyBar: boolean;

    getTaskData: (skill: string, task: number) => Task;
    selectSkill: (skill: string) => void;
    selectTask: (task: number | null) => void;
    calculateMaxTasks: (skill: string, task: number) => number;
    manualAction: () => void;
    togglePause: () => void;

    performAction: (actions: number) => void;
    completeTask: () => void;
    stopActionTimer: () => void;
    startActionTimer: () => void;
}

export const useTask = create<TaskStore>((set, get) => {
    let actionTimer: NodeJS.Timeout | null = null;
    let energyTimer: NodeJS.Timeout | null = null;

    // Helper functions to stop action and energy timers
    function stopActionTimer() {
        if (actionTimer) {
            clearInterval(actionTimer);
            actionTimer = null;
        }
    }
    function stopEnergyTimer() {
        if (energyTimer) {
            clearInterval(energyTimer);
            energyTimer = null;
        }
    }


    // Helper function to start the action loop
    function startActionTimer() {
        // Exit if already running or task unavailable
        if (actionTimer) return;
        const { player } = usePlayer.getState();
        if (player.task == null) return;
        if (get().calculateMaxTasks(player.skill, player.task!) <= 0) return;
        if (get().energy <= 0) return;

        const { calculateStats } = useStats.getState();
        const speed = calculateStats(player.skill).speed;
        const intervalMs = speed !== 0 ? 1000 / speed : 1000000;

        actionTimer = setInterval(() => {
            get().performAction(1);
        }, intervalMs);
    }

    // Helper function to start the energy loop
    function startEnergyTimer() {
        // Exit if already running or task unavailable
        if (energyTimer) return;
        const { player } = usePlayer.getState();
        if (get().calculateMaxTasks(player.skill, player.task!) <= 0) return;

        // Deplete energy every second
        energyTimer = setInterval(() => {
            const { energy } = get();
            if (energy > 1) {
                depleteEnergy(1);
            } else {
                stopActionTimer();
                stopEnergyTimer();

                // Last tick: deplete fully and stop everything
                depleteEnergy(1);
                const { addMessage } = useConsole.getState();
                addMessage("You have ran out of energy.");
            }
        }, 1000);
    }

    // Helper function to replenish energy to max based on player's stamina level
    function replenishEnergy() {
        const { player } = usePlayer.getState();
        const { calculateLvl } = useStats.getState();
        const { statData } = useData.getState();
        const lvl = calculateLvl(player.xp["Stamina"]);
        const maxEnergy = statData.stamina[lvl];

        if (!get().pause) {
            stopEnergyTimer();
            startEnergyTimer();
        }

        if (get().energy !== maxEnergy) {
            // Set energy to max and flash the energy bar
            set({ energy: maxEnergy, updatedEnergyBar: true });
            setTimeout(() => set({ updatedEnergyBar: false }), 150);
        }
    }

    // Helper function to deplete energy by a specified value, ensuring it doesn't go below zero
    function depleteEnergy(value: number) {
        set((state) => ({ energy: Math.max(0, state.energy - value) }));
    }

    return {
        energy: 0,
        actions: 0,
        pause: false,
        updatedActionsBar: false,
        updatedEnergyBar: false,

        // Selects a skill, resets tasks, and resets timers
        selectSkill: (skill: string) => {
            stopActionTimer();
            stopEnergyTimer();

            usePlayer.setState((state) => ({
                player: { ...state.player, task: null, skill }
            }));

            const { seed, fertiliser } = useFarming.getState();
            if (seed !== null) {
                useFarming.getState().removeSeed();
            }
            if (fertiliser !== null) {
                useFarming.getState().removeFertiliser();
            }
        },

        // Retrieves task data based on skill and task
        getTaskData: (skill: string, task: number): Task => {
            const { gameData } = useData.getState();
            const { player } = usePlayer.getState();

            switch (skill) {
                case "Woodcutting":
                case "Mining":
                case "Stamina": {
                    const data = gameData.tasks[skill][task];
                    return useSettings.getState().fast ? { ...data, actions: 1 } : data;
                }

                case "Processing": {
                    const recipe = gameData.recipes[task];
                    return {
                        name: gameData.items[recipe.output[0].id].name,
                        lvl: recipe.lvl,
                        action: "Make",
                        message: "You process the materials.",
                        actions: useSettings.getState().fast ? 1 : recipe.actions,
                        xp: recipe.xp,
                        input: recipe.input,
                        output: recipe.output
                    };
                }

                case "Merchanting": {
                    const value = useItems.getState().calculateValue(task);
                    return {
                        name: gameData.items[task].name,
                        lvl: 0,
                        action: "Sell",
                        message: `You sell the ${gameData.items[task].name}.`,
                        actions: useSettings.getState().fast ? 1 : 4,
                        xp: gameData.items[task].value,
                        input: [{ id: task, quantity: 1 }],
                        output: [{ id: 79, quantity: { min: value, max: value }, probability: 1 }]
                    };
                }

                case "Combat": {
                    const zone = gameData.zones[task];
                    return {
                        name: zone.name,
                        lvl: zone.lvl,
                        action: "",
                        message: "",
                        actions: 0,
                        xp: 0,
                        input: undefined,
                        output: undefined
                    };
                }
                case "Farming": {
                    const crop = gameData.farming.cropData[player.plots[task].seed!];
                    return {
                        name: "",
                        lvl: 0,
                        action: "",
                        message: "You harvest the crop.",
                        actions: useSettings.getState().fast ? 1 : crop && crop.actions,
                        xp: crop && useFarming.getState().calculateXp(task),
                        input: undefined,
                        output: crop && crop.output
                    };
                }

                default:
                    throw new Error(`Unknown skill: ${skill}`);
            }
        },

        // Calculates max tasks based on inventory and required inputs
        calculateMaxTasks: (skill: string, task: number): number => {
            const { player } = usePlayer.getState();

            const taskData = get().getTaskData(skill, task);
            if (player.skill === "Farming" && useFarming.getState().getPlotState(task) === "empty") {
                return 0;
            }

            if (!taskData.input || taskData.input.length === 0) {
                return Infinity; // no ingredients required
            }

            return Math.min(
                ...taskData.input.map(ing => {
                    const ingQty = player.inventory.items.find(item => item?.id === ing.id)?.quantity ?? 0;
                    return Math.floor(ingQty / ing.quantity);
                })
            );
        },

        // Selects a task, set action coun, and starts timers
        selectTask: (task: number | null) => {
            // Stop any existing timers
            stopActionTimer();
            stopEnergyTimer();

            // Set new player task
            usePlayer.setState((state) => {
                const newPlayer = { ...state.player, task };
                // reset actions based on the new task
                if (task !== null) {
                    const taskObj = get().getTaskData(state.player.skill, task);
                    set({ actions: taskObj.actions });
                }
                return { player: newPlayer };
            });

            // If entering combat, trigger combat logic
            const { player } = usePlayer.getState();
            if (player.skill === "Combat" && player.task !== null) {
                const { startCombat } = useCombat.getState();
                startCombat();
            }

            if (task !== null) {
                replenishEnergy();
                if (!get().pause) {
                    startActionTimer();
                }
            }
        },

        // Manual click: do a single action
        manualAction: () => {
            replenishEnergy();
            if (!get().pause) {
                startActionTimer();
            }

            const { player } = usePlayer.getState();
            const { calculateStats } = useStats.getState();
            const stats = calculateStats(player.skill);
            const clickValue = "click" in stats ? stats.click : 1;

            get().performAction(clickValue);
        },

        // Toggles between auto actions being enabled and disabled
        togglePause: () => {
            const newPause = !get().pause;
            set({ pause: newPause });
            if (newPause) {
                stopEnergyTimer();
                stopActionTimer();
            } else {
                startActionTimer();
                startEnergyTimer();
            }
        },

        // Performs a given number of actions in the current task
        performAction: (actions: number) => {
            const { player } = usePlayer.getState();
            const { combatAction } = useCombat.getState();
            const { farmingAction } = useFarming.getState();

            // Execute special combat logic if in combat
            if (player.skill == "Combat") {
                combatAction();
                return;
            } else if (player.skill == "Farming") {
                farmingAction();
            } else {
                set((state) => {
                    let remaining = state.actions - actions;

                    if (remaining <= 0) {
                        get().completeTask();

                        if (player.task !== null) {
                            remaining = get().getTaskData(player.skill, player.task).actions;
                        }
                    }

                    return { actions: remaining };
                });
            }
            // Stop auto actions if task unavailable
            const maxTasks = get().calculateMaxTasks(player.skill, player.task!);
            if (maxTasks <= 0) {
                stopActionTimer();
                stopEnergyTimer();
                if (player.skill === "Processing") {
                    const { addMessage } = useConsole.getState();
                    addMessage("You have ran out of ingredients.");
                }
            }
        },

        // Completes the current task, processes rewards, and shows message
        completeTask: () => {
            const { player } = usePlayer.getState();
            if (player.task === null) return;

            const { addMessage } = useConsole.getState();
            const { rollItems, addItems, removeItems } = useItems.getState();
            const { gainXp } = useStats.getState();
            const { gameData } = useData.getState();

            const taskData = get().getTaskData(player.skill, player.task);

            // Remove any task inputs
            if (taskData.input) removeItems(taskData.input);

            // Roll for outputs, add to inventory, gain xp
            let reward: FixedItem[] = [];
            if (taskData.output) {
                reward = rollItems(taskData.output);
                addItems(reward);
            }
            gainXp(player.skill, taskData.xp);

            // Build message string
            const formattedRewards = reward.map(({ id, quantity }) => {
                const itemName = gameData.items[id]?.name
                return `+${quantity} ${itemName}`;
            });
            addMessage(`${taskData.message} ${formattedRewards.join(", ")}${formattedRewards.length > 0 ? ", " : ""}+${taskData.xp} xp.`);

            // Flash the actions bar
            set({ updatedActionsBar: true });
            setTimeout(() => set({ updatedActionsBar: false }), 150);
        },

        stopActionTimer: () => {
            stopActionTimer();
        },
        startActionTimer: () => {
            startActionTimer();
        }
    }
});

// Watch for equipment changes and call updateTimers whenever equipment changes
function isEquipmentEqual(
    a: Record<string, FixedItem | null>,
    b: Record<string, FixedItem | null>
): boolean {
    for (const key of Object.keys(a)) {
        const itemA = a[key];
        const itemB = b[key];

        if (itemA === null && itemB === null) continue;
        if (itemA === null || itemB === null) return false;
        if (itemA.id !== itemB.id) return false;
    }

    return true;
}

// setTimeout(() => {
//     const prevEquip = { ...usePlayer.getState().player.inventory.equipment };
//     usePlayer.subscribe((state) => {
//         const currentEquip = state.player.inventory.equipment;
//         const pause = useTask.getState().pause;

//         if (!isEquipmentEqual(prevEquip, currentEquip) && !pause) {
//             Object.assign(prevEquip, currentEquip);
//             useTask.getState().stopActionTimer();
//             useTask.getState().startActionTimer();
//         }
//     });
// }, 0);

export function installTaskEquipmentWatcher() {
    // Guard just in case
    if (typeof usePlayer?.getState !== 'function' || typeof useTask?.getState !== 'function') return;

    let prevEquip = { ...usePlayer.getState().player.inventory.equipment };

    // Use selector form so we only react to equipment changes
    const unsubscribe = usePlayer.subscribe((state) => {
        const equip = state.player.inventory.equipment;
        const pause = useTask.getState().pause;

        if (!isEquipmentEqual(prevEquip, equip) && !pause) {
            prevEquip = { ...equip };
            const t = useTask.getState();
            t.stopActionTimer();
            t.startActionTimer();
        }
    });

    return unsubscribe;
}
