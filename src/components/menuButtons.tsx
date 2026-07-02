import React, { useState } from "react";
import { Window } from "./window";
import { IMAGE } from "../config";
import { usePlayer } from "../logic/usePlayer";

interface MenuButtonsProps {
    view: "skill" | "stats" | "info" | "settings";
    handleViewSelect: (selection: "skill" | "stats" | "info" | "settings") => void;
}

interface ButtonConfig {
    id: "stats" | "info" | "settings";
    icon: string;
    marginLeft?: number;
    marginRight?: number;
}

interface MenuButtonProps extends ButtonConfig {
    selected: boolean;
    handleViewSelect: (selection: "skill" | "stats" | "info" | "settings") => void;
}

const MenuButton: React.FC<MenuButtonProps> = ({
    id,
    icon,
    marginLeft = 0,
    marginRight = 0,
    selected,
    handleViewSelect,
}) => {
    const [hovered, setHovered] = useState<boolean>(false);

    const bgNormal = `url(${IMAGE}backgrounds/interface.png)`;
    const bgHighlighted = `url(${IMAGE}backgrounds/interfacehighlighted.png)`;
    const bgSelected = `url(${IMAGE}backgrounds/interfacedark.png)`;

    return (
        <Window
            content={
                <div
                    onClick={() => handleViewSelect(id)}
                    onMouseEnter={() => setHovered(true)}
                    onMouseLeave={() => setHovered(false)}
                    style={{
                        cursor: "pointer",
                        width: "36px",
                        height: "36px",
                        backgroundImage: selected ? bgSelected : (hovered ? bgHighlighted : bgNormal),
                        backgroundSize: "cover",
                    }}
                >
                    <img src={`${IMAGE}menu/${icon}`} alt={`${id} icon`} style={{ pointerEvents: "none" }} />
                </div>
            }
            mt={5}
            ml={marginLeft}
            mr={marginRight}
        />
    );
};

/**
 * Menu Buttons Component
 * - Displays buttons to navigate to Stats, Info, or Settings.
 */
const MenuButtonsComponent: React.FC<MenuButtonsProps> = ({ view, handleViewSelect }) => {

    const player = usePlayer((state) => state.player);
    const complete = player.records.items.every(item => item >= 1);

    // Button configuration
    const buttons: ButtonConfig[] = [
        { id: "stats", icon: complete ? "statscomplete.png" : "stats.png", marginRight: 5 },
        { id: "settings", icon: "settings.png", marginLeft: 5, marginRight: 5 },
        { id: "info", icon: "info.png", marginLeft: 5 },
    ];

    return (
        <div style={{ display: "flex" }}>
            {buttons.map((button) => (
                <MenuButton
                    key={button.id}
                    {...button}
                    selected={view === button.id}
                    handleViewSelect={handleViewSelect}
                />
            ))}
        </div>
    );
};

export const MenuButtons = React.memo(MenuButtonsComponent);
