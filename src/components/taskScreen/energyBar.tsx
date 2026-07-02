import React from "react";
import { ProgressBar } from "../progressBar";
import { Text } from "../text";
import { formatSeconds } from "../../logic/utils";
import { useTask } from "../../logic/useTask";
import { useStats } from "../../logic/useStats";
import { useData } from "../../logic/useData";
import { usePlayer } from "../../logic/usePlayer";

export const EnergyBar: React.FC = () => {
    const xp = usePlayer((state) => state.player.xp);
    const skill = usePlayer((state) => state.player.skill);
    const energy = useTask((state) => state.energy);

    const calculateLvl = useStats((state) => state.calculateLvl);
    const statData = useData((state) => state.statData);
    const maxEnergy = statData.stamina[calculateLvl(xp["Stamina"])];

    const calculateStats = useStats((state) => state.calculateStats);
    const speed = calculateStats(skill).speed;

    const updatedEnergyBar = useTask((state) => state.updatedEnergyBar);

    // Tooltip for energy progress bar
    const energyTooltipContent = (
        <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text text="Max energy: " type="normal" colour="white" />
                <Text text={formatSeconds(maxEnergy)} type="bold" colour="white" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text text="Speed: " type="normal" colour="white" />
                <Text text={String(speed.toFixed(2))} type="bold" colour="white" />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <Text text="Auto actions: " type="normal" colour="white" />
                <Text text={String(Math.floor(maxEnergy * speed))} type="bold" colour="white" />
            </div>
        </div>
    );

    return (
        <ProgressBar
            value={(energy / maxEnergy) * 100}
            text={`${formatSeconds(energy)} / ${formatSeconds(maxEnergy)}`}
            image="energy"
            tooltipContent={energyTooltipContent}
            updated={updatedEnergyBar}
        />
    );
};
