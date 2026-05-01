// Motor tab — solver with 6 modes (Flow rate, Pressure, Displacement,
// Speed, Torque, Power). Mirrors Trelleborg's behaviour: each mode
// shows multiple alternative input paths and the calc auto-picks
// whichever path is fully populated.
//
// Conventions follow Trelleborg's published formulas, which use the
// MOTOR convention — required input flow exceeds ideal because of
// internal leakage:  Q = V·N / (231·ηv/100)    (imperial)
// (Pump uses the inverse, Q = V·N·ηv/231 — that's pump.js, not here.)

import { illustrations } from "../illustrations.js";
import { fmt } from "../format.js";
import { actionsBar, copyToClipboard, emailLink } from "../actions.js";

const STORAGE_KEY = "hsc.motor.inputs";

const MODES = [
  { id: "flow",         label: "Flow rate" },
  { id: "pressure",     label: "Pressure" },
  { id: "displacement", label: "Displacement" },
  { id: "speed",        label: "Speed" },
  { id: "torque",       label: "Torque" },
  { id: "power",        label: "Power" },
];

const FIELDS = {
  metric: {
    displacement: { label: "Displacement",          unit: "cm³/rev" },
    speed:        { label: "Speed",                 unit: "rpm" },
    eta_v:        { label: "Volumetric efficiency", unit: "%" },
    eta_m:        { label: "Mechanical efficiency", unit: "%" },
    pressure:     { label: "Pressure",              unit: "bar" },
    flow:         { label: "Flow rate",             unit: "lpm" },
    torque:       { label: "Torque",                unit: "N·m" },
    power:        { label: "Power",                 unit: "kW" },
  },
  imperial: {
    displacement: { label: "Displacement",          unit: "in³/rev" },
    speed:        { label: "Speed",                 unit: "rpm" },
    eta_v:        { label: "Volumetric efficiency", unit: "%" },
    eta_m:        { label: "Mechanical efficiency", unit: "%" },
    pressure:     { label: "Pressure",              unit: "psi" },
    flow:         { label: "Flow rate",             unit: "gpm" },
    torque:       { label: "Torque",                unit: "lbf·in" },
    power:        { label: "Power",                 unit: "hp" },
  },
};

// Inputs Trelleborg shows for each mode (output omitted from this list).
const MODE_INPUTS = {
  flow:         ["displacement", "speed", "eta_v", "power", "pressure", "eta_m"],
  pressure:     ["power", "flow", "eta_v", "eta_m", "torque", "displacement"],
  displacement: ["torque", "eta_m", "flow", "eta_v", "speed"],
  speed:        ["flow", "eta_v", "displacement", "power", "torque"],
  torque:       ["eta_m", "displacement", "power", "speed"],
  power:        ["torque", "speed", "flow", "eta_v", "eta_m"],
};

// Internally-consistent preset values so any mode produces a clean answer.
// Metric: V=28cm³/rev, N=1500rpm, ηv=95%, ηm=92%, P=200bar
//   → Q = 28·1500/(1000·0.95) = 44.21 lpm
//   → T = 28·200·0.92/(20π) = 81.97 N·m
//   → Pw_out = Q·P·ηv·ηm/600 = 44.21·200·0.95·0.92/600 = 12.88 kW
const PRESETS = {
  metric:   { displacement: "28",  speed: "1500", eta_v: "95", eta_m: "92", pressure: "200",  flow: "44.21", torque: "82",  power: "12.88" },
  imperial: { displacement: "1.7", speed: "1500", eta_v: "95", eta_m: "92", pressure: "2900", flow: "11.62", torque: "725", power: "17.18" },
};

