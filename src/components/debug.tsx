import React, { useState } from "react";
import { Text } from "./text";
import { useData } from "../logic/useData";
import { useItems } from "../logic/useItems";
import { useSettings } from "../logic/useSettings";

export const Debug: React.FC = () => {
    const itemOptions = useData((s) => s.gameData.items);
    const [itemSelected, setItemSelected] = useState(0);
    const addItems = useItems((s) => s.addItems);
    const fast = useSettings((s) => s.fast);
    const setFast = useSettings((s) => s.setFast);

    return (
        <>
            <Text text="Debug:" type="bold" />
            <Text text="Add items:" type="normal" />
            <select value={itemSelected} onChange={(e) => setItemSelected(Number(e.target.value))}>
                {itemOptions
                    .map((item, index) => ({ item, index }))
                    .sort((a, b) => a.item.name.localeCompare(b.item.name))
                    .map(({ item, index }) => (
                        <option key={index} value={index}>
                            {item.name}
                        </option>
                    ))}
            </select>
            <button onClick={() => addItems([{ id: itemSelected, quantity: 1 }])}>Add item</button>
            <Text text="Fast:" type="normal" />
            <input
                type="checkbox"
                checked={fast}
                onChange={(e) => setFast(e.target.checked)}
            />
        </>
    );
};
