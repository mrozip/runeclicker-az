import React, { useMemo } from "react";
import { SkillBanner } from "../skillBanner";
import { ActiveEffect, useCombat } from "../../logic/useCombat";
import { useData } from "../../logic/useData";
import { ActionButton } from "./actionButton";
import { EnergyBar } from "./energyBar";
import { CombatItem } from "../taskList/combatItem";
import { ProgressBar } from "../progressBar";
import { Text } from "../text";
import { IMAGE } from "../../config";
import { TaskIcon } from "../taskList/taskIcon";
import { Enemy as EnemyType } from "../../logic/useCombat";
import { useStats } from "../../logic/useStats";
import { CombatStats } from "../../types/gameTypes";
import { Tooltip } from "../tooltip";
import { ZoneBar } from "./zoneBar";
import { usePlayer } from "../../logic/usePlayer";
import { EquipmentSlot } from "../inventory/equipmentSlot";
import { useItems } from "../../logic/useItems";
import { EffectTooltip } from "../effectTooltip";
import { Enemy } from "../enemy";

const LabelsRow: React.FC<{
    enemy: EnemyType | null;
    rest: boolean;
    escape: boolean;
}> = ({ enemy, rest, escape }) => {
    const enemyName = useData((state) => enemy ? state.gameData.enemies[enemy.id].name : "");
    let name;
    let icon;
    if (rest) {
        name = "Rest";
        icon = <img
            src={`${IMAGE}combat/rest.png`}
            style={{
                pointerEvents: "none",
                objectFit: "contain"
            }}
        />
    } else if (escape) {
        name = "Escape";
        icon = <img
            src={`${IMAGE}combat/escape.png`}
            style={{
                pointerEvents: "none",
                objectFit: "contain"
            }}
        />
    } else {
        name = enemyName;
        icon = enemy ? <Enemy index={enemy.id} quantity={1} lock={false} /> : null;
    }

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "45% 10% 45%",
                alignItems: "center",
            }}
        >
            <div style={{ justifySelf: "end", alignSelf: "end", marginBottom: 2 }}>
                <Text text="You" type="bold" />
            </div>
            <div />
            <div style={{ display: "flex", alignItems: "flex-end", marginBottom: 2, gap: "4px" }}>
                <TaskIcon icon={icon} />
                <Text text={name} type="bold" />
            </div>
        </div>
    );
};

const EffectsList: React.FC<{
    effects: ActiveEffect[];
}> = ({ effects }) => {
    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '4px',
                maxWidth: '160px',
            }}
        >
            {effects.map(effect => {
                const tooltipContent = (<EffectTooltip effectKeys={[effect.id]} />);
                return (
                    <Tooltip key={effect.id} content={tooltipContent}>
                        <div style={{ position: 'relative', width: 28, height: 28 }}>
                            <img
                                src={`${IMAGE}effects/${effect.id}.png`}
                                style={{ border: "1px solid black", pointerEvents: "none", width: '100%', height: '100%' }}
                            />
                            {effect.remaining !== undefined && (
                                <div style={{ position: 'absolute', bottom: -4, right: -1 }}>
                                    <Text text={String(effect.remaining)} type="shadow" colour="white" />
                                </div>
                            )}
                        </div>
                    </Tooltip>
                );
            })}
        </div>
    );
};

