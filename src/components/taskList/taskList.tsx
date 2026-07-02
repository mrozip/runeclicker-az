import React from "react";
import { SkillBanner } from "../skillBanner";
import { useData } from "../../logic/useData";
import { useTask } from "../../logic/useTask";
import { usePlayer } from "../../logic/usePlayer";
import { useStats } from "../../logic/useStats";
import { TaskItem } from "./taskItem";
import { CombatItem } from "./combatItem";
import { Text } from "../text";
import { IMAGE } from "../../config";
import { FarmingItem } from "./farmingItem";
import { Category } from "./category";

/**
 * Locked Task Component
 * - Displays an empty task if locked.
 */
const LockedTask: React.FC<{ lvl: number }> = ({ lvl }) => {

    return (
        <div style={{
            backgroundImage: `url(${IMAGE}backgrounds/interfacelocked.png)`,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            height: "48px",
            borderBottom: "1px solid #e0cfbf",
            paddingLeft: "2px"
        }}>
            {/* Title and Subtitle */}
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: "2px" }}>
                <Text text={"???"} type="normal" />
                <Text text={`lvl ${lvl}`} type="normal" />
            </div>
        </div>
    );
};

/**
 * No Tasks Component
 * - Displays a message if there are no available tasks.
 */
const NoTasks: React.FC = () => {
    return (
        <div style={{
            backgroundImage: `url(${IMAGE}backgrounds/interfacelocked.png)`,
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            height: "48px",
            borderBottom: "1px solid #e0cfbf",
            paddingLeft: "4px"
        }}>
            <Text text={"No tasks available."} type="normal" />
        </div>
    );
};

/**
 * Task List Component
 * - Displays every task item component for a given skill as a list.
 */
const TaskListComponent: React.FC<{ skill: string }> = ({ skill }) => {

    const gameData = useData((state) => state.gameData);
    const selectTask = useTask((state) => state.selectTask);
    const getTaskData = useTask((state) => state.getTaskData);
    const calculateMaxTasks = useTask((state) => state.calculateMaxTasks);
    const player = usePlayer((state) => state.player);
    const calculateLvl = useStats((state) => state.calculateLvl);
    const plotLvls = useData((state) => state.gameData.farming.plotLvls);
    const unlockedTasks = useStats((state) => state.unlockedTasks);

    const group = true;

    type TaskGroups = Record<string, number[]>;
    // Helper function to get the indexes for the task list
    const getTaskList = (): TaskGroups => {
        switch (skill) {
            case "Woodcutting":
            case "Mining":
            case "Stamina":
                return { "all": [...Array(gameData.tasks[skill]?.length || 0).keys()] };
            case "Processing":
                if (!group) {
                    return { "all": [...Array(gameData.recipes.length).keys()] };
                } else {
                    // Group recipe indices by category
                    const byCategory: Record<string, number[]> = {};

                    gameData.recipes.forEach((recipe, index) => {
                        const category = recipe.category || "uncategorised";
                        if (!byCategory[category]) {
                            byCategory[category] = [];
                        }
                        byCategory[category].push(index);
                    });

                    return byCategory;
                }
            case "Merchanting":
                // Return the indices of items in the inventory that are not null
                return {
                    "all": player.inventory.items
                        .map((item) => item !== null ? item.id : null)
                        .filter(index => index !== null && index !== 79) as number[]
                };
            case "Combat":
                return { "all": [...Array(gameData.zones.length).keys()] };
            default:
                return { "all": Array.from({ length: plotLvls.length }, (_, i) => i) };
        }
    };

    const renderTasks = () => {
        switch (skill) {
            case "Combat":
                return getTaskList().all.map((task) => {
                    const tasklvl = gameData.zones[task].lvl;
                    const locked = calculateLvl(player.xp[skill]) < tasklvl;

                    return locked ? (
                        <LockedTask key={task} lvl={tasklvl} />
                    ) : (
                        <CombatItem key={task} zone={task} />
                    );
                });
            case "Farming":
                return getTaskList().all.map((task) => {
                    const tasklvl = plotLvls[task];
                    const locked = calculateLvl(player.xp[skill]) < tasklvl;

                    return locked ? (
                        <LockedTask key={task} lvl={tasklvl} />
                    ) : (
                        <FarmingItem key={task} plot={task} />
                    );
                });
            case "Processing":
                if (!group) {
                    return getTaskList().all.map((task) => {
                        const tasklvl = getTaskData(skill, task).lvl;
                        const locked = calculateLvl(player.xp[skill]) < tasklvl;
                        const available = calculateMaxTasks(skill, task) > 0;

                        return locked ? (
                            <LockedTask key={task} lvl={tasklvl} />
                        ) : (
                            <div
                                key={task}
                                onClick={() => available && selectTask(task)}
                                style={{
                                    cursor: available ? "pointer" : "default",
                                    paddingLeft: "2px"
                                }}
                            >
                                <TaskItem skill={skill} task={task} available={available} />
                            </div>
                        );
                    })
                } else {
                    const entries = Object.entries(getTaskList());
                    return entries.map(([category, tasks], index) => {
                        const unlockedCount = tasks.filter(task => {
                            const tasklvl = getTaskData(skill, task).lvl;
                            return calculateLvl(player.xp[skill]) >= tasklvl;
                        }).length;
                        
                        const unlockedTask = unlockedTasks.some(unlock => unlock.skill === skill && tasks.includes(unlock.task));

                        return (
                            <div key={category} style={{ borderBottom: index === entries.length - 1 ? "" : "1px solid black" }}>
                                <Category
                                    unlockedTask={unlockedTask}
                                    icon={`tasks/Processing/${category}.png`}
                                    title={category}
                                    rightText={`${unlockedCount} / ${tasks.length}`}
                                    content={tasks.map((task) => {
                                        const tasklvl = getTaskData(skill, task).lvl;
                                        const locked = calculateLvl(player.xp[skill]) < tasklvl;
                                        const available = calculateMaxTasks(skill, task) > 0;

                                        return locked ? (
                                            <LockedTask key={task} lvl={tasklvl} />
                                        ) : (
                                            <div
                                                key={task}
                                                onClick={() => available && selectTask(task)}
                                                style={{
                                                    cursor: available ? "pointer" : "default",
                                                    paddingLeft: "2px"
                                                }}
                                            >
                                                <TaskItem skill={skill} task={task} available={available} />
                                            </div>
                                        );
                                    })}
                                />
                            </div>
                        )
                    });
                }

            default:
                return getTaskList().all.map((task) => {
                    const tasklvl = getTaskData(skill, task).lvl;
                    const locked = calculateLvl(player.xp[skill]) < tasklvl;
                    const available = calculateMaxTasks(skill, task) > 0;

                    return locked ? (
                        <LockedTask key={task} lvl={tasklvl} />
                    ) : (
                        <div
                            key={task}
                            onClick={() => available && selectTask(task)}
                            style={{
                                cursor: available ? "pointer" : "default",
                                paddingLeft: "2px"
                            }}
                        >
                            <TaskItem skill={skill} task={task} available={available} />
                        </div>
                    );
                })
        }
    }

    return (
        <div>
            <SkillBanner skill={skill} />

            <div style={{ maxHeight: "294px", overflowY: "scroll" }}>
                {skill !== "Processing" && getTaskList().all.length === 0 ? (
                    <NoTasks />
                ) : (
                    renderTasks()
                )}
            </div>
        </div>
    );
};

export const TaskList = React.memo(TaskListComponent);
