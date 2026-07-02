import { create } from 'zustand';
import { usePlayer } from './usePlayer';
import { FarmingStats, FixedItem } from '../types/gameTypes';
import { useItems } from './useItems';
import { useData } from './useData';
import { useTask } from './useTask';
import { useConsole } from './useConsole';
import { useStats } from './useStats';
import { useSettings } from './useSettings';

interface PlotTime {
    time: number;
    maxTime: number;
    boost: number;
}

export type PlotState = 'empty' | 'growing' | 'grown';

interface FarmingStore {
    calculateXp: (plot: number) => number;
    depleteChance: () => number;
    farmingAction: () => void;
    useSeed: (item: FixedItem) => void;
    removeSeed: () => void;
    useFertiliser: (item: FixedItem) => void;
    removeFertiliser: () => void;
    getPlotState: (plot: number) => PlotState;
    initialisePlots: () => void;
    expandPlots: (index: number) => void;
    seed: FixedItem | null;
    fertiliser: FixedItem | null;
    plotTimes: (PlotTime | null)[];
}

export const useFarming = create<FarmingStore>((set, get) => {
    let interval: NodeJS.Timeout | null = null;

    const calculateXp = (plot: number): number => {
        const items = useData.getState().gameData.items;
        const farmingData = useData.getState().gameData.farming;
        const plotData = usePlayer.getState().player.plots[plot];
        if (plotData.seed == null) return 0;

        const seedXp = farmingData.cropData[plotData.seed].xp
        const fertiliserBoost = plotData.fertiliser !== null ? items[plotData.fertiliser].xpBoost! : 0;

        return Math.round(seedXp * (1 + fertiliserBoost / 100));
    };

    const calculatePlotTime = (plot: number): PlotTime => {
        const plotState = get().getPlotState(plot);
        const plotData = usePlayer.getState().player.plots[plot];

        let seedId, fertiliserId;
        if (plotState == "empty") {
            // Empty plots calculate time based on inserted items
            seedId = get().seed?.id;
            fertiliserId = get().fertiliser?.id;
        } else if (plotState == "growing") {
            // Growing plots calculate time baesd on what was planted
            seedId = usePlayer.getState().player.plots[plot].seed;
            fertiliserId = usePlayer.getState().player.plots[plot].fertiliser;
        }

        const maxTime = useSettings.getState().fast ? 2 : (seedId ? useData.getState().gameData.farming.cropData[seedId].growthTime : 0);
        const boostPercent = fertiliserId ? useData.getState().gameData.items[fertiliserId].growthBoost! : 0;
        const boost = Math.round((boostPercent / 100) * maxTime);
        let time = maxTime - boost;
        // Calculate plot time based on planted time data
        if (plotData.planted !== null) {
            const plantedTime = new Date(plotData.planted).getTime();
            const now = Date.now();
            const elapsedSeconds = Math.floor((now - plantedTime) / 1000);
            time = Math.max(time - elapsedSeconds, 0);
        }

        return { time, maxTime, boost }
    };

    const depleteChance = (): number => {
        const stats = useStats.getState().calculateStats('Farming') as FarmingStats;
        return 1 / stats.yield;
    };

    const depleteCrop = () => {
        const { task, plots } = usePlayer.getState().player;
        // Empty player plot data
        usePlayer.setState(s => {
            if (task == null) return s;
            const updated = [...plots];
            updated[task] = { seed: null, fertiliser: null, planted: null };
            return { player: { ...s.player, plots: updated } };
        });

        if (task == null) return;
        // Reset plot times
        set((state) => {
            const newTimes = [...state.plotTimes];
            newTimes[task] = calculatePlotTime(task);
            return { plotTimes: newTimes };
        });

        const { addMessage } = useConsole.getState();
        addMessage("The crop depletes.");
    }

    const farmingAction = () => {
        const player = usePlayer.getState().player;
        if (player.task == null) return;
        const state = get().getPlotState(player.task);

        if (state === "empty" && get().seed !== null) {
            // If empty plot, action is planting
            plant(player.task);
        } else if (state === "grown") {
            // If grown plot, action is harvesting
            useTask.setState((s) => {
                let remaining = s.actions - 1;

                if (remaining <= 0) {
                    useTask.getState().completeTask();
                    if (Math.random() < depleteChance()) {
                        depleteCrop();
                    }
                    remaining = useTask.getState().getTaskData(player.skill, player.task!).actions;
                }

                return { actions: remaining };
            });
        }
    };

    const useSeed = (item: FixedItem) => {
        const { skill, task } = usePlayer.getState().player;
        if (skill !== 'Farming' || task == null || get().getPlotState(task) !== 'empty') return;
        // Remove existing seed from slot if present, and remove from inventory
        if (get().seed) removeSeed();
        useItems.getState().removeItems([{ id: item.id, quantity: 1 }]);

        // Place seed into slot and update plot times
        set({ seed: { id: item.id, quantity: 1 } });
        set((state) => {
            const newTimes = [...state.plotTimes];
            newTimes[task] = calculatePlotTime(task);
            return { plotTimes: newTimes };
        });
    };

    const removeSeed = () => {
        // Remove existing seed from slot if present
        const seed = get().seed;
        if (!seed) return;
        // Add seed back into inventory
        useItems.getState().addItems([{ id: seed.id, quantity: seed.quantity }], false);
        set({ seed: null });

        // Recalculate plot times
        const { task } = usePlayer.getState().player;
        if (task) {
            set((state) => {
                const newTimes = [...state.plotTimes];
                newTimes[task] = calculatePlotTime(task);
                return { plotTimes: newTimes };
            });
        }
    };

    const useFertiliser = (item: FixedItem) => {
        const { skill, task } = usePlayer.getState().player;
        if (skill !== 'Farming' || task == null || get().getPlotState(task) !== 'empty') return;
        // Remove existing fertiliser from slot if present, and remove from inventory
        if (get().fertiliser) removeFertiliser();
        useItems.getState().removeItems([{ id: item.id, quantity: 1 }]);

        // Place fertiliser into slot and update plot times
        set({ fertiliser: { id: item.id, quantity: 1 } });
        set((state) => {
            const newTimes = [...state.plotTimes];
            newTimes[task] = calculatePlotTime(task);
            return { plotTimes: newTimes };
        });
    };

    const removeFertiliser = () => {
        // Remove existing fertiliser from slot if present
        const fertiliser = get().fertiliser;
        if (!fertiliser) return;
        // Add fertiliser back into inventory
        useItems.getState().addItems([{ id: fertiliser.id, quantity: fertiliser.quantity }], false);
        set({ fertiliser: null });

        // Recalculate plot times
        const { task } = usePlayer.getState().player;
        if (task) {
            set((state) => {
                const newTimes = [...state.plotTimes];
                newTimes[task] = calculatePlotTime(task);
                return { plotTimes: newTimes };
            });
        }
    };

    const plant = (plot: number) => {
        const seed = get().seed;
        const fertiliser = get().fertiliser;
        if (!seed) return;

        // Fill player plot data
        usePlayer.setState((s) => {
            const newPlots = [...s.player.plots];

            newPlots[plot] = {
                seed: seed ? seed.id : null,
                fertiliser: fertiliser ? fertiliser.id : null,
                planted: new Date().toISOString()
            }
            return { player: { ...s.player, plots: newPlots } };
        });
        // Go back to task list
        useTask.getState().selectTask(null);
        // Empty seed and fertiliser slots, and update plot times for planted plot
        set((state) => {
            const newTimes = [...state.plotTimes];
            newTimes[plot] = calculatePlotTime(plot);
            return { plotTimes: newTimes, seed: null, fertiliser: null };
        });

        const { addMessage } = useConsole.getState();
        const items = useData.getState().gameData.items;
        addMessage(`You plant the ${items[seed.id].name}${fertiliser ? ` with ${items[fertiliser.id].name}` : ""}.`);
    };

    const tick = () => {
        if (interval) return;
        interval = setInterval(() => {
            set(state => ({
                plotTimes: state.plotTimes.map((pt, idx) => {
                    if (!pt) return null;
                    const nextState = get().getPlotState(idx);
                    if (pt.time === 1) {
                        const seedId = usePlayer.getState().player.plots[idx].seed!;
                        const name = useData.getState().gameData.farming.cropData[seedId].name;
                        useConsole.getState().addMessage(`Your ${name} crop is ready to harvest.`);
                    }
                    return nextState === 'growing'
                        ? { ...pt, time: Math.max(pt.time - 1, 0) }
                        : pt;
                })
            }));
        }, 1000);
    };

    const getPlotState = (plot: number): PlotState => {
        // Determine whether a plot is empty, growing, or grown
        const plots = usePlayer.getState().player.plots;
        const data = plots[plot];
        if (!data || !data.seed) return 'empty';
        const plotTime = get().plotTimes[plot];
        return plotTime && plotTime.time <= 0 ? 'grown' : 'growing';
    };

    const initialisePlots = () => {
        // Set the plot times if seeds are planted, otherwise null
        const plots = usePlayer.getState().player.plots;
        set({ plotTimes: plots.map((p, i) => p.seed ? calculatePlotTime(i) : null) });
        tick();
    };

    const expandPlots = (index: number) => {
        usePlayer.setState(s => {
            const newPlots = s.player.plots.slice();
            for (let i = newPlots.length; i <= index; i++) {
                newPlots[i] = { seed: null, fertiliser: null, planted: null };
            }
            return { player: { ...s.player, plots: newPlots } };
        });
    }

    return {
        calculateXp,
        depleteChance,
        farmingAction,
        useSeed,
        removeSeed,
        useFertiliser,
        removeFertiliser,
        getPlotState,
        initialisePlots,
        expandPlots,
        seed: null,
        fertiliser: null,
        plotTimes: [null],
    };
})
