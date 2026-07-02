import React, { useLayoutEffect, useRef, useCallback } from "react";
import { Window } from "./window";
import { Text } from "./text";
import { useConsole } from "../logic/useConsole";

/**
 * Console Component
 * - Displays game messages as a list, grouping duplicates.
 */
const ConsoleComponent: React.FC = () => {
    const messages = useConsole((s) => s.messages);
    const consoleRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    // A ref that we only update when the user scrolls
    const isUserAtBottom = useRef(true);

    // On any user scroll, recompute whether they're at the bottom
    const handleScroll = useCallback(() => {
        const el = consoleRef.current;
        if (!el) return;
        // use a small threshold (e.g. 5px) to guard against rounding
        isUserAtBottom.current =
            el.scrollHeight - (el.scrollTop + el.clientHeight) < 5;
    }, []);

    // Whenever messages change, if they WERE at bottom, snap to bottom
    useLayoutEffect(() => {
        if (!isUserAtBottom.current) return;
        bottomRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    }, [messages]);

    return (
        <Window
            content={
                <div
                    ref={consoleRef}
                    onScroll={handleScroll}
                    style={{ height: "140px", overflowY: "scroll", overflowX: "clip", padding: "2px" }}
                >
                    {messages.map((message, index) => (
                        <div key={index} style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "4px" }}>
                            {/* Time */}
                            <div style={{ flexShrink: 0, marginTop: "2px" }}>
                                <Text text={`[${message.time}] `} type="small" />
                            </div>
                            {/* Message */}
                            <div style={{ flexGrow: 1 }}>
                                <Text text={message.content} maxWidth={400} type="normal" />
                            </div>
                            {/* Quantity */}
                            {message.quantity > 1 && (
                                <div style={{ flexShrink: 0, textAlign: "right", marginTop: "2px" }}>
                                    <Text text={`[x${message.quantity}]`} type="small" />
                                </div>
                            )}
                        </div>
                    ))}
                    <div ref={bottomRef} />
                </div>
            }
            mt={5}
        />
    );
};

export const Console = React.memo(ConsoleComponent);
