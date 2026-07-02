import React, { useMemo } from "react";
import { IMAGE } from "../config";
import { useData } from "../logic/useData";
import { usePlayer } from "../logic/usePlayer";
import { Text } from "./text";
import { Tooltip } from "./tooltip";
import { Quantity } from "./quantity";
import { useCombat } from "../logic/useCombat";
import { FractionItem } from "./fractionItem";
import { Item } from "./item";

interface EnemyProps {
    index: number;
    quantity: number;
    updated?: boolean;
    lock?: boolean;
}

/**
 * Enemy Component
 * - Displays an enemy icon with a tooltip, quantity, and lock state.
 */
const EnemyComponent: React.FC<EnemyProps> = ({ index, quantity, updated = false, lock = true }) => {

    const enemyData = useData((state) => state.gameData.enemies[index]);
    const enemyRecord = usePlayer((state) => state.player.records.enemies[index]);
    const locked = lock && enemyRecord < 1;
    const gameData = useData((state) => state.gameData);
    const calculateDepth = useCombat((state) => state.calculateDepth);
    const playerData = usePlayer((s) => s.player);

    // Compute image filter based on whether item is locked or updated
    const filter = useMemo(() => {
        if (locked) return "brightness(0%) invert(25%)";
        if (updated) return "brightness(0%) invert(100%)";
        return "brightness(100%)";
    }, [locked, updated]);

    // Find the zone index where this enemy lives
    const zoneIndex = useMemo(() => {
        return gameData.zones.findIndex(zone =>
            zone.enemies.some(depthArray =>
                depthArray.some(e => e.id === index)
            )
        );
    }, [gameData.zones, index]);

    const zoneData = gameData.zones[zoneIndex];

    // Compute per-depth probability for this enemy
    const depthStats = useMemo(() => {
        return zoneData.enemies.map(depthArray => {
            const enemy = depthArray.find(e => e.id === index);
            return enemy ? enemy.probability : 0;
        });
    }, [zoneData, index]);

    // Compute totals for each depth (for the “x / total” display)
    const depthTotals = useMemo(() => {
        return zoneData.enemies.map(depthArray =>
            depthArray.reduce((sum, e) => sum + e.probability, 0)
        );
    }, [zoneData]);

    // How deep the player has unlocked in this zone
    const playerDepth = calculateDepth(playerData.records.zones[zoneIndex]);

    const depthDisplay = useMemo(() => (
        <div style={{ display: "flex" }}>
            {depthStats.map((p, idx) => {
                const unlocked = playerDepth >= idx;
                return (
                    <div
                        key={idx}
                        style={{
                            width: 36,
                            height: 20,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            backgroundImage: `url(${IMAGE}combat/depth${idx}${unlocked ? (p > 0 ? "on" : "off") : "off"}.png)`,
                        }}
                    >
                        <Text
                            text={unlocked ? (p > 0 ? `${p}/${depthTotals[idx]}` : "") : "???"}
                            type="shadow"
                            colour="white"
                        />
                    </div>
                );
            })}
        </div>
    ), [depthStats, depthTotals, playerDepth]);

    const itemIcons = useMemo(() => (
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
            {enemyData.items.map((it, i) => (
                <FractionItem
                    key={i}
                    item={
                        <Item index={it.id} quantity={it.quantity.min} quantityMax={it.quantity.max} />
                    }
                    value={it.probability}
                    colour={"white"}
                />
            ))}
            <div style={{ marginLeft: "8px" }}>
                <Text text={`${enemyData.xp} xp`} type="bold" colour="white" />
            </div>
        </div>
    ), [enemyData.items, enemyData.xp]);

    // Mouse-over tooltip
    const tooltipContent = useMemo(() => {
        if (locked) {
            return (<Text text={"???"} type="normal" colour="white" />);
        }

        return (
            <>
                <Text text={enemyData.name} type="bold" colour="white" />

                <div style={{ marginTop: "8px" }}>
                    <Text text={"Stats: "} type="normal" colour="white" />
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <Text text={"• Health: "} type="normal" colour="white" />
                        <Text text={enemyData.health.toLocaleString()} type="bold" colour="white" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <Text text={"• Strength: "} type="normal" colour="white" />
                        <Text text={enemyData.strength.toLocaleString()} type="bold" colour="white" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <Text text={"• Accuracy: "} type="normal" colour="white" />
                        <Text text={enemyData.accuracy.toLocaleString()} type="bold" colour="white" />
                    </div>
                    <div style={{ display: "flex", alignItems: "center" }}>
                        <Text text={"• Defence: "} type="normal" colour="white" />
                        <Text text={enemyData.defence.toLocaleString()} type="bold" colour="white" />
                    </div>
                </div>

                <div style={{ marginTop: "8px" }}>
                    <Text text={"Frequency: "} type="normal" colour="white" />
                    {depthDisplay}
                </div>

                <div style={{ marginTop: "8px" }}>
                    <Text text={"Rewards: "} type="normal" colour="white" />
                    {itemIcons}
                </div>
            </>
        );
    }, [
        depthDisplay,
        enemyData.accuracy,
        enemyData.defence,
        enemyData.health,
        enemyData.name,
        enemyData.strength,
        itemIcons,
        locked,
    ]);

    return (
        <Tooltip content={tooltipContent}>
            <div
                style={{
                    position: "relative",
                    width: "44px",
                    height: "44px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center"
                }}
            >
                {/* Quantity text */}
                <Quantity min={quantity} />

                {/* Enemy icon */}
                <img
                    src={`${IMAGE}enemies/${index}.png`}
                    style={{
                        filter: filter,
                        pointerEvents: "none"
                    }}
                />
            </div>
        </Tooltip>
    );
};

export const Enemy = React.memo(EnemyComponent);
