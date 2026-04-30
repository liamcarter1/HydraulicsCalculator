yes
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Status

This project is a fresh PyCharm skeleton — only the default `main.py` exists. There is no real hydraulics calculator code, no README, no dependency manifest (`requirements.txt` / `pyproject.toml`), and no tests yet. Do not assume conventions, frameworks, or architecture from the project name; ask the user before introducing them.

## Project Goal

Build an **online hydraulics system calculator** that emulates the functionality of Trelleborg's tool:

- Reference: https://www.trelleborg.com/en/seals/resources/design-support-and-engineering-tools/hydraulic-system-calculator
- Match the **same calculations and feature set** as the Trelleborg calculator (cylinder forces, flow, pressure, speed, etc. — confirm the full input/output scope against the reference site before implementing).
- Use the **Danfoss brand colour palette** for all UI styling — not Trelleborg's. See `### Danfoss palette` below for confirmed values.
- **Hard deadline:** must be hosted and demo-ready in the **week of 2026-05-04** for a leadership summit (user is presenting). Optimise every choice for "ships fast and looks polished" — see `### Recommended stack` below.

### Danfoss palette

Confirmed from the official Danfoss SVG (`C:\Users\liamc\OneDrive\Pictures\danfoss logo.svg`, id `logo-danfoss-2025`):

- **Brand red:** `#ED071B` (primary)
- **Wordmark / on-red text:** `#FFFFFF`

Secondary / neutral / chart colours are **not** defined by the SVG. If the design needs more than red+white+black, ask the user for the official Danfoss brand guidelines rather than picking values from third-party brand-listing sites. As a working stand-in until guidelines are provided, neutral greys (e.g. `#1A1A1A` text, `#F5F5F5` surfaces) are acceptable but should be flagged for review.

### Feature inventory (captured from Trelleborg's UI on 2026-04-30, both Metric and Inch modes verified)

The Trelleborg tool is a single-page calculator embedded as an iframe with a global **Metric / Inch** unit toggle, **5 tabs**, a per-tab **Formula** popup, and **Copy / Reset / Email** actions. Cylinder calculations cite **ISO 3320 / 3321 / 4393** compliance.

Notation used below: `metric → imperial`.

**Tab 1 — Cylinder** (no solve-for selector; outputs update live, separate Bore-side and Rod-side columns)
- Inputs: Piston / Bore Diameter (`mm → in`), Rod Diameter (`mm → in`), Stroke (`mm → in`), Pressure (`bar → psi`), Oil Flow (`lpm → gpm`)
- Editable on each side (act as both inputs and outputs — solver works from either direction): Force (`kN → lbf`), Time (`sec`), Velocity (`m/s → in/s`)
- Computed on each side: Area (`cm² → in²`), Volume (`l → in³`), Outflow (`lpm → gpm`), Ratio (dimensionless, single column)
- Formulas (per side; `R` = bore radius, `r` = rod radius, `X` = bore-side area, `L` = stroke, `P` = pressure, `A` = area, `V` = volume, `FR` = oil flow rate, `T` = time, `Z` = ratio):
  - Area — bore: `π·R²` ; rod: `X − π·r²`
  - Volume — bore: `π·R²·L` ; rod: `X·L − π·r²·L`
  - Force = `P · A` (each side)
  - Time = `V / FR` (each side)
  - Velocity = `L / T` (each side)
  - Outflow — bore: `FR / Z` ; rod: `FR · Z`
  - Ratio = `A_bore / A_rod`

**Tab 2 — Motor** — *Calculate* selector with **6 modes**: `Flow rate` (default), `Pressure`, `Displacement`, `Speed`, `Torque`, `Power`
- Fields: Displacement (`m³/rev → in³/rev`), Speed (`rps → rpm` — note unit *and* base change between modes), Volumetric efficiency (%), Power (`W → hp`), Pressure (`Pa → psi`), Mechanical efficiency (%), Flow rate (`m³/s → gpm`); a Torque field appears when "Torque" is selected
- Imperial Flow-rate formula: `Q = (V·N) / (231·ηv/100)` **OR** `Q = (P·1714) / ((ηv/100)·(ηm/100)·p)` — embeds gallon (`231 in³`) and horsepower (`1714`) constants, so **per-unit-system formulas are required, not just unit conversion of inputs**

**Tab 3 — Pump** — *Calculate* selector with **4 modes**: `Flow rate` (default), `Displacement`, `Electric motor power`, `Total efficiency`
- Fields: Displacement (`m³/rev → in³/rev`), Speed (`rpm`), Volumetric efficiency (%), Flow rate (`m³/min → gpm`); Pressure and Electric motor power fields appear in the relevant modes
- Imperial Flow-rate formula: `Q = (V·N·ηv/100) / 231`

