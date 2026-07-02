// Stat Tables
export type XpData = number[];

export type SpeedData = number[];

export type MerchantingData = number[];

export type StaminaData = number[];

export type FarmingStatData = number[];

export interface CombatData {
  health: number[];
  strength: number[];
  accuracy: number[];
  defence: number[];
}


// Items
interface Bonus {
  absolute?: number;
  percent?: number;
}

interface ItemBonus {
  [skill: string]: {
    [stat: string]: Bonus;
  };
}

interface Item {
  name: string;
  value: number;
  slot?: string;
  description?: string;
  bonus?: ItemBonus;
  heal?: number;
  growthBoost?: number;
  xpBoost?: number;
  space?: number;
  effects?: number[];
  crafting?: boolean;
}

export type ItemData = Item[];


// Helper
export interface VariableQuantity {
  min: number;
  max: number;
}

export interface VariableItem {
  id: number;
  quantity: VariableQuantity;
  probability: number;
}

export interface FixedItem {
  id: number;
  quantity: number;
}


// Tasks
export interface Task {
  name: string;
  lvl: number;
  action: string;
  message: string;
  actions: number;
  xp: number;
  input?: FixedItem[];
  output?: VariableItem[];
}

export interface TaskData {
  [skill: string]: Task[];
}


// Recipes
export interface Recipe {
  output: VariableItem[];
  input: FixedItem[];
  lvl: number;
  actions: number;
  xp: number;
  category: string;
}

export type RecipeData = Recipe[];

// Farming
export interface Crop {
  name: string;
  actions: number;
  xp: number;
  growthTime: number;
  output: VariableItem[];
}

export interface CropData {
  [cropId: number]: Crop;
}

export interface FarmingData {
  plotLvls: number[];
  cropData: CropData;
}


// Enemies
interface Enemy {
  name: string;
  health: number;
  strength: number;
  accuracy: number;
  defence: number;
  xp: number;
  items: VariableItem[];
}

export type EnemyData = Enemy[];


// Zones
interface ZoneEnemy {
  id: number;
  probability: number;
}

export type DepthEnemies = ZoneEnemy[];

interface Zone {
  name: string;
  lvl: number;
  size: number;
  enemies: DepthEnemies[]
}

export type ZoneData = Zone[];

export interface Effect {
  name: string;
  duration: number;
  bonus?: Record<string, Bonus>;
  override?: number;
  sideEffect?: number;
  heal?: number;
  every?: number;
  reduction?: number;
}

export type EffectData = Effect[];

// All game data
export interface StatData {
  xp: XpData;
  speed: SpeedData;
  merchanting: MerchantingData;
  stamina: StaminaData;
  combat: CombatData;
  farming: FarmingStatData;
}

export interface GameData {
  items: ItemData;
  tasks: TaskData;
  recipes: RecipeData;
  enemies: EnemyData;
  zones: ZoneData;
  farming: FarmingData;
  effects: EffectData;
  unlockLvls: Record<string, number[][]>
}


// Player data

interface Records {
  items: number[];
  enemies: number[];
  zones: number[];
}

export interface PlayerInventory {
  items: (FixedItem | null)[];
  equipment: Record<string, FixedItem | null>;
}

export interface Plot {
  seed: number | null;
  fertiliser: number | null;
  planted: string | null;
}

export interface Player {
  created: string,
  inventory: PlayerInventory;
  skill: string;
  task: number | null;
  plots: Plot[];
  xp: Record<string, number>;
  records: Records;
}


// Stats
export interface GenericStats {
  speed: number;
  click: number;
}

export interface MerchantingStats {
  speed: number;
  multiplier: number;
}

export interface StaminaStats {
  speed: number;
  energy: number;
}

export interface CombatStats {
  speed: number;
  health: number;
  strength: number;
  accuracy: number;
  defence: number;
}

export interface FarmingStats {
  speed: number;
  click: number;
  yield: number;
}

export type SkillStats = GenericStats | MerchantingStats | StaminaStats | CombatStats | FarmingStats


// Settings
export interface Settings {
  resolution: number,
  smooth: boolean;
}
