import React from "react";
import { ProgressBar } from "../progressBar";
import { Text } from "../text";
import { useTask } from "../../logic/useTask";
import { usePlayer } from "../../logic/usePlayer";
import { useFarming } from "../../logic/useFarming";

export const ActionBar: React.FC = () => {
    const skill = usePlayer((state) => state.player.skill);
    const task = usePlayer((state) => state.player.task);

    const getTaskData = useTask((state) => state.getTaskData);
    const taskData = getTaskData(skill, task!);

    const actions = useTask((state) => state.actions);
    const updatedActionsBar = useTask((state) => state.updatedActionsBar);

    const depleteChance = useFarming((state) => state.depleteChance)();

    // Tooltip for actions progress bar
    const actionsTooltipContent = skill !== "Farming" ? (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text text="Actions: " type="normal" colour="white" />
                <Text text={String(taskData.actions)} type="bold" colour="white" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text text="Xp reward: " type="normal" colour="white" />
                <Text text={String(taskData.xp)} type="bold" colour="white" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text text="Xp / action: " type="normal" colour="white" />
                <Text text={String((taskData.xp / taskData.actions).toFixed(2))} type="bold" colour="white" />
            </div>
        </div>
    ) : (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text text="Chance to deplete: " type="normal" colour="white" />
                <Text text={`${String((depleteChance * 100).toFixed(1))}%`} type="bold" colour="white" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text text="Average harvests: " type="normal" colour="white" />
                <Text text={`${Math.round((1 / depleteChance) * 10) / 10}`} type="bold" colour="white" />
            </div>
        </div>
    );

    return (
        <div style={{
            borderLeft: "1px solid black",
            borderRight: "1px solid black",
        }}>
            <ProgressBar
                value={(actions / taskData.actions) * 100}
                text={`${actions} / ${taskData.actions}`}
                image="actions"
                tooltipContent={actionsTooltipContent}
                updated={updatedActionsBar}
            />
        </div>
    );
};
