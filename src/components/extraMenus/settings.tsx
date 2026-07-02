import React, { useState } from "react";
import { Text } from "../text";
import { Player } from "../../types/gameTypes";
import { usePlayer } from "../../logic/usePlayer";
import { useSettings } from "../../logic/useSettings";
import { useConsole } from "../../logic/useConsole";
import { useData } from "../../logic/useData";
import { createInitialSave, saveGame } from "../../logic/saveManager";
import { DEBUG } from "../../config";
import LZString from "lz-string";
import { SAVE_KEY } from "../../config";
import { Debug } from "../debug";


/**
 * Settings Component
 * - Save file adjustment.
 */
const SettingsComponent: React.FC = () => {
    const setPlayer = usePlayer((state) => state.setPlayer);
    const settings = useSettings((state) => state.settings);
    const setSettings = useSettings((state) => state.setSettings);

    const addMessage = useConsole((state) => state.addMessage);
    const gameData = useData((state) => state.gameData);

    const [saveData, setSaveData] = useState<string>(localStorage.getItem(SAVE_KEY) ?? "");

    // Handle text input changes
    const handleSaveDataChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setSaveData(event.target.value);
    };

    // Apply save file from text area
    const handleApplySave = () => {
        try {
            const parsedSave: Player = JSON.parse(!DEBUG ? LZString.decompressFromBase64(saveData) : saveData);
            saveGame(parsedSave); // Save to localStorage
            setPlayer(parsedSave); // Update the player state
            addMessage("Save file loaded.");
        } catch {
            addMessage("Invalid save file.");
        }
    };

    // Set save file to new game
    const handleNewGame = () => {
        const initialSave = JSON.stringify(createInitialSave(gameData));
        setSaveData(!DEBUG ? LZString.compressToBase64(initialSave) : initialSave);
    };

    return (
        <div style={{ maxHeight: "327px", padding: "8px" }}>
            {DEBUG && (<Debug />)}

            <Text text="Resolution:" type="normal" />

            {/* Radio buttons */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
                {[
                    { "name": "Scaled", "value": 0 },
                    { "name": "100%", "value": 1 },
                    { "name": "200%", "value": 2 },
                    { "name": "300%", "value": 3 },
                    { "name": "400%", "value": 4 },
                ].map((button) => (
                    <label key={button.value} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                            type="radio"
                            value={button.value}
                            checked={settings.resolution === button.value}
                            onChange={() => setSettings({ resolution: button.value })}
                        />
                        <Text text={button.name} type="bold" />
                    </label>
                ))}
            </div>

            <Text text="Rendering:" type="normal" />

            {/* Radio buttons */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "8px" }}>
                {[
                    { "name": "Sharp", "value": false },
                    { "name": "Smooth", "value": true },
                ].map((button) => (
                    <label key={String(button.value)} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <input
                            type="radio"
                            value={String(button.value)}
                            checked={settings.smooth === button.value}
                            onChange={() => setSettings({ smooth: button.value })}
                        />
                        <Text text={button.name} type="bold" />
                    </label>
                ))}
            </div>

            <Text text="Save file:" type="normal" />

            {/* Text box */}
            <textarea
                style={{
                    width: "100%",
                    height: "112px",
                    backgroundColor: "#ffffff",
                    color: "#000000",
                    fontSize: "11px",
                    lineHeight: 1.5,
                    fontFamily: "monospace",
                    padding: "4px",
                    border: "1px solid #000000",
                    resize: "none",
                    boxSizing: "border-box",
                    outline: "none",
                }}
                rows={6}
                value={saveData}
                onChange={handleSaveDataChange}
            />

            <div style={{ marginTop: "0px", display: "flex", justifyContent: "flex-end", gap: "4px" }}>
                {/* New game button */}
                <div
                    onClick={handleNewGame}
                    style={{
                        width: "80px",
                        display: "flex",
                        justifyContent: "center",
                        backgroundColor: "#FFA093",
                        border: "1px solid black",
                        padding: "4px 16px",
                        cursor: "pointer",
                    }}
                >
                    <Text text="New Game" type="bold" />
                </div>

                {/* Apply save button */}
                <div
                    onClick={handleApplySave}
                    style={{
                        width: "80px",
                        display: "flex",
                        justifyContent: "center",
                        backgroundColor: "#FFFFFF",
                        border: "1px solid black",
                        padding: "4px 16px",
                        cursor: "pointer",
                    }}
                >
                    <Text text="Apply" type="bold" />
                </div>
            </div>
        </div>
    );
};

export const Settings = React.memo(SettingsComponent);
