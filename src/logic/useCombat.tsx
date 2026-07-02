import { create } from 'zustand';
import { useData } from './useData';
import { useStats } from './useStats';
import { usePlayer } from './usePlayer';
import { useItems } from './useItems';
import { useConsole } from './useConsole';
import { CombatStats, DepthEnemies, FixedItem } from '../types/gameTypes';

export interface ActiveEffect {
    id: number;
    remaining?: number;
    timer?: number;
}

export interface Enemy {
    id: number;
    health: number;
    strength: number;
    accuracy: number;
    defence: number;
    effects: ActiveEffect[];
}

interface CombatStore {
    health: number;
    effects: ActiveEffect[];
    enemy: Enemy | null;
    step: number;
    playerTurn: boolean;
    actions: number;
    escape: boolean;
    unlockedEnemy: number | null;
    playerUpdated: boolean;
    enemyUpdated: boolean;
    zoneBarUpdated: boolean;
    playerDamage: number | null;
    enemyDamage: number | null;
    record: number;
    foodUsed: boolean;
    potionUsed: boolean[];
    restSteps: number;
    escapeSteps: number;
    useFood: (food: FixedItem) => void;
    usePotion: (potion: FixedItem) => void;
    isRest: (step: number) => boolean;
    calculateHitChance: (isPlayer: boolean) => number;
    calculateAverageDamage: (isPlayer: boolean) => number;
    calculateDepth: (step: number) => number;
    startCombat: () => void;
    combatAction: () => void;
    applyEquipmentEffects: () => void;
    isPoisoned: (target: "player" | "enemy") => boolean;
    isRegenerating: (target: "player" | "enemy") => boolean;
}

