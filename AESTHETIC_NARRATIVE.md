# Aesthetic Narrative — HEGEMONY COMMAND ARCHON

## Purpose
Define the canonical visual & motion vocabulary for Void-Gate. Every view —
Lobby, Faction Select, Campaign Map, Loadout, Battle, Escalation, Result —
must read as a facet of the **same operator terminal** inside a wartime
command archon. This file is the source-of-truth that prevents each view
from drifting into its own mini-aesthetic.

---

## 1. Core Identity

Void-Gate's interface is a **fictional military operator console** running
inside a fortified command ship. The operator (the player) is issuing orders
to two competing factions across a sector of contested planets. The UI is
intentionally **dense, data-saturated, and slightly over-designed** — like a
real-world defence avionics HUD overlaid with 1970s arcade phosphor.

The aesthetic leans on four pillars:

1. **Industrial chrome** — riveted steel plates, chamfered panels, rust &
   brass plating, hazard stripes. This survived from the previous pass and
   stays as the tactile base layer.
2. **Holographic command terminal** — scanlines, dot-grids, glitch text,
   ambient telemetry readouts in margins. The UI pretends to be the glass
   surface of a command hologram.
3. **Kinetic warning system** — slowly rotating containment rings,
   scrolling warning tickers, pulsing priority glyphs, and animated borders
   on critical events (escalation, rejection, victory). Motion is never
   decorative: it carries information about urgency.
4. **Operator chrome** — a fixed top header and fixed bottom navigation
   ribbon frame every view, so the player never forgets they are inside a
   console. Only the center stage changes between UI states.

---

## 2. Color System

All colors are declared as Tailwind custom tokens (see `tailwind.config.js`
and `apps/client/src/index.css`). Views **MUST** consume tokens, never raw
hex, with the single exception of the legion fill radials (which encode
faction identity and live in `legion-host` / `legion-guest`).

### 2.1 Surfaces
| Token                        | Hex       | Role                                                       |
|------------------------------|-----------|------------------------------------------------------------|
| `surface`                    | `#10141a` | Default page background                                    |
| `surface-container-lowest`   | `#0a0e14` | Outermost frame / backdrop                                 |
| `surface-container-low`      | `#181c22` | Secondary surfaces (side rails)                            |
| `surface-container`          | `#1c2026` | Default card / panel background                            |
| `surface-container-high`     | `#262a31` | Lifted panel (active item, selected row)                   |
| `surface-container-highest`  | `#31353c` | Highest elevation (modal over modal, popover)              |
| `surface-bright`             | `#353940` | Bright chrome (button hover, focus ring)                   |

### 2.2 Accents
| Token                  | Hex        | Role                                                          |
|------------------------|------------|---------------------------------------------------------------|
| `secondary`            | `#ffb77d`  | Warm operator-orange (default accent)                         |
| `secondary-container`  | `#fd8b00`  | Saturated orange for active alerts / escalation               |
| `tertiary`             | `#f1cb00`  | Mustard yellow for stable telemetry / scrap indicators        |
| `tertiary-fixed`       | `#ffe16d`  | Bright highlight yellow (rare — victory headlines)            |
| `primary`              | `#8fd6ff`  | Cool cyan used for "cool" state: pending moves, data readouts |
| `primary-container`    | `#00bfff`  | Saturated cyan for positive action buttons (submit, confirm)  |
| `error`                | `#ffb4ab`  | Warning red (rejection, forfeit text)                         |
| `error-container`      | `#93000a`  | Critical red (irreversible action background)                 |

### 2.3 On-color tokens
Use `text-on-surface`, `text-on-primary`, etc. for legibility — never raw
Tailwind grays for body copy.

### 2.4 Faction palettes (preserved)
| Faction           | Dominant colors               | Legion fill                          |
|-------------------|-------------------------------|--------------------------------------|
| Iron Hegemony     | Rust-red, dark grey           | `legion-host` radial (ember→oxblood) |
| Solar Covenant    | Gold, marble-white, cyan aura | `legion-guest` radial (pearl→brass)  |

---

## 3. Typography

Three webfonts are loaded once in `index.html` and exposed as Tailwind
families.

| Family             | Tailwind class  | Use                                                 |
|--------------------|-----------------|-----------------------------------------------------|
| Space Grotesk      | `font-headline` | All headlines, nav, buttons, section tags. UPPERCASE, wide tracking `[0.1em]` to `[0.4em]`. |
| Plus Jakarta Sans  | `font-body`     | Long-form paragraphs, description text, modal copy. |
| Inter              | `font-label`    | Tiny UI labels, telemetry readouts, tag pills.      |
| JetBrains Mono*    | `font-mono`     | (existing) Gauge readouts, dice, numeric overflows. |

