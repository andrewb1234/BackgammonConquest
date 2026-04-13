export const PIECES_PER_PLAYER = 15;
export const CAMPAIGN_NODE_COUNT = 7;
export const BOARD_POINT_COUNT = 24;
export const STANDARD_DICE_COUNT = 2;
export const DOUBLES_DICE_COUNT = 4;

// Economy
export const WIN_REWARD = 10;
export const LOSS_REWARD = Math.floor(WIN_REWARD * 0.4); // 4
export const ITEM_COST = Math.floor(WIN_REWARD * 2.5); // 25
export const INITIAL_VOID_SCRAP = 30;
export const MAX_LOADOUT_SLOTS = 2;
export const MAW_EXTRA_SLOT = 3; // The Maw node grants 3 slots

// Item Catalog
export type ItemId = "AIR_STRIKE" | "ANGELIC_PROTECTION" | "LUCKY_CHANCE" | "SABOTAGE";
export type ItemTrigger = "PRE_MOVE" | "POST_ROLL" | "PRE_MATCH";

export interface ItemDef {
  itemId: ItemId;
  name: string;
  trigger: ItemTrigger;
  cost: number;
  description: string;
}

export const ITEM_CATALOG: ItemDef[] = [
  {
    itemId: "AIR_STRIKE",
    name: "Air Strike",
    trigger: "PRE_MOVE",
    cost: ITEM_COST,
    description: "Move one enemy blot to the Bar. Does not consume movement.",
  },
  {
    itemId: "ANGELIC_PROTECTION",
    name: "Angelic Protection",
    trigger: "PRE_MOVE",
    cost: ITEM_COST,
    description: "Make one friendly piece invulnerable for 2 turns. Blocks enemy targeting.",
  },
  {
    itemId: "LUCKY_CHANCE",
    name: "Lucky Chance",
    trigger: "POST_ROLL",
    cost: ITEM_COST,
    description: "Force a complete re-roll of active dice.",
  },
  {
    itemId: "SABOTAGE",
    name: "Sabotage",
    trigger: "PRE_MATCH",
    cost: ITEM_COST,
    description: "Disable an enemy node's passive modifier for this match.",
  },
];
