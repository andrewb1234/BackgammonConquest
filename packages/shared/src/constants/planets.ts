/**
 * Planetary node definitions.
 * Maps 0-indexed nodeId → planet metadata.
 * Display IDs are 1-indexed (nodeId + 1) as shown in PLANETS.md.
 */

export type PlanetModifierType =
  | "ECONOMY"
  | "INFORMATION"
  | "INITIATIVE"
  | "DEFENSE"
  | "LOADOUT"
  | "CAPITAL";

export interface PlanetDef {
  nodeId: number; // 0-indexed
  displayId: number; // 1-indexed
  name: string;
  modifierType: PlanetModifierType;
  effect: string;
  icon: string; // single glyph for compact UI
}

export const PLANETS: PlanetDef[] = [
  {
    nodeId: 0,
    displayId: 1,
    name: "Iron Forge VII",
    modifierType: "ECONOMY",
    effect: "Reduce the purchase cost of all Tactical Items by 20%.",
    icon: "⚒",
  },
  {
    nodeId: 1,
    displayId: 2,
    name: "The Sightless Eye",
    modifierType: "INFORMATION",
    effect: "Reveal the opponent's pending dice roll values at the start of the player's turn.",
    icon: "◉",
  },
  {
    nodeId: 2,
    displayId: 3,
    name: "Helios Gate",
    modifierType: "INITIATIVE",
    effect: "Automatically win the Initiative Roll for battles initiated from this node.",
    icon: "☀",
  },
  {
    nodeId: 3,
    displayId: 4,
    name: "Martyr's Rest",
    modifierType: "DEFENSE",
    effect: "Nullify the first successful enemy hit against a friendly piece per match.",
    icon: "✟",
  },
  {
    nodeId: 4,
    displayId: 5,
    name: "The Maw",
    modifierType: "LOADOUT",
    effect: "Increase maximum Tactical Item slots from 2 to 3.",
    icon: "⊗",
  },
  {
    nodeId: 5,
    displayId: 6,
    name: "The Bastion (HOST)",
    modifierType: "CAPITAL",
    effect: "Capital. Defender may change one rolled 6 to a Double-6 once per match. Begins with 2 Legions borne off.",
    icon: "♜",
  },
  {
    nodeId: 6,
    displayId: 7,
    name: "The Bastion (GUEST)",
    modifierType: "CAPITAL",
    effect: "Capital. Defender may change one rolled 6 to a Double-6 once per match. Begins with 2 Legions borne off.",
    icon: "♜",
  },
];

export function getPlanet(nodeId: number): PlanetDef | undefined {
  return PLANETS.find((p) => p.nodeId === nodeId);
}

export function getPlanetName(nodeId: number): string {
  return getPlanet(nodeId)?.name ?? `Node ${nodeId + 1}`;
}
