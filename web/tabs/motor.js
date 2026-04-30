// Motor tab — solver with 6 modes (Flow rate, Pressure, Displacement,
// Speed, Torque, Power). Implemented as a forward calculator: pick a
// target variable and the rest become inputs.

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

// Inputs needed per solve mode.
const MODE_INPUTS = {
  flow:         ["displacement", "speed", "eta_v"],
  pressure:     ["torque", "displacement", "eta_m"],
  displacement: ["flow", "speed", "eta_v"],
  speed:        ["flow", "displacement", "eta_v"],
  torque:       ["pressure", "displacement", "eta_m"],
  power:        ["torque", "speed"],
};

export function renderMotor(host, { unit }) {
  const state = loadState();

  host.appendChild(buildHero({
    eyebrow: "02 · Motor",
    title: "Hydraulic motor sizing",
    lede:
      "Pick the variable you want to solve for; the rest become inputs. Useful for checking whether a candidate motor can deliver the speed and torque the application asks for.",
    art: illustrations.motor,
  }));

  // Mode picker --------------------------------------------
  const grid = document.createElement("div");
  grid.className = "calc";
  host.appendChild(grid);

  const inputsCard = card("Inputs");
  const resultsCard = card("Results");

  // Mode picker sits on the inputs card header
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

  // Formula reveal -----------------------------------------
  const formula = document.createElement("section");
  formula.className = "formula";
  host.appendChild(formula);

  // Actions ------------------------------------------------
  const actEl = actionsBar({
    onCopy: (e) => copyToClipboard(serialize(state, unit), e.currentTarget),
    onReset: () => {
      Object.keys(state).forEach((k) => k !== "mode" && (state[k] = ""));
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
    const result = solve(state, unit);
    const targetDef = f[state.mode === "flow" ? "flow" : state.mode];
    resultsCard.body.innerHTML = `
      <div class="row">
        <label class="row__label">
          ${targetDef.label}
          <span class="row__hint">Result of the selected calculation</span>
        </label>
        <input class="row__output" disabled value="${fmt(result)}" />
        <span class="row__unit">${targetDef.unit}</span>
      </div>
    `;
    formula.innerHTML = `
      <details ${state.mode === "flow" ? "open" : ""}>
        <summary>Show formula</summary>${formulaText(state.mode, unit)}</details>
    `;
  }
}

function solve(s, unit) {
  const V  = +s.displacement || 0;
  const N  = +s.speed || 0;
  const ev = (+s.eta_v || 0) / 100;
  const em = (+s.eta_m || 0) / 100;
  const P  = +s.pressure || 0;
  const Q  = +s.flow || 0;
  const T  = +s.torque || 0;
  const Pw = +s.power || 0;

  if (unit === "metric") {
    switch (s.mode) {
      // Flow lpm = V cm³/rev × N rpm × ev / 1000
      case "flow":         return ev > 0 ? (V * N * ev) / 1000 : null;
      // Pressure bar from torque (N·m), displacement (cm³/rev), eta_m
      // T = (V × P × em) / (20·π)  →  P = (20·π·T) / (V·em)
      case "pressure":     return V > 0 && em > 0 ? (20 * Math.PI * T) / (V * em) : null;
      case "displacement": return N > 0 && ev > 0 ? (Q * 1000) / (N * ev) : null;
      case "speed":        return V > 0 && ev > 0 ? (Q * 1000) / (V * ev) : null;
      // Torque N·m = (V × P × em) / (20·π)
      case "torque":       return V > 0 ? (V * P * em) / (20 * Math.PI) : null;
      // Power kW = T·N·2π / 60000
      case "power":        return (T * N * 2 * Math.PI) / 60000;
    }
  } else {
    switch (s.mode) {
      // Flow gpm = (V in³/rev × N rpm × ev) / 231
      case "flow":         return ev > 0 ? (V * N * ev) / 231 : null;
      // Torque lbf·in = (V × P × em) / (2·π)  →  P = (2·π·T) / (V·em)
      case "pressure":     return V > 0 && em > 0 ? (2 * Math.PI * T) / (V * em) : null;
      case "displacement": return N > 0 && ev > 0 ? (Q * 231) / (N * ev) : null;
      case "speed":        return V > 0 && ev > 0 ? (Q * 231) / (V * ev) : null;
      case "torque":       return V > 0 ? (V * P * em) / (2 * Math.PI) : null;
      // Power hp = T·N / 63025
      case "power":        return (T * N) / 63025;
    }
  }
  return null;
}

function formulaText(mode, unit) {
  const M = unit === "metric";
  const t = {
    flow:         M ? "Q = (V · N · ηv) / 1000        [lpm = cm³/rev · rpm · η ÷ 1000]"
                    : "Q = (V · N · ηv) / 231         [gpm = in³/rev · rpm · η ÷ 231]",
    pressure:     M ? "P = (20π · T) / (V · ηm)       [bar = N·m / cm³/rev]"
                    : "P = (2π · T) / (V · ηm)        [psi = lbf·in / in³/rev]",
    displacement: M ? "V = (Q · 1000) / (N · ηv)      [cm³/rev]"
                    : "V = (Q · 231) / (N · ηv)       [in³/rev]",
    speed:        M ? "N = (Q · 1000) / (V · ηv)      [rpm]"
                    : "N = (Q · 231)  / (V · ηv)      [rpm]",
    torque:       M ? "T = (V · P · ηm) / (20π)       [N·m]"
                    : "T = (V · P · ηm) / (2π)        [lbf·in]",
    power:        M ? "Pw = T · N · 2π / 60 000        [kW]"
                    : "Pw = T · N / 63 025             [hp]",
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

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { mode: "flow", displacement: "", speed: "", eta_v: "", eta_m: "", pressure: "", flow: "", torque: "", power: "", ...JSON.parse(raw) };
  } catch {}
  return { mode: "flow", displacement: "", speed: "", eta_v: "", eta_m: "", pressure: "", flow: "", torque: "", power: "" };
}

function saveState(s) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

function serialize(state, unit) {
  const f = FIELDS[unit];
  const result = solve(state, unit);
  const required = MODE_INPUTS[state.mode];
  const lines = [
    "Hydraulic motor — Trelleborg-equivalent results",
    `Unit system: ${unit}`,
    `Solving for: ${MODES.find((m) => m.id === state.mode).label}`,
    "",
    "Inputs",
    ...required.map((k) => `  ${f[k].label.padEnd(22, " ")} ${(state[k] || "—")} ${f[k].unit}`),
    "",
    `Result: ${fmt(result)} ${f[state.mode === "flow" ? "flow" : state.mode].unit}`,
  ];
  return lines.join("\n");
}
