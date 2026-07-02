import React, { useState } from "react";
import { Text } from "../text";
import { useTask } from "../../logic/useTask";
import { useItems } from "../../logic/useItems";
import { useData } from "../../logic/useData";
import { usePlayer } from "../../logic/usePlayer";
import { useStats } from "../../logic/useStats";
import { TaskIcon } from "./taskIcon";
import { Item } from "../item";
import { IMAGE } from "../../config";
import { FractionItem } from "../fractionItem";

/**
 * Task Item Renderer Component
 * - Uses the data derived from the Task Item component to render the item in the task list.
 */
export const TaskItemRenderer: React.FC<{
    title: string;
    subtitle?: string;
    rightText?: string;
    mainIcon: React.ReactNode;
    rightIcons?: React.ReactNode;
    clickable: boolean;
    available: boolean;
}> = ({ title, subtitle, rightText, mainIcon, rightIcons, clickable, available }) => {

    const bgNormal = `url(${IMAGE}backgrounds/interface.png)`;
    const bgHighlighted = `url(${IMAGE}backgrounds/interfacehighlighted.png)`;
    const bgLocked = `url(${IMAGE}backgrounds/interfacelocked.png)`;

    const [hovered, setHovered] = useState<boolean>(false);

    return (
        <div
            onMouseEnter={() => (setHovered(true))}
            onMouseLeave={() => setHovered(false)}
            style={{
                backgroundImage: available ? (hovered && clickable ? bgHighlighted : bgNormal) : bgLocked,
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                height: "48px",
                borderBottom: "1px solid #e0cfbf",
            }}>

            {mainIcon}

            {/* Title and Subtitle */}
            <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: "2px" }}>
                <Text text={title} type="bold" maxWidth={167} colour={available ? "black" : "red"} />
                {subtitle && <Text text={subtitle} type="normal" />}
            </div>

            {/* Right Side Content */}
            <div style={{ display: "flex", alignItems: "center", marginRight: "2px" }}>
                {/* Item Placeholder */}
                {rightIcons}

                {/* Right Text */}
                <div style={{ minWidth: "65px", display: "flex", justifyContent: "flex-end" }}>
                    {rightText && <Text text={rightText} type="normal" />}
                </div>
            </div>
        </div>
    );
};

/**
 * Task Item Component
 * - Takes skill and task index and derives the data to use for rendering a task item.
 */
export const TaskItem: React.FC<{
    skill: string;
    task: number;
    clickable?: boolean;
    available?: boolean;
}> = ({ skill, task, clickable = true, available = true }) => {

    const getTaskData = useTask((state) => state.getTaskData);
    const inventoryItems = usePlayer((state) => state.player.inventory.items);
    const updatedItems = useItems((state) => state.updatedItems);
    const getItemProbability = useItems((state) => state.getItemProbability);
    const gameData = useData((state) => state.gameData);
    const calculateMaxTasks = useTask((state) => state.calculateMaxTasks);

    const taskData = getTaskData(skill, task);

    const unlockedTasks = useStats((state) => state.unlockedTasks);
    const unlockedTask = unlockedTasks.some(unlock => unlock.skill === skill && unlock.task === task);
    const removeUnlockedTask = useStats((state) => state.removeUnlockedTask);

    const title = taskData.name;
    let subtitle = `lvl ${taskData.lvl}`;
    const rightText = `${taskData.xp} xp`;

    let mainIcon: React.ReactNode;
    let rightIcons: React.ReactNode;

    // Derive data to render based on which skill is selected
    switch (skill) {
        case "Woodcutting":
        case "Mining":
            mainIcon = <TaskIcon unlockedTask={unlockedTask} icon={
                <img
                    src={`${IMAGE}${`tasks/${skill}/${task}.png`}`}
                    style={{
                        pointerEvents: "none",
                        objectFit: "contain",
                        display: "block",
                    }}
                />
            } />
            rightIcons = (
                <div style={{ display: "flex", gap: "8px" }}>
                    {taskData.output?.map((item, index) => (
                        <FractionItem
                            key={index}
                            item={
                                <Item
                                    index={item.id}
                                    quantity={item.quantity.min}
                                    updated={updatedItems.includes(item.id)}
                                />
                            }
                            value={getItemProbability(item)}
                        />
                    ))}
                </div>
            );
            break;

        case "Processing":
            if (!taskData.output?.[0]) {
                return null;
            }
            mainIcon = <TaskIcon unlockedTask={unlockedTask} icon={
                <Item index={taskData.output[0].id} quantity={calculateMaxTasks("Processing", task)} overrideShowTooltip={true} />
            } chance={taskData.output?.[0].probability} />
            rightIcons = (
                <div style={{ display: "flex", gap: "8px" }}>
                    {taskData.input?.map((item, index) => (
                        <div key={index} style={{ display: "flex", alignItems: "center" }}>
                            <Item
                                index={item.id}
                                quantity={inventoryItems.find(inventoryItem => inventoryItem?.id === item.id)?.quantity ?? 0}
                                cost={item.quantity}
                                updated={updatedItems.includes(item.id)}
                            />
                        </div>
                    ))}
                </div>
            );
            break;

        case "Merchanting":
            if (taskData.input && taskData.input[0]?.id === 79) {
                return null;
            }
            subtitle = `value: ${taskData.output && taskData.output[0].quantity.min.toLocaleString()} (base: ${taskData.input && gameData.items[taskData.input[0].id].value.toLocaleString()})`;
            mainIcon = <TaskIcon unlockedTask={unlockedTask} icon={
                <Item index={task} quantity={calculateMaxTasks("Merchanting", task)} />
            } chance={taskData.output?.[0].probability} />
            rightIcons = (
                <div style={{ display: "flex", gap: "8px" }}>
                    {taskData.output?.map((item, index) => (
                        <FractionItem
                            key={index}
                            item={
                                <Item
                                    index={item.id}
                                    quantity={item.quantity.min}
                                    updated={updatedItems.includes(item.id)}
                                />
                            }
                            value={item.probability}
                        />
                    ))}
                </div>
            );
            break;

        case "Stamina":
            mainIcon = <TaskIcon unlockedTask={unlockedTask} icon={
                <img
                    src={`${IMAGE}tasks/Stamina/${task}.png`}
                    style={{
                        pointerEvents: "none",
                        objectFit: "contain",
                        display: "block",
                    }}
                />
            } />
            rightIcons = (
                <div style={{ display: "flex", gap: "8px" }}>
                    {taskData.input?.map((item, index) => (
                        <div key={index} style={{ display: "flex", alignItems: "center" }}>
                            <Item
                                index={item.id}
                                quantity={inventoryItems.find(inventoryItem => inventoryItem?.id === item.id)?.quantity ?? 0}
                                cost={item.quantity}
                                updated={updatedItems.includes(item.id)}
                            />
                        </div>
                    ))}
                </div>
            );
            break;

        default:
            return null;
    }

    return (
        <div onMouseEnter={() => unlockedTask && removeUnlockedTask(skill, task)}>
            <TaskItemRenderer
                title={title}
                subtitle={subtitle}
                rightText={rightText}
                mainIcon={mainIcon}
                rightIcons={rightIcons}
                clickable={clickable}
                available={available}
            />
        </div>
    );
};