const HealthBarsRow: React.FC<{
    health: number;
    enemy: EnemyType | null;
    playerTurn: boolean;
    playerUpdated: boolean;
    enemyUpdated: boolean;
    playerDamage: number | null;
    enemyDamage: number | null;
    actions: number;
    rest: boolean;
}> = ({ health, enemy, playerTurn, playerUpdated, enemyUpdated, playerDamage, enemyDamage, actions, rest }) => {
    const enemyData = useData(state => enemy != null ? state.gameData.enemies[enemy.id] : null);
    const playerStats = useStats((state) => state.calculateStats)("Combat") as CombatStats;
    const calculateHitChance = useCombat((state) => state.calculateHitChance);
    const calculateAverageDamage = useCombat((state) => state.calculateAverageDamage);
    const poison = useCombat((state) => state.isPoisoned);
    const regen = useCombat((state) => state.isRegenerating);

    const escape = useCombat((state) => state.escape);
    const escapeSteps = useCombat((state) => state.escapeSteps);
    const restSteps = useCombat((state) => state.restSteps);
    const maxSteps = escape ? escapeSteps : restSteps;

    const enemyBar = enemy && enemyData ? (enemy.health / enemyData.health) * 100 : (actions / maxSteps) * 100;
    const playerBar = (health / playerStats.health) * 100;
    const enemyDamageBar = (enemyData && enemyDamage !== null) ? ((enemyDamage / enemyData.health) * 100) : 0;
    const playerDamageBar = playerDamage !== null ? ((playerDamage / playerStats.health) * 100) : 0;

    const enemyText = enemy && enemyData ? `${enemy.health} / ${enemyData.health}` : `${actions} / ${maxSteps}`;
    const playerText = `${health} / ${playerStats.health}`;

    const playerEffectiveDamage = calculateAverageDamage(true) * calculateHitChance(true);
    const enemyEffectiveDamage = calculateAverageDamage(false) * calculateHitChance(false);

    const playerAdvantage = playerEffectiveDamage / enemyEffectiveDamage;
    const enemyAdvantage = enemyEffectiveDamage / playerEffectiveDamage;

    const playerTooltip = rest ? (
        <>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Text text={"Missing health: "} type="normal" colour="white" />
                <Text text={String(playerStats.health - health)} type="bold" colour="white" />
            </div>
        </>
    ) : enemy && (
        <>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Text text={"Avg Hit Damage: "} type="normal" colour="white" />
                <Text text={calculateAverageDamage(true).toFixed(1)} type="bold" colour="white" />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Text text={"Hit Chance: "} type="normal" colour="white" />
                <Text text={`${Math.round(calculateHitChance(true) * 100)}%`} type="bold" colour="white" />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Text text={"Effective Damage: "} type="normal" colour="white" />
                <Text text={(playerEffectiveDamage).toFixed(2)} type="bold" colour="white" />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Text text={"Advantage: "} type="normal" colour="white" />
                <Text text={`x${(playerAdvantage).toFixed(2)}`} type="bold" colour={playerAdvantage >= 1 ? "green2" : "red"} />
            </div>
        </>
    );
    const enemyTooltip = enemy && (
        <>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Text text={"Avg Hit Damage: "} type="normal" colour="white" />
                <Text text={calculateAverageDamage(false).toFixed(1)} type="bold" colour="white" />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Text text={"Hit Chance: "} type="normal" colour="white" />
                <Text text={`${Math.round(calculateHitChance(false) * 100)}%`} type="bold" colour="white" />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Text text={"Effective Damage: "} type="normal" colour="white" />
                <Text text={(enemyEffectiveDamage).toFixed(2)} type="bold" colour="white" />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Text text={"Advantage: "} type="normal" colour="white" />
                <Text text={`x${(enemyAdvantage).toFixed(2)}`} type="bold" colour={enemyAdvantage >= 1 ? "green2" : "red"} />
            </div>
        </>
    );

    const playerHealthImage = `health${playerDamage === 0 ? "block" : (poison("player") ? "poison" : (regen("player") ? "regen" : ""))}`;
    const enemyHealthImage = enemy ? `health${enemyDamage === 0 ? "block" : (poison("enemy") ? "poison" : (regen("enemy") ? "regen" : ""))}` : "actions";

    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "45% 5% 5% 45%",
                alignItems: "center",
                marginBottom: 2
            }}
        >
            {/* Player Health */}
            <div style={{ boxShadow: playerTurn && enemy ? "0 0 0 1px #ffffff, 0 0 0 2px #000000" : "none" }}>
                <ProgressBar
                    value={playerBar}
                    text={playerText}
                    image={playerHealthImage}
                    tooltipContent={playerTooltip}
                    updated={playerUpdated}
                    updatedValue={playerDamageBar}
                    updatedImage="healthdamage"
                    fullBorder
                />
            </div>

            {/* Damage Values */}
            <div style={{ height: 10, marginTop: -4, marginLeft: 3 }}>
                {playerDamage !== null && (
                    playerDamage !== 0 ? (
                        <Text text={String(-playerDamage)} type="normal" colour="black" />
                    ) : (
                        <img
                            src={`${IMAGE}combat/block.png`}
                            style={{ width: 14, height: 14, marginBottom: 1, pointerEvents: "none" }}
                        />
                    )
                )}

            </div>
            <div style={{ height: 10, marginTop: -4, justifySelf: "end", marginRight: 2 }}>
                {enemyDamage !== null && (
                    enemyDamage !== 0 ? (
                        <Text text={String(-enemyDamage)} type="normal" colour="black" />
                    ) : (
                        <img
                            src={`${IMAGE}combat/block.png`}
                            style={{ width: 14, height: 14, marginBottom: 1, pointerEvents: "none" }}
                        />
                    )
                )}
            </div>

            {/* EnemyType Health */}
            <div style={{ boxShadow: !playerTurn && enemy ? "0 0 0 1px #ffffff, 0 0 0 2px #000000" : "none" }}>
                <ProgressBar
                    value={enemyBar}
                    text={enemyText}
                    image={enemyHealthImage}
                    tooltipContent={enemyTooltip}
                    updated={enemyUpdated}
                    updatedValue={enemyDamageBar}
                    updatedImage="healthdamage"
                    fullBorder
                />
            </div>
        </div >
    );
};