Rules:
- No headline ever renders in lowercase. Titles are always `uppercase` with
  `tracking-[0.2em]` or wider.
- Body copy stays sentence-case to preserve scan-ability for rules text.
- Labels use `tracking-widest` and size `text-[10px]`–`text-[12px]`.
- `font-black` is reserved for the single hero headline on a view
  (`PLANETARY STAKES INCREASING`, `SECTOR LOST`, etc.).

---

## 4. Motion & Dynamicism

Motion is a first-class citizen. Never use it just to "look cool." Each
animation maps to a piece of state.

### 4.1 Orbital rings
Decorative containment rings orbit critical artefacts (escalation cube,
victory sigil). Always a pair — outer dashed ring rotating one direction,
inner solid ring rotating the opposite — conveying "system is live."
- Utility: `.orbital-ring` + `.orbital-ring-reverse`
- Duration: 20s outer, 15s inner, linear infinite.

### 4.2 Scanlines
A faint 2-4px horizontal gradient runs over every major surface to keep the
CRT feel. Only use `opacity: 0.3` or less so it never degrades text
legibility.
- Utility: `.scanline`

### 4.3 Hologram dot-grid
Background of any view that represents a "projection" (Campaign Map,
Escalation, Loadout). Radial dot gradient, 30px spacing.
- Utility: `.hologram-grid`

### 4.4 Glitch text
Used only on hero headlines of **critical state transitions** (escalation
accepted, battle lost, battle won). Offsets a cyan ghost 2px left and an
orange ghost 2px right.
- Utility: `.glitch-text`

### 4.5 Warning ticker
Scrolling marquee of fake status codes along the bottom of alert overlays.
Infinite horizontal scroll, 20s, always doubled content so the loop is
seamless.
- Utility: `.warning-ticker`

### 4.6 Pulsing priority glyph
Any icon that represents an "action required" state animates with
`animate-pulse`. Never pulse more than one glyph in the same panel — the
eye needs to know which thing to look at.

### 4.7 Crt-pulse (preserved)
Retained for selection rings on trenches / legions.

### 4.8 No bouncing, no easing beyond `linear` / `ease-in-out`
Military chrome does not bounce. Do not introduce `ease-bounce` or spring
physics.

---

## 5. Layout Primitives

### 5.1 Operator shell
Every view is rendered inside the same three-zone shell:

```
┌───────────── HEADER (fixed top, h-14, backdrop-blur) ──────────────┐
│  [ VOID-GATE_COMMAND_ARCHON ]  · TELEMETRY · TELEMETRY · STATUS   │
├───────────────────────────────────────────────────────────────────┤
│                                                                   │
│  CENTER STAGE (per-view content, max-w-5xl, min-h-[calc(100vh-112px)]) │
│                                                                   │
├───────────────────────────────────────────────────────────────────┤
│  FOOTER (fixed bottom, h-14, phase-aware nav ribbon)              │
└───────────────────────────────────────────────────────────────────┘
```

The HEADER never changes between views. The FOOTER highlights the current
phase (Lobby / Campaign / Loadout / Battle / Result) so the player always
knows where they are in the state machine.

### 5.2 Corner brackets
Every hero panel wears L-shaped corner brackets at all four corners
(`.corner-brackets`). This is the signature of the design — if a panel
matters, it gets brackets.

### 5.3 Ambient readouts
Side rails beside a hero artefact carry small italicised telemetry
strings. They are non-interactive and use `font-label text-[10px] opacity-60`.

### 5.4 Chamfered panels (preserved)
`.chamfer-panel` remains the chassis. Chrome plating
(`.chrome-plate` / `.rust-plate` / `.brass-plate`) stays as the surface
texture for buttons and industrial accents.

### 5.5 Border radius
Border radius is `0` everywhere except for legion discs (`rounded-full`) and
internal gauge LEDs. Sharp corners communicate military-spec.

---

## 6. Component Patterns

### 6.1 Buttons

| Variant        | Class cocktail                                                           |
|----------------|--------------------------------------------------------------------------|
| Primary action | `bg-primary-container text-on-primary border-2 border-primary-container` |
| Accept/Escalate | `bg-secondary-container text-on-secondary-fixed border-2 border-secondary-container` |
| Caution        | `border-2 border-error text-error hover:bg-error/10`                     |
| Idle / Nav     | `border border-outline-variant text-on-surface-variant hover:text-on-surface` |

All buttons are rectangular, `px-6 py-3` minimum, `font-headline uppercase
tracking-[0.15em]`.

### 6.2 Hero headline
```
<div class="corner-brackets chamfer-panel bg-surface-container p-8 relative">
  <div class="scanline absolute inset-0 opacity-20 pointer-events-none" />
  <h1 class="font-headline font-black text-4xl text-secondary-container
             tracking-[0.2em] uppercase glitch-text">
    PLANETARY STAKES INCREASING
  </h1>
</div>
```