**Tab 4 — Pressure Drop** (orifice equation; no Calculate selector)
- Inputs: Flow rate (`m³/s → gpm`), Diameter (`mm → in`), Orifice flow coefficient `K` (dimensionless), Specific gravity of fluid `Sg` (dimensionless)
- Output: Pressure drop (`kPa → psi`)
- Imperial formula: `ΔP = [Q / (9.525 · π · K · d²)]² · Sg`

**Tab 5 — Piping** — *Calculate* selector with **2 modes**: `Using absolute viscosity` (default), `Using kinematic viscosity`
- Inputs (absolute mode): Flow rate (`lpm → gpm`), Specific gravity `Sg`, Inside pipe diameter (`mm → in`), Absolute viscosity μ (`cP`)
- Outputs: Cross-sectional area (`mm² → in²`), Velocity (`m/s → ft/s`), Reynolds number (dimensionless)
- Imperial formulas: `A = π·d²/4`, `v = Q/A`, `Re = (7740·v·d·Sg) / μ`

> **Implementation warning:** Because the Trelleborg constants (`231`, `1714`, `7740`, `9.525`) are unit-specific, do not "just convert all inputs to SI and use one formula" — keep two formula tracks (Metric and Imperial) per calculator and pick at runtime based on the unit toggle. Otherwise rounding will diverge from the reference tool and engineers will spot it.

### Stack & delivery (locked 2026-04-30)

- **Stack:** vanilla **HTML + CSS + JS**, no build step, no framework. Calc logic is pure arithmetic — runs client-side. Three files to start: `index.html`, `styles.css`, `calculator.js` (split JS later if it grows).
- **Hosting:** **Vercel** (user has an account). Static deploy — no `vercel.json` config needed for a flat static site. Netlify Drop is the fallback.
- **Scope for v1:** **All 5 tabs polished.** No "Cylinder-first / others stubbed" trade-off.
- **Existing Python skeleton:** `main.py` and the PyCharm Python 3.14 SDK are **unused** by this build — leave them in place but don't build on them.

### Design direction (locked 2026-04-30)

The UI must feel like a **modern iOS app**, not a generic web form. Apply the following defaults unless the user overrides them:

- **Typography:** system stack — `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif`. Pull `Inter` from Google Fonts as a Windows fallback so the demo looks consistent regardless of the presenter's machine.
- **Surfaces:** white cards on a light-grey app background, ~16px corner radius, soft shadows (`0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.06)`), generous padding.
- **Controls:** the Metric/Inch toggle is a **pill segmented control** (iOS style); tab navigation is icon+label cards (top row on desktop, bottom tab bar on mobile — see "Open questions" below).
- **Colour usage:** Danfoss red `#ED071B` is the *accent / call-to-action* colour (active tab indicator, primary buttons, highlights). Body text on neutral greys; do **not** flood large surfaces with brand red.
- **Motion:** subtle — 200–250ms cubic-bezier transitions on tab switches and value updates; nothing showy.
- **Imagery / "pictures":**
  - Each tab gets one **isometric SVG illustration** of its component (cylinder, motor, pump, orifice, pipe section), rendered in a 2-tone style — dark neutral (`#1A1A1A`-ish) + Danfoss red `#ED071B` accent — on a soft tinted background card at the top of the tab content.
  - Inline UI controls (Copy / Reset / Email buttons, tab icons, the unit toggle) use **clean line icons** in the SF-Symbols / Lucide / Tabler vocabulary.
  - Illustrations live in `assets/illustrations/` as SVGs we hand-craft (no licensing risk, perfectly consistent style). If the user later supplies branded Danfoss illustrations, swap them in.
- **Dark mode:** **light only at v1**. Add `prefers-color-scheme: dark` later — design tokens (CSS custom properties) should be set up to make the future swap easy.
- **Tab placement:** **horizontal tab bar at the top on ≥768px** (desktop / tablet); **bottom tab bar on <768px** (mobile). This is the most iOS-authentic responsive pattern — the bottom bar is the canonical iPhone navigation idiom and a leadership audience may glance at it on phones too.
- **Avoid generic AI-aesthetic clichés:** no purple gradients, no glassmorphism for its own sake, no emoji icons. iOS-style is the brief.

## Environment

- Interpreter: **Python 3.14** (configured in `.idea/misc.xml`).
- Not a git repository. There is no remote or commit history to consult.
- IDE: PyCharm (`.idea/` is checked in).

## Running

```bash
python main.py
```

There is no build system, linter config, or test runner set up. If the user asks to add one, confirm the choice (e.g. `pytest` vs `unittest`, `ruff` vs `black`+`flake8`) rather than picking unilaterally.
