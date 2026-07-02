import { create } from 'zustand';
import { usePlayer } from './usePlayer';
import { useConsole } from './useConsole';
import { useData } from './useData';
import { SkillStats } from "../types/gameTypes";
import { useCombat } from './useCombat';

interface LvlProperties {
    lvl: number;
    progressPercent: number;
    xpForNextLvl: number;
    gainedXpThisLevel: number;
    requiredXpThisLevel: number;
    remainingXp: number;
}

interface unlock {
    skill: string;
    task: number;
}

interface StatsStore {
    updatedXpBar: boolean;
    calculateLvl: (xp: number) => number;
    calculateLvlProperties: (xp: number) => LvlProperties;
    calculateStats: (skill: string, lvlOverride?: number) => SkillStats;
    gainXp: (skill: string, value: number) => void;
    lvlUp: (skill: string, newLvl: number) => void;
    unlockedTasks: unlock[];
    removeUnlockedTask: (skill: string, task: number) => void;
}

export const useStats = create<StatsStore>((set) => ({
    updatedXpBar: false,
    unlockedTasks: [],

    removeUnlockedTask: (skill: string, task: number): void => {
        set((state) => ({
            unlockedTasks: state.unlockedTasks.filter(
                (t) => !(t.skill === skill && t.task === task)
            ),
        }));
    },

    /**
     * Looks up XP table to find the level of a skill.
     */
    calculateLvl: (xp: number): number => {
        const { statData } = useData.getState();
        return statData.xp.findIndex((threshold, index) =>
            xp < threshold && xp >= (statData.xp[index - 1] || 0)
        ) - 1;
    },

    /**
     * Calculates level properties (progress, XP required, remaining XP, etc.).
     */
    calculateLvlProperties: (xp: number): LvlProperties => {
        const { statData } = useData.getState();
        const lvl = useStats.getState().calculateLvl(xp);
        const xpAtCurrentLvl = statData.xp[lvl];
        const xpForNextLvl = statData.xp[lvl + 1];

        const gainedXpThisLevel = xp - xpAtCurrentLvl;
        const requiredXpThisLevel = xpForNextLvl - xpAtCurrentLvl;
        const remainingXp = requiredXpThisLevel - gainedXpThisLevel;

        const progressPercent = (gainedXpThisLevel / requiredXpThisLevel) * 100;

        return {
            lvl,
            progressPercent,
            xpForNextLvl,
            gainedXpThisLevel,
            requiredXpThisLevel,
            remainingXp
        };
    },

    /**
     * Calculates stats of a skill based on level and equipment bonuses.
     */
    calculateStats: (skill: string, lvlOverride?: number): SkillStats => {
        const { player } = usePlayer.getState();
        const { effects } = useCombat.getState();
        const { gameData, statData } = useData.getState();

        const lvl = lvlOverride !== undefined
            ? lvlOverride
            : useStats.getState().calculateLvl(player.xp[skill]);

        let stats: SkillStats;
        const absoluteBonuses: Partial<SkillStats> = {};
        const percentageBonuses: Partial<SkillStats> = {};

        // Initialize base stats based on skill
        switch (skill) {
            case "Woodcutting":
            case "Mining":
            case "Processing":
                stats = { speed: statData.speed[lvl], click: 1 };
                break;
            case "Stamina":
                stats = { speed: statData.speed[lvl], energy: statData.stamina[lvl] };
                break;
            case "Merchanting":
                stats = { speed: statData.speed[lvl], multiplier: statData.merchanting[lvl] };
                break;
            case "Farming":
                stats = { speed: statData.speed[lvl], click: 1, yield: statData.farming[lvl] };
                break;
            case "Combat":
                stats = {
                    speed: statData.speed[lvl],
                    health: statData.combat.health[lvl],
                    strength: statData.combat.strength[lvl],
                    accuracy: statData.combat.accuracy[lvl],
                    defence: statData.combat.defence[lvl]
                };
                break;
            default:
                throw new Error(`Unknown skill: ${skill}`);
        }

        // Collect bonuses from equipment
        Object.values(player.inventory.equipment).forEach((equipment) => {
            if (equipment) {
                const item = gameData.items[equipment.id];
                const bonuses = item?.bonus?.[skill];

                if (bonuses) {
                    Object.entries(bonuses).forEach(([stat, bonus]) => {
                        const statKey = stat as keyof SkillStats;
                        if (bonus.absolute) {
                            absoluteBonuses[statKey] = (absoluteBonuses[statKey] || 0) + bonus.absolute;
                        }
                        if (bonus.percent) {
                            percentageBonuses[statKey] = (percentageBonuses[statKey] || 0) + bonus.percent;
                        }
                    });
                }
            }
        });

        // Collect bonuses from potion effects
        if (skill == "Combat") {
            effects.forEach(({ id }) => {
                const effectData = gameData.effects[id];
                const bonuses = effectData.bonus;
                if (bonuses) {
                    Object.entries(bonuses).forEach(([stat, bonus]) => {
                        const statKey = stat as keyof SkillStats;
                        if (bonus.absolute) {
                            absoluteBonuses[statKey] = (absoluteBonuses[statKey] || 0) + bonus.absolute;
                        }
                        if (bonus.percent) {
                            percentageBonuses[statKey] = (percentageBonuses[statKey] || 0) + bonus.percent;
                        }
                    });
                }
            });
        }

        // Apply absolute bonuses
        const absEntries = Object.entries(absoluteBonuses) as [keyof SkillStats, number][];
        absEntries.forEach(([stat, absoluteValue]) => {
            const statKey = stat as keyof SkillStats;
            stats[statKey] = (stats[statKey] || 0) + absoluteValue;
        });

        // Apply percentage bonuses
        const perEntries = Object.entries(percentageBonuses) as [keyof SkillStats, number][];
        perEntries.forEach(([stat, percentValue]) => {
            const statKey = stat as keyof SkillStats;
            stats[statKey] = (stats[statKey] || 0) * (1 + percentValue / 100);
        });

        return stats;
    },

    /**
     * Triggers level-up messages.
     */
    lvlUp: (skill: string, newLvl: number) => {
        const { addMessage } = useConsole.getState();

        setTimeout(() => {
            const oldStats = useStats.getState().calculateStats(skill, newLvl - 1);
            const newStats = useStats.getState().calculateStats(skill, newLvl);

            const bonuses: string[] = [];

            Object.keys(newStats).forEach((key) => {
                const statKey = key as keyof SkillStats;
                const oldValue = oldStats[statKey] ?? 0;
                const newValue = newStats[statKey] ?? 0;

                if (newValue > oldValue) {
                    const diff = newValue - oldValue;
                    bonuses.push(`+${diff.toFixed(2)} ${statKey}`);
                }
            });

            // Build lvl up message
            let message = `You have reached lvl ${newLvl} ${skill}.`;
            if (bonuses.length > 0) {
                message += ` Gained bonus: ${bonuses.join(", ")}.`;
            }
            addMessage(message);

            const unlockLvls = useData.getState().gameData.unlockLvls;
            const unlocks = unlockLvls[skill]?.[newLvl] || [];
            if (unlocks.length) {
                // queue unlock messages
                addMessage('You have new unlocks.');
                // update unlockedTasks state
                set((state) => ({
                    unlockedTasks: [
                        ...state.unlockedTasks,
                        ...unlocks.map((task) => ({ skill, task })),
                    ],
                }));
            }

            set({ updatedXpBar: true });
            setTimeout(() => set({ updatedXpBar: false }), 150);
        }, 0);
    },

    /**
     * Gains XP and triggers level-up when necessary.
     */
    gainXp: (skill: string, value: number) => {
        usePlayer.setState((state) => {
            const currentXp = state.player.xp[skill];
            const newXp = currentXp + value;

            // Calculate current and new levels
            const currentLvl = useStats.getState().calculateLvl(currentXp);
            const newLvl = useStats.getState().calculateLvl(newXp);

            if (newLvl > currentLvl) {
                useStats.getState().lvlUp(skill, newLvl);
            }

            return {
                player: {
                    ...state.player,
                    xp: { ...state.player.xp, [skill]: newXp }
                }
            };
        });
    }
}));