### 6.3 Tag pill
```
<span class="font-label text-[10px] uppercase tracking-[0.3em]
             text-on-surface-variant border border-outline-variant px-2 py-[2px]">
  MISSION: ECLIPSE
</span>
```

### 6.4 Telemetry readout
```
<div class="absolute -right-32 top-1/2 -translate-y-1/2 space-y-1 opacity-60">
  <p class="font-label text-[10px] text-primary">CORE_TEMP: 4500K</p>
  <p class="font-label text-[10px] text-primary">VOID_SYNC: LOCK</p>
</div>
```

---

## 7. Per-View Briefs

### 7.1 Lobby (`LOBBY`)
Operator boot terminal. A single hero panel with the call-to-action
(`CREATE SECTOR` / `JOIN SECTOR`), framed by corner brackets. Ambient
telemetry lists fake fleet status in side rails.

### 7.2 Waiting (`WAITING`)
The lobby panel condenses to a single line with a pulsing "WAITING FOR
COMBATANT" status and a spinning orbital ring containing the sector code.

### 7.3 Faction Select (`FACTION_SELECT`)
Two mirrored hero panels for Iron Hegemony and Solar Covenant. Each panel
uses its faction's accent color (red / gold), wears corner brackets, and
has an ambient readout strip declaring doctrine stats. Hover swaps chrome.

### 7.4 Campaign Map (`CAMPAIGN_MAP`)
Full-width hologram dot-grid background. Planetary nodes are chamfered
hexes connected by dashed vector lines. Active node pulses `secondary-container`.

### 7.5 Loadout (`LOADOUT`)
Three-column grid: faction roster (left), item loadout slots (centre),
scrap economy gauge (right). Unlocked items glow `tertiary`, locked items
are `chrome-plate` desaturated.

### 7.6 Battle (`BATTLE_ACTIVE`)
The tactical board is the stage. Above the board: planet context banner
(already implemented). Below: reserved-height pending-strip, then
escalation/items row. Shell header/footer stay static.

### 7.7 Escalation Prompt (`ESCALATION_PROMPT`)
Full-viewport overlay. Central cube with orbital rings, glitch-text
headline ("PLANETARY STAKES INCREASING"), side rails of fake telemetry,
scrolling warning ticker along the bottom, ACCEPT / RETREAT buttons. Must
feel like a priority-one interrupt.

### 7.8 Battle Result (`BATTLE_RESULT`)
Hero sigil (victory star for win, shattered circle for loss) with orbital
rings, glitch-text headline ("VICTORY" / "SECTOR LOST"), short telemetry
sentence summarising scrap gained. Single CTA to return to Campaign.

### 7.9 Campaign Result (`CAMPAIGN_RESULT`)
Same visual grammar as Battle Result but at a bigger scale — full sector
map collapses to a single animated sigil.

---

## 8. UI State Machine — **Do Not Break**

The following `uiView` transitions are canonical. Any aesthetic change that
would move a user between views outside this graph is a bug:

```
LOBBY ─(CREATE)──► WAITING ─(GUEST_JOIN)──► FACTION_SELECT
                                                   │
                                                   ▼
                                             CAMPAIGN_MAP ◄───────┐
                                                   │              │
                                                   ▼              │
                                                LOADOUT ─► BATTLE_ACTIVE
                                                                  │
                                                                  ├─► ESCALATION_PROMPT ─► BATTLE_ACTIVE
                                                                  │
                                                                  ▼
                                                          BATTLE_RESULT ───► CAMPAIGN_MAP
                                                                  │
                                                                  └──► CAMPAIGN_RESULT (terminal)
```

Guarantees every view must preserve:
- All existing `data-testid` attributes (consumed by Playwright POM).
- The `state-version` semantics on the battle root (advance-on-broadcast).
- All existing `sendGameIntent` call sites and payload shapes.

---

## 9. Terminology Mapping (Strict Enforcement)

| Standard Backgammon Term | System UI String       |
|--------------------------|------------------------|
| Checkers / Pieces        | Legions                |
| The Bar                  | Void-Buffer            |
| Hit / Bumping            | Eradicate Legion       |
| Enter from Bar           | Redeploy               |
| Bearing Off              | Orbital Evacuation     |
| Match / Game             | Planetary Battle       |
| Doubling Cube            | Escalation Protocol    |
| Accept Double            | Accept Ultimatum       |
| Drop Double              | Tactical Retreat       |
| Dice Roll                | Roll Sequence          |
| Tournament / Campaign    | Sector Campaign        |

Violations of this table (e.g. rendering "Bearing Off" anywhere in UI copy)
should be fixed in the same PR as the file that introduced them.

