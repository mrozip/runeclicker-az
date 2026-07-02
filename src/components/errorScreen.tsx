// errorScreen.tsx
import React from "react";
import { Window } from "./window";
import { SAVE_KEY } from "../config";

interface ErrorScreenProps {
    error: unknown;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ error }) => {
    const message = error instanceof Error ? error.message : String(error);
    const saveData = localStorage.getItem(SAVE_KEY);

    const handleNewGame = () => {
        localStorage.removeItem(SAVE_KEY);
        location.reload();
    };

    return (
        <Window
            content={
                <>
                    <h1>Error</h1>
                    <p>{message}</p>
                    <p>Save File:</p>
                    <textarea
                        style={{
                            width: "100%",
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
                        value={String(saveData)}
                        readOnly
                    />
                    <button onClick={handleNewGame}>New Game</button>
                </>
            }
        />
    );
};

// export JSX (not render)
export function renderError(error: unknown): JSX.Element {
    return <ErrorScreen error={error} />;
}
