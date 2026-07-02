import React from "react";
import { Text } from "../text";

export const Info: React.FC = () => {
  return (
    <div style={{ maxHeight: "327px", overflowY: "scroll", padding: "8px" }}>
      <div style={{ marginBottom: "8px" }}>
        <Text text={"Runeclicker v2.1"} type="bold" />
        <Text text={"Code and graphics by Krzysztof Mrozinski"} type="normal" />
      </div>

      <Text text={"Changelog:"} type="bold" />

      <div style={{ marginBottom: "8px" }}>
        <Text text={"v2.1: Farming and High-level Combat (2025-08-12)"} type="bold" />
        <Text text={"- Added farming skill"} type="normal" />
        <Text text={"- Added potions and combat effects"} type="normal" />
        <Text text={"- Added new content for combat up to lvl 40"} maxWidth={465} type="normal" />
        <Text text={"- Added new content for mining and woodcutting up to lvl 50"} type="normal" />
        <Text text={"- 84 new items"} type="normal" />
      </div>

      <div style={{ marginBottom: "8px" }}>
        <Text text={"v2.0: Rebuild (2025-06-02)"} type="bold" />
        <Text text={"- Game engine rebuilt from scratch"} type="normal" />
        <Text text={"- Complete graphical overhaul"} type="normal" />
        <Text text={"- Added backpacks- extra inventory space is earned"} type="normal" />
        <Text text={"- Removed individual tool slots from equipment- all tools are worn in hand slot"} maxWidth={465} type="normal" />
        <Text text={"- Renamed Energy skill to Stamina. Reworked levelling and removed autotask feature"} maxWidth={460} type="normal" />
        <Text text={"- Overhauled progress tracking with new stats menu"} type="normal" />
        <Text text={"- Pause auto action feature"} type="normal" />
        <Text text={"- Various balancing work"} type="normal" />
        <Text text={"- 4 new items"} type="normal" />
      </div>

      <div style={{ marginBottom: "8px" }}>
        <Text text={"v1.2: Combat (2024-10-27)"} type="bold" />
        <Text text={"- Added combat skill. 2 zones with 13 total enemies"} type="normal" />
        <Text text={"- Added new equipment slots for weapon, head, chest, legs, and neck"} type="normal" />
        <Text text={"- Various interface improvements"} type="normal" />
        <Text text={"- 47 new items"} type="normal" />
      </div>

      <div style={{ marginBottom: "8px" }}>
        <Text text={"v1.1: Energy and Merchanting (2024-08-22)"} type="bold" />
        <Text text={"- Added Merchanting skill. Levelled by selling items for coins"} type="normal" />
        <Text text={"- Added Energy system. Auto actions are no longer endless and require periodic input to recharge"} maxWidth={430} type="normal" />
        <Text text={"- Added Energy skill. Coins may be spent to increase auto action time"} maxWidth={450} type="normal" />
        <Text text={"- Various interface improvements"} type="normal" />
        <Text text={"- 1 new item"} type="normal" />
      </div>

      <div style={{ marginBottom: "8px" }}>
        <Text text={"v1.0: Release (2024-07-25)"} type="bold" />
        <Text text={"- First full version of the game"} type="normal" />
        <Text text={"- Woodcutting, Mining, and Processing skills with content up to lvl 40"} maxWidth={445} type="normal" />
        <Text text={"- 50 total items"} type="normal" />
      </div>
    </div>
  );
};