export function renderMotor(host, { unit }) {
  const state = loadState(unit);

  const hero = buildHero({
    eyebrow: "02 · Motor",
    title: "Hydraulic motor sizing",
    lede:
      "Pick the variable you want to solve for; fill in any consistent set of the remaining inputs. Volumetric and power-balance paths both feed the same answer — useful when a manufacturer datasheet gives you one but not the other.",
    art: illustrations.motor,
  });
  host.appendChild(hero);
  const heroArt = hero.querySelector(".hero__art");
  // Caption under the rotor so the engineer in the room knows the speed is slowed.
  const speedCaption = document.createElement("div");
  speedCaption.className = "hero__art-caption";
  speedCaption.textContent = "Rotor visualised slower than actual speed";
  heroArt.appendChild(speedCaption);

  const grid = document.createElement("div");
  grid.className = "calc";
  host.appendChild(grid);

  const inputsCard = card("Inputs");
  const resultsCard = card("Results");

  const picker = document.createElement("span");
  picker.className = "mode-picker";
  picker.innerHTML = `
    <span style="color:var(--color-ink-3);font-size:11px;letter-spacing:.1em;text-transform:uppercase;">Calculate</span>
    <select aria-label="Variable to calculate">
      ${MODES.map((m) => `<option value="${m.id}" ${m.id === state.mode ? "selected" : ""}>${m.label}</option>`).join("")}
    </select>
  `;
  inputsCard.el.querySelector(".card__header").appendChild(picker);
  picker.querySelector("select").addEventListener("change", (e) => {
    state.mode = e.target.value;
    saveState(state);
    rebuildInputs();
    paint();
  });

  grid.appendChild(inputsCard.el);
  grid.appendChild(resultsCard.el);

  const formula = document.createElement("section");
  formula.className = "formula";
  host.appendChild(formula);

  const actEl = actionsBar({
    onCopy: (e) => copyToClipboard(serialize(state, unit), e.currentTarget),
    onReset: () => {
      Object.keys(state).forEach((k) => k !== "mode" && (state[k] = ""));
      saveState(state);
      rebuildInputs();
      paint();
    },
    onPreset: () => {
      Object.keys(PRESETS[unit]).forEach((k) => (state[k] = PRESETS[unit][k]));
      saveState(state);
      rebuildInputs();
      paint();
    },
    onEmail: () => {
      const url = emailLink("Hydraulic motor sizing — results", serialize(state, unit));
      window.location.href = url;
    },
  });
  resultsCard.el.appendChild(actEl);

  rebuildInputs();
  paint();

  function rebuildInputs() {
    const f = FIELDS[unit];
    const required = MODE_INPUTS[state.mode];
    inputsCard.body.innerHTML = "";
    required.forEach((key) => {
      const def = f[key];
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <label class="row__label" for="motor-${key}">${def.label}</label>
        <input id="motor-${key}" class="row__input" type="number" inputmode="decimal" step="any" min="0" placeholder="0" value="${state[key] ?? ""}" />
        <span class="row__unit">${def.unit}</span>
      `;
      row.querySelector("input").addEventListener("input", (e) => {
        state[key] = e.target.value;
        saveState(state);
        paint();
      });
      inputsCard.body.appendChild(row);
    });
  }

  function paint() {
    const f = FIELDS[unit];
    const { value, path } = solve(state, unit);
    const targetDef = f[state.mode];
    const display = fmt(value);
    const isBlank = display === "—";
    resultsCard.body.innerHTML = `
      <div class="result-hero">
        <div class="result-hero__value${isBlank ? " result-hero__value--blank" : ""}">
          ${display}<span class="result-hero__unit">${targetDef.unit}</span>
        </div>
        <div class="result-hero__label">${targetDef.label}</div>
        <div class="result-hero__hint">${path ? "via " + path : "Fill the inputs to compute"}</div>
      </div>
    `;
    formula.innerHTML = `
      <details open>
        <summary>Show formulas</summary>${formulaText(state.mode, unit)}</details>
    `;
    // Drive rotor animation. If speed is the OUTPUT, fall back to the input N (state.speed)
    // so the rotor is never frozen during a partial-input demo.
    const rpm = state.mode === "speed" ? +value || 0 : +state.speed || 0;
    const slowness = 25; // visualise slower so the eye can follow
    const visibleRpm = rpm / slowness;
    const cycleS = visibleRpm > 0 ? Math.max(0.4, Math.min(4, 60 / visibleRpm)) : 2;
    heroArt.style.setProperty("--rpm-s", `${cycleS}s`);
  }
}

// --- Solver ------------------------------------------------------------------
// Each mode exposes 1–2 paths. Returns { value, path } so the UI can show
// which formula was used. `null` value means inputs aren't yet enough.

function solve(s, unit) {
  const V  = +s.displacement || 0;
  const N  = +s.speed || 0;
  const ev = (+s.eta_v || 0) / 100;
  const em = (+s.eta_m || 0) / 100;
  const P  = +s.pressure || 0;
  const Q  = +s.flow || 0;
  const T  = +s.torque || 0;
  const Pw = +s.power || 0;

  const M = unit === "metric";
  // Unit-system constants that turn the canonical formula into native units.
  const KQ = M ? 1000 : 231;          // V·N / (KQ·ev) → flow in lpm or gpm
  const KT = M ? (20 * Math.PI) : (2 * Math.PI);  // V·P·em / KT → torque in N·m or lbf·in
  const KP_pw_q = M ? 600 : 1714;     // Pw = Q·P·ev·em / KP_pw_q  (motor output power)
  const KW_tn = M ? (60000 / (2 * Math.PI)) : 63025; // Pw = T·N / KW_tn

  switch (s.mode) {
    case "flow": {
      // Volumetric path:  Q = V·N / (KQ·ev)
      if (V > 0 && N > 0 && ev > 0) {
        return { value: (V * N) / (KQ * ev), path: "V · N ÷ (k · ηv)" };
      }
      // Power path:       Q = Pw·KP / (P·ev·em)
      if (Pw > 0 && P > 0 && ev > 0 && em > 0) {
        return { value: (Pw * KP_pw_q) / (P * ev * em), path: "Pw · k ÷ (P · ηv · ηm)" };
      }
      return { value: null };
    }
    case "pressure": {
      // Torque path:      P = KT · T / (V · em)
      if (T > 0 && V > 0 && em > 0) {
        return { value: (KT * T) / (V * em), path: "k · T ÷ (V · ηm)" };
      }
      // Power path:       P = Pw·KP / (Q·ev·em)
      if (Pw > 0 && Q > 0 && ev > 0 && em > 0) {
        return { value: (Pw * KP_pw_q) / (Q * ev * em), path: "Pw · k ÷ (Q · ηv · ηm)" };
      }
      return { value: null };
    }
    case "displacement": {
      // Volumetric path:  V = Q · KQ · ev / N
      if (Q > 0 && N > 0 && ev > 0) {
        return { value: (Q * KQ * ev) / N, path: "Q · k · ηv ÷ N" };
      }
      // Torque path:      V = KT · T / (P · em)
      if (T > 0 && P > 0 && em > 0) {
        return { value: (KT * T) / (P * em), path: "k · T ÷ (P · ηm)" };
      }
      return { value: null };
    }
    case "speed": {
      // Volumetric path:  N = Q · KQ · ev / V
      if (Q > 0 && V > 0 && ev > 0) {
        return { value: (Q * KQ * ev) / V, path: "Q · k · ηv ÷ V" };
      }
      // Power path:       N = Pw · KW_tn / T
      if (Pw > 0 && T > 0) {
        return { value: (Pw * KW_tn) / T, path: "Pw · k ÷ T" };
      }
      return { value: null };
    }
    case "torque": {
      // Pressure path:    T = V · P · em / KT
      if (V > 0 && P > 0 && em > 0) {
        return { value: (V * P * em) / KT, path: "V · P · ηm ÷ k" };
      }
      // Power path:       T = Pw · KW_tn / N
      if (Pw > 0 && N > 0) {
        return { value: (Pw * KW_tn) / N, path: "Pw · k ÷ N" };
      }
      return { value: null };
    }
    case "power": {
      // Mechanical path:  Pw = T · N / KW_tn
      if (T > 0 && N > 0) {
        return { value: (T * N) / KW_tn, path: "T · N ÷ k" };
      }
      // Hydraulic path:   Pw = Q · P · ev · em / KP_pw_q
      if (Q > 0 && P > 0 && ev > 0 && em > 0) {
        return { value: (Q * P * ev * em) / KP_pw_q, path: "Q · P · ηv · ηm ÷ k" };
      }
      return { value: null };
    }
  }
  return { value: null };
}

function formulaText(mode, unit) {
  const M = unit === "metric";
  const t = {
    flow:
      M ? `Q = V · N ÷ (1000 · ηv)               [lpm,  V cm³/rev,  N rpm]\nQ = Pw · 600 ÷ (P · ηv · ηm)         [alt: from output power]`
        : `Q = V · N ÷ (231 · ηv)                [gpm,  V in³/rev,  N rpm]\nQ = Pw · 1714 ÷ (P · ηv · ηm)        [alt: from output power]`,
    pressure:
      M ? `P = 20π · T ÷ (V · ηm)                [bar,  T N·m,  V cm³/rev]\nP = Pw · 600 ÷ (Q · ηv · ηm)         [alt: from power & flow]`
        : `P = 2π · T ÷ (V · ηm)                 [psi,  T lbf·in, V in³/rev]\nP = Pw · 1714 ÷ (Q · ηv · ηm)        [alt: from power & flow]`,
    displacement:
      M ? `V = Q · 1000 · ηv ÷ N                 [cm³/rev]\nV = 20π · T ÷ (P · ηm)                [alt: from torque]`
        : `V = Q · 231  · ηv ÷ N                 [in³/rev]\nV = 2π  · T ÷ (P · ηm)                [alt: from torque]`,
    speed:
      M ? `N = Q · 1000 · ηv ÷ V                 [rpm]\nN = Pw · 60 000 ÷ (T · 2π)            [alt: from power & torque]`
        : `N = Q · 231 · ηv ÷ V                  [rpm]\nN = Pw · 63 025 ÷ T                   [alt: from power & torque]`,
    torque:
      M ? `T = V · P · ηm ÷ (20π)                [N·m]\nT = Pw · 60 000 ÷ (N · 2π)            [alt: from power & speed]`
        : `T = V · P · ηm ÷ (2π)                 [lbf·in]\nT = Pw · 63 025 ÷ N                   [alt: from power & speed]`,
    power:
      M ? `Pw = T · N · 2π ÷ 60 000              [kW]\nPw = Q · P · ηv · ηm ÷ 600            [alt: hydraulic output]`
        : `Pw = T · N ÷ 63 025                   [hp]\nPw = Q · P · ηv · ηm ÷ 1714           [alt: hydraulic output]`,
  };
  return t[mode];
}

function buildHero({ eyebrow, title, lede, art }) {
  const hero = document.createElement("section");
  hero.className = "hero";
  hero.innerHTML = `
    <div>
      <p class="hero__eyebrow">${eyebrow}</p>
      <h1 class="hero__title">${title}</h1>
      <p class="hero__lede">${lede}</p>
    </div>
    <div class="hero__art" aria-hidden="true">${art}</div>
  `;
  return hero;
}

function card(title) {
  const el = document.createElement("section");
  el.className = "card";
  el.innerHTML = `
    <header class="card__header">
      <h2 class="card__title">${title}</h2>
    </header>
    <div class="card__body"></div>
  `;
  return { el, body: el.querySelector(".card__body") };
}

function loadState(unit) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { mode: "flow", displacement: "", speed: "", eta_v: "", eta_m: "", pressure: "", flow: "", torque: "", power: "", ...JSON.parse(raw) };
  } catch {}
  return { mode: "flow", ...PRESETS[unit] };
}

function saveState(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

function serialize(state, unit) {
  const f = FIELDS[unit];
  const { value, path } = solve(state, unit);
  const required = MODE_INPUTS[state.mode];
  return [
    "Hydraulic motor — Trelleborg-equivalent results",
    `Unit system: ${unit}`,
    `Solving for: ${MODES.find((m) => m.id === state.mode).label}`,
    "",
    "Inputs",
    ...required.map((k) => `  ${f[k].label.padEnd(24, " ")} ${(state[k] || "—")} ${f[k].unit}`),
    "",
    `Result: ${fmt(value)} ${f[state.mode].unit}` + (path ? `  (via ${path})` : ""),
  ].join("\n");
}
