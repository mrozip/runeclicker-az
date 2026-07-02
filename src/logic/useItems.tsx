import { create } from 'zustand';
import { usePlayer } from './usePlayer';
import { useConsole } from './useConsole';
import { FixedItem, MerchantingStats, VariableItem } from '../types/gameTypes';
import { useData } from './useData';
import { useCombat } from './useCombat';
import { useStats } from './useStats';
import { useFarming } from './useFarming';

interface ItemsStore {
    sourceIndex: number | string | null;
    updatedItems: number[];
    isDragging: boolean;
    highlightedIndex: number | string | null;
    getHighlightedSlot: (index: number | string | null) => string | null;
    placeItem: (targetIndex: number | string) => void;
    calculateValue: (id: number) => number;
    getItemProbability: (item: VariableItem) => number;
    checkSufficientItems: (items: FixedItem[]) => number;
    removeItems: (items: FixedItem[]) => void;
    rollItems: (items: VariableItem[]) => FixedItem[];
    addItems: (items: FixedItem[], update?: boolean) => void;
    moveItems: (source: number | string, target: number | string) => void;
}

export const useItems = create<ItemsStore>((set, get) => {
    return {
        sourceIndex: null,
        updatedItems: [],
        isDragging: false,
        highlightedIndex: null,

        /**
         * Determine which equipment slot should be highlighted based on item currently highlighted
         */
        getHighlightedSlot: (index: number | string | null): string | null => {
            const playerItems = usePlayer.getState().player.inventory.items;
            const gameItems = useData.getState().gameData.items;
            if (typeof index == "number" && playerItems[index]) {
                return gameItems[playerItems[index].id]?.slot ?? null;
            }
            return null;
        },

        /**
         * Orchestrate movement of items based on source and target items
         */
        placeItem: (targetIndex: number | string): void => {
            const sourceIndex = get().sourceIndex;
            if (sourceIndex == null) return;

            if (sourceIndex == "seed") {
                useFarming.getState().removeSeed();
            } else if (sourceIndex == "fertiliser") {
                useFarming.getState().removeFertiliser();
            }

            const playerItems = usePlayer.getState().player.inventory.items;
            const playerEquipment = usePlayer.getState().player.inventory.equipment;
            const gameItems = useData.getState().gameData.items;
            const isDragging = get().isDragging;

            // find the grabbed item data, from inventory or equipment
            const grabbedItem: FixedItem | null =
                typeof sourceIndex === "number"
                    ? playerItems[sourceIndex]
                    : playerEquipment[sourceIndex];

            // no grabbed item- do nothing
            if (!grabbedItem) {
                set({ isDragging: false, sourceIndex: null });
                return;
            }

            const isFood = gameItems[grabbedItem.id].slot == "food";
            const isPotion = gameItems[grabbedItem.id].slot == "potion";
            const isSeed = gameItems[grabbedItem.id].slot == "seed";
            const isFertiliser = gameItems[grabbedItem.id].slot == "fertiliser";

            // If click, automatically move item to the slot it belongs to, if valid
            if (!isDragging) {
                if (isFood) {
                    useCombat.getState().useFood(grabbedItem);
                } else if (isPotion) {
                    useCombat.getState().usePotion(grabbedItem);
                } else if (isSeed) {
                    useFarming.getState().useSeed(grabbedItem);
                } else if (isFertiliser) {
                    useFarming.getState().useFertiliser(grabbedItem);
                } else {
                    // If it came from inventory, send it to its designated slot
                    if (typeof sourceIndex === "number") {
                        const designatedSlot = gameItems[grabbedItem.id].slot;
                        if (designatedSlot) {
                            get().moveItems(sourceIndex, designatedSlot);
                        }
                    }
                    // If it came from equipment, drop it back into the first empty inventory slot
                    else {
                        const emptyIndex = playerItems.findIndex((inv) => inv == null);
                        if (emptyIndex !== -1) {
                            get().moveItems(sourceIndex, emptyIndex);
                        }
                    }
                }
            }
            // If dragging, place item into slot mouse released at 
            else {
                if (isFood && targetIndex === "food") {
                    useCombat.getState().useFood(grabbedItem);
                } else if (isPotion && targetIndex === "potion") {
                    useCombat.getState().usePotion(grabbedItem);
                } else if (isSeed && targetIndex === "seed") {
                    useFarming.getState().useSeed(grabbedItem);
                } else if (isFertiliser && targetIndex === "fertiliser") {
                    useFarming.getState().useFertiliser(grabbedItem);
                } else {
                    get().moveItems(sourceIndex, targetIndex);
                }
            }

            set({ isDragging: false, sourceIndex: null });
            useCombat.getState().applyEquipmentEffects();
        },

        /**
         * Calculate value of item based on base value and Merchanting lvl
         */
        calculateValue: (id: number): number => {
            const { calculateStats } = useStats.getState();
            const gameItems = useData.getState().gameData.items;
            const stats = calculateStats("Merchanting") as MerchantingStats;
            return Math.floor(gameItems[id].value * stats.multiplier);
        },

        /**
         * Helper function to calculate item probability
         */
        getItemProbability: (item: VariableItem): number => {
            const player = usePlayer.getState().player;
            let probability = item.probability;
            const { neck } = player.inventory.equipment;

            if (neck && ((neck.id === 77 && [5, 6, 7].includes(item.id)) || (neck.id === 78 && [8, 9, 10].includes(item.id)))) {
                probability = Math.round(probability / 1.5);
            }
            return probability;
        },

        /**
         * Checks how many of a recipe's output can be crafted based on available inventory.
         */
        checkSufficientItems: (items: FixedItem[]): number => {
            const player = usePlayer.getState().player;
            const itemsPerIngredient = items.map((ingredient) => {
                const inventoryItem = player.inventory.items.find((invItem) => invItem?.id === ingredient.id);
                const availableQuantity = inventoryItem?.quantity ?? 0;
                return Math.floor(availableQuantity / ingredient.quantity);
            });

            return Math.min(...itemsPerIngredient);
        },

        /**
         * Removes specified items from the player's inventory.
         */
        removeItems: (items: FixedItem[]): void => {
            usePlayer.setState((state) => {
                const updatedItems = state.player.inventory.items.map((item) => {
                    if (!item) return null;

                    const itemToRemove = items.find(({ id }) => id === item.id);
                    if (!itemToRemove) return item;

                    const newQuantity = item.quantity - itemToRemove.quantity;
                    return newQuantity > 0 ? { ...item, quantity: newQuantity } : null;
                });

                return {
                    player: {
                        ...state.player,
                        inventory: { ...state.player.inventory, items: updatedItems },
                    }
                };
            });
        },

        /**
         * Rolls items based on their probability and quantity range.
         */
        rollItems: (items: VariableItem[]): FixedItem[] => {
            return items.reduce<FixedItem[]>((result, item) => {
                const rollProbability = get().getItemProbability(item);

                if (Math.random() < 1 / rollProbability) {
                    const rolledQuantity = Math.floor(
                        Math.random() * (item.quantity.max - item.quantity.min + 1)
                    ) + item.quantity.min;
                    result.push({ id: item.id, quantity: rolledQuantity });
                }
                return result;
            }, []);
        },

        /**
         * Adds items to existing or new inventory slots.
         */
        addItems: (items: FixedItem[], update: boolean = true) => {
            usePlayer.setState((state) => {
                let inventoryChanged = false;  // Track if we actually modify inventory
                const newInventory = state.player.inventory.items.map((item) => {
                    if (!item) return null;  // Keep null slots unchanged

                    const foundItem = items.find((newItem) => newItem.id === item.id);
                    if (foundItem) {
                        inventoryChanged = true;
                        return { ...item, quantity: item.quantity + foundItem.quantity }; // Only copy if modified
                    }
                    return item; // Keep reference if unchanged
                });

                // If new items need to be added, modify only where needed
                items.forEach((item) => {
                    if (!newInventory.some((invItem) => invItem?.id === item.id)) {
                        const emptyIndex = newInventory.findIndex((invItem) => invItem == null);
                        if (emptyIndex !== -1) {
                            newInventory[emptyIndex] = { id: item.id, quantity: item.quantity };
                            inventoryChanged = true;
                        } else {
                            useConsole.getState().addMessage("You have lost some items as your inventory is full.");
                        }
                    }
                });

                // Ensure records are updated properly while keeping references stable
                const oldRecords = state.player.records.items;
                const newRecords = oldRecords.map((record, index) => {
                    const foundItem = items.find((newItem) => newItem.id === index);
                    return foundItem && update ? record + foundItem.quantity : record;
                });

                // Check for unlocks (record going from 0 to >0)
                newRecords.forEach((newAmount, index) => {
                    if (oldRecords[index] === 0 && newAmount > 0) {
                        const name = useData.getState().gameData.items[index].name;
                        useConsole.getState().addMessage(`You have unlocked a new item: ${name}.`);
                    }
                });

                // Prevent unnecessary re-renders if nothing actually changed
                if (!inventoryChanged) return state;

                if (update) {
                    set({ updatedItems: items.map((item) => item.id) });
                    setTimeout(() => set({ updatedItems: [] }), 150);
                }

                return {
                    player: {
                        ...state.player,
                        inventory: {
                            ...state.player.inventory,
                            items: newInventory,
                        },
                        records: {
                            ...state.player.records,
                            items: newRecords,
                        },
                    }
                };
            });
        },

        /**
         * Moves items from inventory to inventory, inventory to equipment, and equipment to inventory.
         */
        moveItems: (source: number | string, target: number | string) => {
            const { gameData } = useData.getState();

            usePlayer.setState((state) => {
                const newItems = [...state.player.inventory.items]; // Copy the inventory array
                const newEquipment = { ...state.player.inventory.equipment }; // Copy the equipment object

                const isSourceInventory = typeof source === "number";
                const isTargetInventory = typeof target === "number";

                // Inventory > Inventory
                if (isSourceInventory && isTargetInventory) {
                    if (newItems[source] !== null) {
                        [newItems[source], newItems[target]] = [newItems[target], newItems[source]];
                    }
                }

                // Inventory > Equipment
                else if (isSourceInventory && !isTargetInventory) {
                    const sourceItem = newItems[source]; // The item to equip

                    if (sourceItem !== null && gameData.items[sourceItem.id].slot == target) {
                        const targetItem = newEquipment[target]; // The item being replaced

                        // If moving backpack, change inventory slots
                        if (gameData.items[sourceItem.id].slot == "back") {
                            const oldSpace = targetItem ? gameData.items[targetItem.id].space ?? 0 : 0;
                            const newSpace = gameData.items[sourceItem.id].space!;
                            const space = newSpace - oldSpace;

                            // Do not allow move if any inventory slots which will be removed have items
                            if (space < 0 && newItems.slice(space).some(item => item != null)) {
                                useConsole.getState().addMessage("You do not have the inventory space to do that.");
                                return { player: { ...state.player } };
                            }

                            if (space > 0) {
                                newItems.push(...Array(space).fill(null));
                            } else {
                                newItems.splice(space, -space);
                            }
                        }

                        // Place new item in equipment
                        newEquipment[target] = { id: sourceItem.id, quantity: 1 };

                        // Remove or decrease quantity in inventory
                        if (sourceItem.quantity > 1) {
                            newItems[source] = { ...sourceItem, quantity: sourceItem.quantity - 1 };
                        } else {
                            newItems[source] = null;
                        }

                        // Place the replaced equipment item back into inventory
                        if (targetItem !== null) {
                            const foundItemIndex = newItems.findIndex((item) => item?.id === targetItem.id);
                            if (foundItemIndex !== -1 && newItems[foundItemIndex] !== null) {
                                // If item exists in inventory, increase its quantity
                                newItems[foundItemIndex] = {
                                    ...newItems[foundItemIndex]!,
                                    quantity: newItems[foundItemIndex]!.quantity + 1,
                                };
                            } else {
                                if (sourceItem.quantity == 1) {
                                    // If item doesn't exist, place it in the inventory slot of the item that was moved
                                    newItems[source] = { id: targetItem.id, quantity: targetItem.quantity };
                                } else {
                                    // Move the item to an empty slot if more than one item (can't directly swap)
                                    const emptyIndex = newItems.findIndex((item) => item == null);
                                    if (emptyIndex !== -1) {
                                        newItems[emptyIndex] = { id: targetItem.id, quantity: targetItem.quantity };
                                        newItems[source] = { ...sourceItem, quantity: sourceItem.quantity - 1 };
                                    }
                                }
                            }
                        }
                    }
                }

                // Equipment > Inventory
                else if (!isSourceInventory && isTargetInventory) {
                    const sourceItem = newEquipment[source]; // The item being unequipped

                    if (sourceItem !== null) {

                        const targetItem = newItems[target]; // The item currently in inventory slot

                        // If moving backpack, change inventory slots
                        if (gameData.items[sourceItem.id].slot == "back") {
                            const newSpace = targetItem ? gameData.items[targetItem.id].space ?? 0 : 0;
                            const oldSpace = gameData.items[sourceItem.id].space!;
                            const space = newSpace - oldSpace;

                            // Do not allow move if any inventory slots which will be removed have items
                            if (space < 0 && newItems.slice(space).some(item => item != null)) {
                                useConsole.getState().addMessage("You do not have the inventory space to do that.");
                                return { player: { ...state.player } };
                            }

                            // Do not allow move if trying to place into inventory slots which will be removed
                            const foundItemIndex = newItems.findIndex((item) => item?.id === sourceItem.id);
                            if ((foundItemIndex == -1 && target > (newItems.length + space - 1)) || foundItemIndex > (newItems.length + space - 1)) {
                                useConsole.getState().addMessage("You do not have the inventory space to do that.");
                                return { player: { ...state.player } };
                            }

                            if (space > 0) {
                                newItems.push(...Array(space).fill(null));
                            } else {
                                newItems.splice(space, -space);
                            }
                        }

                        if (targetItem !== null) {
                            const correctSlot = gameData.items[targetItem.id].slot == source;
                            if (correctSlot) {
                                // Remove item from equipment
                                newEquipment[source] = null;

                                if (targetItem.id === sourceItem.id) {
                                    // If the item is the same, increase its quantity
                                    newItems[target] = { ...targetItem, quantity: targetItem.quantity + 1 };
                                } else {
                                    if (targetItem.quantity == 1) {
                                        // Swap the items
                                        newEquipment[source] = { id: targetItem.id, quantity: 1 };
                                        newItems[target] = { id: sourceItem.id, quantity: sourceItem.quantity };
                                    } else {
                                        // Move the item to an empty slot if more than one item (can't directly swap)
                                        const emptyIndex = newItems.findIndex((item) => item == null);
                                        if (emptyIndex !== -1) {
                                            newEquipment[source] = { id: targetItem.id, quantity: 1 };
                                            newItems[emptyIndex] = { id: sourceItem.id, quantity: sourceItem.quantity };
                                            newItems[target] = { ...targetItem, quantity: targetItem.quantity - 1 };
                                        }
                                    }
                                }
                            }
                        } else {
                            // Remove item from equipment
                            newEquipment[source] = null;

                            // Place the item back into inventory if slot is empty
                            const foundItemIndex = newItems.findIndex((item) => item?.id === sourceItem.id);
                            if (foundItemIndex !== -1 && newItems[foundItemIndex] !== null) {
                                // If item exists in inventory, increase its quantity
                                newItems[foundItemIndex] = {
                                    ...newItems[foundItemIndex]!,
                                    quantity: newItems[foundItemIndex]!.quantity + 1,
                                };
                            } else {
                                // If item doesn't exist, place it in the inventory slot
                                newItems[target] = { id: sourceItem.id, quantity: sourceItem.quantity };
                            }
                        }
                    }
                }

                // Update player
                return {
                    player: {
                        ...state.player,
                        inventory: {
                            ...state.player.inventory,
                            items: newItems,
                            equipment: newEquipment,
                        },
                    },
                };
            });
        }
    };
});