export const useCombat = create<CombatStore>((set, get) => {
    let isRecord = false;

    const useFood = (food: FixedItem): void => {
        if (!get().isRest(get().step)) return;
        if (get().foodUsed) {
            useConsole.getState().addMessage("You are already full.");
            return;
        };

        const stats = useStats.getState().calculateStats("Combat") as CombatStats;
        const heal = useData.getState().gameData.items[food.id].heal ?? 0;
        const healCapped = Math.min(heal, stats.health - get().health);

        useConsole.getState().addMessage(`You restore ${healCapped} health.`);
        useItems.getState().removeItems([{ id: food.id, quantity: 1 }]);
        set((state) => ({ foodUsed: true, health: state.health + healCapped }));
    }

    const defaultPotionUsed = (): boolean[] => {
        const xp = usePlayer.getState().player.xp["Combat"];
        const calculateLvlProperties = useStats.getState().calculateLvlProperties;
        const lvl = calculateLvlProperties(xp).lvl;

        if (lvl < 20) { return ([false, true, true]) };
        if (lvl < 40) { return ([false, false, true]) };
        return ([false, false, false]);
    };

    const usePotion = (potion: FixedItem): void => {
        if (!get().isRest(get().step)) return;
        if (get().potionUsed.every(value => value === true)) {
            useConsole.getState().addMessage("You cannot use any more potions.");
            return;
        };

        const itemData = useData.getState().gameData.items[potion.id];
        if (itemData.effects == undefined) return;

        useConsole.getState().addMessage(`You use the ${itemData.name}.`);
        useItems.getState().removeItems([{ id: potion.id, quantity: 1 }]);

        let newEffects = get().effects;
        for (const effectId of itemData.effects) {
            newEffects = applyEffect(newEffects, effectId);
        }

        set((state) => {
            const updatedPotionUsed = [...state.potionUsed];
            const index = updatedPotionUsed.findIndex(v => v === false);
            if (index !== -1) {
                updatedPotionUsed[index] = true;
            }
            return {
                potionUsed: updatedPotionUsed,
                effects: newEffects
            };
        });
    };

    const calculateDepth = (step: number) => (step <= 10 ? 0 : step <= 20 ? 1 : step <= 30 ? 2 : 3);
    const isRest = (step: number) => [10, 20, 30].includes(step);

    const calculateHitChance = (isPlayer: boolean) => {
        const stats = useStats.getState().calculateStats("Combat") as CombatStats;
        const enemy = get().enemy!;
        if (enemy == null) return 0;
        return isPlayer
            ? stats.accuracy / (stats.accuracy + enemy.defence)
            : enemy.accuracy / (enemy.accuracy + stats.defence);
    };

    const calculateDamage = (isPlayer: boolean) => {
        const strength = isPlayer
            ? (useStats.getState().calculateStats("Combat") as CombatStats).strength
            : get().enemy!.strength;

        const max = Math.floor(strength);
        const fractional = strength - max;

        // Create weights: 1 for each full number, fractional for the extra point
        const weights = Array(max).fill(1);
        if (fractional > 0) {
            weights.push(fractional); // weight for max + 1
        }

        // Total weight
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const rand = Math.random() * totalWeight;

        // Select damage based on weights
        let cumulative = 0;
        let baseDamage = max;
        for (let i = 0; i < weights.length; i++) {
            cumulative += weights[i];
            if (rand < cumulative) {
                baseDamage = i + 1;
                break;
            }
        }

        // Apply damage reduction from active effects
        const gameEffects = useData.getState().gameData.effects;
        const effects = isPlayer ? get().enemy?.effects || [] : get().effects;

        let totalReduction = 0;
        effects.forEach(effect => {
            const effectData = gameEffects[effect.id];
            if (effectData?.reduction) {
                totalReduction += effectData.reduction;
            }
        });

        const finalDamage = Math.max(0, baseDamage - totalReduction);
        return finalDamage;
    };

    const calculateAverageDamage = (isPlayer: boolean): number => {
        const stats = useStats.getState().calculateStats("Combat") as CombatStats;
        const gameEffects = useData.getState().gameData.effects;

        const sourceStrength = isPlayer
            ? stats.strength
            : get().enemy?.strength ?? 0;

        const targetEffects = isPlayer
            ? get().enemy?.effects ?? []
            : get().effects;

        // Calculate total absorption from effects
        let absorb = 0;
        targetEffects.forEach(effect => {
            const effectData = gameEffects[effect.id];
            if (effectData?.reduction) {
                absorb += effectData.reduction;
            }
        });

        const floorStrength = Math.floor(sourceStrength);
        const fraction = sourceStrength - floorStrength;

        let totalDamage = 0;
        const totalWeight = floorStrength + fraction;

        // Full probability hits
        for (let hit = 1; hit <= floorStrength; hit++) {
            const damage = Math.max(hit - absorb, 0);
            totalDamage += damage;
        }

        // Fractional final hit
        if (fraction > 0) {
            const bonusHit = floorStrength + 1;
            const damage = Math.max(bonusHit - absorb, 0);
            totalDamage += damage * fraction;
        }

        return totalDamage / totalWeight;
    };

    function weightedSelection(choices: DepthEnemies): number {
        const totalWeight = choices.reduce((sum, choice) => sum + choice.probability, 0);
        const r = Math.random() * totalWeight;
        let cumulative = 0;

        for (const choice of choices) {
            cumulative += choice.probability;
            if (r < cumulative) return choice.id;
        }
        return choices[choices.length - 1].id;
    }

    const selectEnemy = (depth: number): Enemy => {
        const enemiesData = useData.getState().gameData.enemies;
        const zone = usePlayer.getState().player.task;
        let depthEnemies = useData.getState().gameData.zones[zone!].enemies[depth];

        // Danger effect- only the strongest enemies
        if (get().effects.some(e => e.id === 18)) {
            // compute lvl for each enemy
            const levels = depthEnemies.map(entry => {
                const enemyData = enemiesData[entry.id];
                return {
                    id: entry.id,
                    lvl: enemyData.health
                };
            });

            // find the maximum lvl
            const maxLvl = Math.max(...levels.map(l => l.lvl));

            // zero probability for all but the strongest
            depthEnemies = depthEnemies.map(entry => {
                const thisLvl = levels.find(l => l.id === entry.id)!.lvl;
                return thisLvl === maxLvl
                    ? entry
                    : { ...entry, probability: 0 };
            });
        }

        const enemyId = weightedSelection(depthEnemies);

        return {
            id: enemyId,
            health: enemiesData[enemyId].health,
            strength: enemiesData[enemyId].strength,
            accuracy: enemiesData[enemyId].accuracy,
            defence: enemiesData[enemyId].defence,
            effects: [],
        };
    }

    const defeatEnemy = (enemy: Enemy): void => {
        const { addMessage } = useConsole.getState();
        const { gameData } = useData.getState();
        const enemyData = useData.getState().gameData.enemies[enemy.id];

        // Xp
        const gainXp = useStats.getState().gainXp;
        const xpReward = enemyData.xp;
        gainXp("Combat", xpReward);

        // Loot
        const { rollItems, addItems } = useItems.getState();
        const reward = rollItems(enemyData.items);
        addItems(reward);
        // Map reward items to formatted strings
        const formattedRewards = reward.map(({ id, quantity }) => {
            const itemName = gameData.items[id]?.name
            return `+${quantity} ${itemName}`;
        });
        addMessage(`You defeat the ${enemyData.name}. ${formattedRewards.join(", ")}${formattedRewards.length > 0 ? ", " : ""}+${xpReward} xp.`);


        // Unlocks
        set({ enemyUpdated: true });
        setTimeout(() => set({ enemyUpdated: false }), 150);

        usePlayer.setState((state) => {
            const enemies = [...state.player.records.enemies];
            enemies[enemy.id] = enemies[enemy.id] + 1;

            // Check for unlocks (record going from 0 to >0)
            if (enemies[enemy.id] == 1) {
                const name = useData.getState().gameData.enemies[enemy.id].name;
                useConsole.getState().addMessage(`You have unlocked a new enemy: ${name}.`);
                set({ unlockedEnemy: enemy.id });
                setTimeout(() => set({ unlockedEnemy: null }), 150);
            }

            return {
                player: {
                    ...state.player,
                    records: {
                        ...state.player.records,
                        enemies,
                    },
                },
            };
        });
    }

    const startCombat = () => {
        const stats = useStats.getState().calculateStats("Combat") as CombatStats;
        const zone = usePlayer.getState().player.task!;

        const zoneName = useData.getState().gameData.zones[zone].name;
        useConsole.getState().addMessage(`You enter the ${zoneName}.`);

        isRecord = false;

        set({
            health: stats.health,
            effects: [],
            enemy: selectEnemy(0),
            step: 1,
            playerTurn: true,
            escape: false,
            record: usePlayer.getState().player.records.zones[zone],
        });

        // Apply effects from all equipped items
        get().applyEquipmentEffects();
    }

    const handleRest = (step: number, actions: number, zoneName: string) => {
        actions--;
        // New enemy at new depth once rest actions are complete
        if (actions <= 0) {
            useConsole.getState().addMessage(`You advance deeper into the ${zoneName}.`);
            step++;
            const enemy = selectEnemy(calculateDepth(step));
            return { step, enemy };
        }
        return { actions };
    };

    const handleEscape = (actions: number, zoneName: string) => {
        actions--;
        // Reset step, reset health, new enemy once escape actions are complete
        if (actions <= 0) {
            useConsole.getState().addMessage(`You re-enter the ${zoneName}.`);
            const enemy = selectEnemy(0);
            const health = (useStats.getState().calculateStats('Combat') as CombatStats).health;
            set({ playerUpdated: true, zoneBarUpdated: true });
            setTimeout(() => set({ playerUpdated: false, zoneBarUpdated: false }), 150);
            return { actions, escape: false, step: 1, enemy, health };
        }
        return { actions };
    };

    const handleAttack = (
        playerTurn: boolean,
        health: number,
        effects: ActiveEffect[],
        enemy: Enemy,
        step: number,
        record: number,
        zoneName: string
    ) => {
        // Update effects
        const playerResult = tickEffects(effects, health);
        health = playerResult.updatedHealth;
        effects = playerResult.updatedEffects;
        const enemyResult = tickEffects(enemy.effects, enemy.health, enemy.id);
        enemy.health = enemyResult.updatedHealth;
        enemy.effects = enemyResult.updatedEffects;

        const hit = Math.random() < calculateHitChance(playerTurn);
        // No hit- flash 0 damage for player or enemy
        if (!hit && enemy.health > 0) {
            const key = playerTurn ? 'enemyDamage' : 'playerDamage';
            set({ [key]: 0 });
            setTimeout(() => set({ [key]: null }), 150);
            return {
                health,
                enemy,
                step,
                record,
                effects,
                playerTurn: !playerTurn
            };
        }

        // Hit- calculate and flash damage for player or enemy
        const dmg = calculateDamage(playerTurn);
        const key = playerTurn ? 'enemyDamage' : 'playerDamage';
        set({ [key]: dmg });
        setTimeout(() => set({ [key]: null }), 150);

        if (playerTurn) {
            enemy.health -= dmg;
            enemy.effects = inflictEffects(effects, enemy.effects);

            // Enemy defeated
            if (enemy.health <= 0) {
                defeatEnemy(enemy);
                step++;

                // New record
                if (step > record) {
                    if (!isRecord) useConsole.getState().addMessage(`You have achieved a new best for the ${zoneName}.`);
                    isRecord = true;
                    record = step;
                    usePlayer.getState().player.records.zones[usePlayer.getState().player.task!] = step;
                }
                // If next step is rest, start rest
                if (isRest(step)) {
                    useConsole.getState().addMessage('You may now rest.');
                    return {
                        health,
                        step,
                        enemy: null,
                        actions: get().restSteps,
                        foodUsed: false,
                        potionUsed: defaultPotionUsed(),
                        effects,
                        record,
                        playerTurn: !playerTurn
                    };
                }
                // Otherwise, roll the next enemy
                return {
                    health,
                    step,
                    enemy: selectEnemy(calculateDepth(step)),
                    record,
                    effects,
                    playerTurn: !playerTurn
                };
            }
        } else {
            health -= dmg;
            effects = inflictEffects(enemy.effects, effects);

            // Player defeated- start escape
            if (health <= 0) {
                const enemyName = useData.getState().gameData.enemies[enemy.id].name;
                useConsole.getState().addMessage(`You have been defeated by the ${enemyName}. You are forced to retreat.`);
                return {
                    health: 0,
                    enemy: null,
                    escape: true,
                    actions: get().escapeSteps,
                    playerTurn: !playerTurn
                };
            }
        }

        return {
            health,
            effects,
            enemy,
            step,
            record,
            playerTurn: !playerTurn
        };
    };

    // Calculates how much to change health of player or enemy post effect application
    const effectHeal = (
        currentHealth: number,
        effectId: number,
        enemyId: number | null = null
    ): number => {
        const effectData = useData.getState().gameData.effects[effectId];
        if (!effectData) return 0;

        // Calculate max health for player or enemy
        let stats;
        if (enemyId !== null) {
            stats = useData.getState().gameData.enemies[enemyId];
        } else {
            stats = useStats.getState().calculateStats("Combat") as CombatStats;
        }
        const maxHealth = stats.health;

        const heal = effectData.heal ?? 0;
        const healCapped = Math.min(heal, maxHealth - currentHealth);
        return healCapped;
    };

    const tickEffects = (
        effects: ActiveEffect[],
        currentHealth: number,
        enemyId: number | null = null
    ): { updatedEffects: ActiveEffect[]; updatedHealth: number } => {
        const gameEffects = useData.getState().gameData.effects;

        let updatedHealth = currentHealth;
        const updatedEffects: ActiveEffect[] = [];

        for (const effect of effects) {
            const effectData = gameEffects[effect.id];
            if (!effectData) continue;

            // If effect has no remaining (i.e., permanent), skip ticking but keep it
            if (effect.remaining === undefined) {
                updatedEffects.push(effect);
                continue;
            }

            // Tick down effect duration
            const tick: ActiveEffect = { ...effect, remaining: effect.remaining - 1 };

            // Remove expired effects
            if (tick.remaining! <= 0) continue;

            // Handle timer-based periodic effects
            if (typeof tick.timer === "number" && typeof effectData.every === "number") {
                tick.timer -= 1;
                if (tick.timer <= 0) {
                    updatedHealth += effectHeal(updatedHealth, tick.id, enemyId);
                    tick.timer = effectData.every;
                }
            }

            updatedEffects.push(tick);
        }

        return { updatedEffects, updatedHealth };
    };

    const inflictEffects = (
        source: ActiveEffect[],
        target: ActiveEffect[],
    ): ActiveEffect[] => {
        const gameEffects = useData.getState().gameData.effects;

        let newTarget = target;
        for (const effect of source) {
            const effectData = gameEffects[effect.id];
            if (!effectData) continue;

            const sideEffect = effectData.sideEffect;
            if (sideEffect !== undefined) {
                newTarget = applyEffect(target, sideEffect);
            }
        }
        return newTarget;
    }

    const applyEffect = (
        currentEffects: ActiveEffect[],
        effectId: number
    ): ActiveEffect[] => {
        const effectData = useData.getState().gameData.effects[effectId];
        if (!effectData) { return currentEffects };

        // Remove overridden effects, if any
        const overrideIds: number[] = Array.isArray(effectData.override) ? effectData.override : [];
        const filteredEffects = currentEffects.filter(e => !overrideIds.includes(e.id));

        // Check if the new effect already exists in the filtered list
        const existingIndex = filteredEffects.findIndex(e => e.id === effectId);

        let newEffects: ActiveEffect[];

        if (existingIndex !== -1) {
            // Update remaining duration
            newEffects = [...filteredEffects];
            newEffects[existingIndex] = {
                ...newEffects[existingIndex],
                remaining: effectData.duration,
                ...(effectData.every ? { timer: effectData.every } : {})
            };
        } else {
            // Add the new effect
            newEffects = [
                ...filteredEffects,
                {
                    id: effectId,
                    remaining: effectData.duration,
                    ...(effectData.every ? { timer: effectData.every } : {})
                }
            ];
        }
        return newEffects;
    }

    const applyEquipmentEffects = () => {
        const gameData = useData.getState().gameData;
        const equipment = usePlayer.getState().player.inventory.equipment;

        // Remove existing permanent effects
        set((state) => ({
            effects: state.effects.filter(e => {
                const effectData = gameData.effects[e.id];
                return effectData?.duration !== undefined;
            })
        }));

        // Apply effects from currently equipped items
        let updatedEffects = get().effects;

        for (const key in equipment) {
            const item = equipment[key];
            if (!item) continue;

            const itemEffects = gameData.items[item.id]?.effects;
            if (!itemEffects) continue;

            for (const effectId of itemEffects) {
                updatedEffects = applyEffect(updatedEffects, effectId);
            }
        }

        // Update state with newly applied permanent effects
        set({ effects: updatedEffects });
    };


    const isPoisoned = (target: "player" | "enemy"): boolean => {
        let effects;
        if (target === "player") {
            effects = get().effects;
        } else {
            const enemy = get().enemy;
            if (enemy === null) { return false };
            effects = enemy.effects;
        }
        return effects.some(e => new Set([12, 13, 14]).has(e.id));
    }

    const isRegenerating = (target: "player" | "enemy"): boolean => {
        let effects;
        if (target === "player") {
            effects = get().effects;
        } else {
            const enemy = get().enemy;
            if (enemy === null) { return false };
            effects = enemy.effects;
        }
        return effects.some(e => new Set([15, 16, 17]).has(e.id));
    }

    const combatAction = () => {
        const s = get();
        const zoneName = useData.getState().gameData.zones[usePlayer.getState().player.task!].name;
        let updates: Partial<CombatStore> = {};

        if (isRest(s.step)) {
            updates = handleRest(s.step, s.actions, zoneName);
        } else if (s.escape) {
            updates = handleEscape(s.actions, zoneName);
        } else if (s.enemy) {
            updates = handleAttack(
                s.playerTurn,
                s.health,
                s.effects,
                s.enemy,
                s.step,
                s.record,
                zoneName
            );
        }

        set(updates);
    }

    return {
        health: 1,
        effects: [],
        enemy: null,
        step: 1,
        playerTurn: true,
        actions: 0,
        escape: false,
        unlockedEnemy: null,
        playerUpdated: false,
        enemyUpdated: false,
        zoneBarUpdated: false,
        playerDamage: null,
        enemyDamage: null,
        record: 0,
        foodUsed: false,
        potionUsed: [true, true, true],
        restSteps: 16,
        escapeSteps: 8,
        isRest,
        useFood,
        usePotion,
        calculateHitChance,
        calculateAverageDamage,
        calculateDepth,
        startCombat,
        combatAction,
        applyEquipmentEffects,
        isPoisoned,
        isRegenerating
    };
});