export const AdvantageBar: React.FC<{
    enemy: boolean;
}> = ({ enemy }) => {
    const BAR_WIDTH = 128;
    const BAR_HEIGHT = 10;

    const calculateHitChance = useCombat((state) => state.calculateHitChance);
    const calculateAverageDamage = useCombat((state) => state.calculateAverageDamage);
    const playerEffectiveDamage = calculateAverageDamage(true) * calculateHitChance(true);
    const enemyEffectiveDamage = calculateAverageDamage(false) * calculateHitChance(false);
    const playerAdvantage = playerEffectiveDamage / enemyEffectiveDamage;
    const enemyAdvantage = enemyEffectiveDamage / playerEffectiveDamage;
    const advantageBarValue = (playerAdvantage / (playerAdvantage + 1)) * 100;

    const advantageTooltip = enemy && (
        <>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Text text={"Player advantage: "} type="normal" colour="white" />
                <Text text={`x${playerAdvantage.toFixed(2)}`} type="bold" colour={playerAdvantage >= 1 ? "green2" : "red"} />
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
                <Text text={"Enemy advantage: "} type="normal" colour="white" />
                <Text text={`x${enemyAdvantage.toFixed(2)}`} type="bold" colour={enemyAdvantage >= 1 ? "green2" : "red"} />
            </div>
        </>
    );

    const clampedValue = Math.max(0, Math.min(advantageBarValue, 100));
    const croppedWidth = (clampedValue / 100) * BAR_WIDTH;

    return (
        <Tooltip content={advantageTooltip}>
            <div
                style={{
                    position: "relative",
                    width: `${BAR_WIDTH}px`,
                    height: `${BAR_HEIGHT}px`,
                    backgroundImage: `url(${IMAGE}combat/advantageenemy.png)`,
                    border: "1px solid #000",
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: `${croppedWidth}px`,
                        height: `${BAR_HEIGHT}px`,
                        overflow: "hidden",
                    }}
                >
                    <img
                        src={enemy ? `${IMAGE}combat/advantageplayer.png` : `${IMAGE}combat/advantageempty.png`}
                        alt=""
                        style={{
                            display: "block",
                            width: `${BAR_WIDTH}px`,
                            height: `${BAR_HEIGHT}px`,
                            maxWidth: "none",
                            pointerEvents: "none",
                            userSelect: "none",
                        }}
                    />
                </div>
            </div>
            {/* Progress Text */}
            {enemy && (
                <div
                    style={{
                        position: "absolute",
                        top: "1px",
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center"
                    }}
                >
                    <Text text={`x${playerAdvantage.toFixed(2)}`} type="shadow" colour="white" />
                </div>
            )}
        </Tooltip>
    );
};

const StatRow: React.FC<{
    icon: string;
    tooltip: JSX.Element;
    playerValue: number;
    enemyValue: number | null;
}> = ({ icon, tooltip, playerValue, enemyValue }) => {
    return (
        <div
            style={{
                display: "grid",
                gridTemplateColumns: "45% 10% 45%",
                height: 20,
                alignItems: "center",
            }}
        >
            <div style={{ justifySelf: "end" }}>
                <Text
                    text={
                        (() => {
                            const rounded = Math.round(playerValue * 10) / 10;
                            return Number.isInteger(rounded)
                                ? rounded.toLocaleString()
                                : rounded.toLocaleString(undefined, { minimumFractionDigits: 1 });
                        })()
                    }
                    type="normal"
                />
            </div>
            <div style={{ display: "flex", justifyContent: "center" }}>
                <Tooltip content={tooltip}>
                    <img
                        src={icon}
                        style={{ width: 18, height: 18, objectFit: "contain", pointerEvents: "none" }}
                    />
                </Tooltip>
            </div>
            <div>
                <Text text={`${enemyValue !== null ? enemyValue : ""}`} type="normal" />
            </div>
        </div>
    );
}

const CombatScreenComponent: React.FC<{
    skill: string;
    task: number;
}> = ({ skill, task }) => {
    const calculateStats = useStats(state => state.calculateStats);
    const equipment = usePlayer(state => state.player.inventory.equipment);
    const xp = usePlayer((state) => state.player.xp[skill]);
    const lvlProperties = useStats((state) => state.calculateLvlProperties)(xp);
    const highlightedIndex = useItems((state) => state.highlightedIndex);
    const highlightedSlot = useItems((state) => state.getHighlightedSlot)(highlightedIndex);
    const effects = useCombat((state) => state.effects);

    const playerStats = useMemo(
        () => calculateStats("Combat"),
        [calculateStats, equipment, lvlProperties.lvl, effects]
    ) as CombatStats;

    const health = useCombat((state) => state.health);
    const enemy = useCombat((state) => state.enemy);
    const isRest = useCombat((state) => state.isRest);
    const step = useCombat((state) => state.step);
    const foodUsed = useCombat((state) => state.foodUsed);
    const potionUsed = useCombat((state) => state.potionUsed);
    const escape = useCombat((state) => state.escape);
    const actions = useCombat((state) => state.actions);
    const playerTurn = useCombat((state) => state.playerTurn);
    const playerUpdated = useCombat((state) => state.playerUpdated);
    const enemyUpdated = useCombat((state) => state.enemyUpdated);
    const zoneBarUpdated = useCombat((state) => state.zoneBarUpdated);
    const playerDamage = useCombat((state) => state.playerDamage);
    const enemyDamage = useCombat((state) => state.enemyDamage);
    const calculateDepth = useCombat((state) => state.calculateDepth);
    const record = useCombat((state) => state.record);

    const depth = calculateDepth(step);

    const taskAction = isRest(step) ? "Rest" : (escape ? "Escape" : (playerTurn ? "Attack" : "Block"));

    const strengthTooltip = (
        <>
            <Text text="Strength" type="normal" colour="white" />
            <Text text="Maximum damage dealt on hits" type="small" colour="white" />
        </>
    );
    const accuracyTooltip = (
        <>
            <Text text="Accuracy" type="normal" colour="white" />
            <Text text="Increases chance to hit against enemy Defence" type="small" colour="white" />
        </>
    );
    const defenceTooltip = (
        <>
            <Text text="Defence" type="normal" colour="white" />
            <Text text="Increases chance to block against enemy Accuracy" type="small" colour="white" />
        </>
    );

    const potion1Tooltip = lvlProperties.lvl < 20 && (<Text text="Unlocked at lvl 20" type="small" colour="white" />)
    const potion2Tooltip = lvlProperties.lvl < 40 && (<Text text="Unlocked at lvl 40" type="small" colour="white" />)

    return (
        <div>
            <SkillBanner skill={skill} />

            <div style={{ margin: "16px", marginTop: "14px" }}>
                {/* Task Info */}
                <CombatItem zone={task} active={true} showEnemies={!isRest(step)} depth={depth} />

                {/* Actions Progress Bar */}
                <ZoneBar step={step} updated={zoneBarUpdated} record={record} />
            </div>

            <div style={{ position: "relative", margin: "16px" }}>
                <LabelsRow enemy={enemy} rest={isRest(step)} escape={escape} />
                <HealthBarsRow
                    health={health}
                    enemy={enemy}
                    playerTurn={playerTurn}
                    playerUpdated={playerUpdated}
                    enemyUpdated={enemyUpdated}
                    playerDamage={playerDamage}
                    enemyDamage={enemyDamage}
                    actions={actions}
                    rest={isRest(step)}
                />
                <div style={{ marginTop: "6px" }}>
                    <StatRow icon={`${IMAGE}combat/iconstrength.png`} tooltip={strengthTooltip} playerValue={playerStats.strength} enemyValue={enemy && enemy.strength} />
                    <StatRow icon={`${IMAGE}combat/iconaccuracy.png`} tooltip={accuracyTooltip} playerValue={playerStats.accuracy} enemyValue={enemy && enemy.accuracy} />
                    <StatRow icon={`${IMAGE}combat/icondefence.png`} tooltip={defenceTooltip} playerValue={playerStats.defence} enemyValue={enemy && enemy.defence} />
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "center",
                            width: "100%",
                        }}
                    >
                        <div style={{ width: "128px", marginTop: 4 }}>
                            <AdvantageBar enemy={enemy != null} />
                        </div>
                    </div>
                    {isRest(step) && (
                        <>
                            <EquipmentSlot
                                x={270}
                                y={67}
                                item={null}
                                slot={"food"}
                                isSelected={false}
                                highlighted={highlightedSlot == "food"}
                                active={!foodUsed}
                            />
                            <EquipmentSlot
                                x={317}
                                y={67}
                                item={null}
                                slot={"potion"}
                                isSelected={false}
                                highlighted={highlightedSlot == "potion"}
                                active={!potionUsed[0]}
                            />
                            <EquipmentSlot
                                x={364}
                                y={67}
                                item={null}
                                slot={"potion"}
                                isSelected={false}
                                highlighted={highlightedSlot == "potion"}
                                active={!potionUsed[1]}
                                tooltip={potion1Tooltip}
                            />
                            <EquipmentSlot
                                x={411}
                                y={67}
                                item={null}
                                slot={"potion"}
                                isSelected={false}
                                highlighted={highlightedSlot == "potion"}
                                active={!potionUsed[2]}
                                tooltip={potion2Tooltip}
                            />
                        </>
                    )}
                    <div style={{ position: "absolute", top: 67, left: 0 }}>
                        <EffectsList effects={effects} />
                    </div>
                    {enemy && enemy.effects && (
                        <div style={{ position: "absolute", top: 60, right: 0 }}>
                            <EffectsList effects={enemy.effects} />
                        </div>
                    )}
                </div>
            </div>

            <div style={{
                marginTop: "-6px",
                marginLeft: "16px",
                marginRight: "16px",
                marginBottom: "16px",
                borderLeft: "1px solid black",
                borderRight: "1px solid black",
                borderTop: "1px solid black",
            }}>
                {/* Action Button Component */}
                <ActionButton taskAction={taskAction} />

                {/* Energy Progress Bar */}
                <EnergyBar />
            </div>
        </div>
    );
};

export const CombatScreen = React.memo(CombatScreenComponent);
