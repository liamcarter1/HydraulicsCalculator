// Pump tab — solver with 4 modes: Flow rate, Displacement,
// Electric motor power, Total efficiency.

import { illustrations } from "../illustrations.js";
import { fmt } from "../format.js";
import { actionsBar, copyToClipboard, emailLink } from "../actions.js";

const STORAGE_KEY = "hsc.pump.inputs";

const MODES = [
  { id: "flow",         label: "Flow rate" },
  { id: "displacement", label: "Displacement" },
  { id: "power",        label: "Electric motor power" },
  { id: "eta_t",        label: "Total efficiency" },
];

const FIELDS = {
  metric: {
    displacement: { label: "Displacement",          unit: "cm³/rev" },
    speed:        { label: "Speed",                 unit: "rpm" },
    eta_v:        { label: "Volumetric efficiency", unit: "%" },
    eta_t:        { label: "Total efficiency",      unit: "%" },
    pressure:     { label: "Pressure",              unit: "bar" },
    flow:         { label: "Flow rate",             unit: "lpm" },
    power:        { label: "Electric motor power",  unit: "kW" },
  },
  imperial: {
    displacement: { label: "Displacement",          unit: "in³/rev" },
    speed:        { label: "Speed",                 unit: "rpm" },
    eta_v:        { label: "Volumetric efficiency", unit: "%" },
    eta_t:        { label: "Total efficiency",      unit: "%" },
    pressure:     { label: "Pressure",              unit: "psi" },
    flow:         { label: "Flow rate",             unit: "gpm" },
    power:        { label: "Electric motor power",  unit: "hp" },
  },
};

const MODE_INPUTS = {
  flow:         ["displacement", "speed", "eta_v"],
  displacement: ["flow", "speed", "eta_v"],
  power:        ["flow", "pressure", "eta_t"],
  eta_t:        ["flow", "pressure", "power"],
};

// Metric: V=28, N=1500, ηv=95% → Q = 28·1500·0.95/1000 = 39.9 lpm
//   At P=200 bar, ηt=85%: Pw = 39.9·200/(600·0.85) = 15.65 kW
const PRESETS = {
  metric:   { displacement: "28",  speed: "1500", eta_v: "95", eta_t: "85", pressure: "200",  flow: "39.9",  power: "15.65" },
  imperial: { displacement: "1.7", speed: "1500", eta_v: "95", eta_t: "85", pressure: "2900", flow: "10.49", power: "20.91" },
};

export function renderPump(host, { unit }) {
  const state = loadState(unit);

  const hero = buildHero({
    eyebrow: "03 · Pump",
    title: "Hydraulic pump sizing",
    lede:
      "Match a pump's displacement and prime-mover power to a target flow rate. Switch to ‘Total efficiency’ to back-check a candidate setup against measured input power.",
    art: illustrations.pump,
  });
  host.appendChild(hero);
  const heroArt = hero.querySelector(".hero__art");
  const speedCaption = document.createElement("div");
  speedCaption.className = "hero__art-caption";
  speedCaption.textContent = "Gears visualised slower than actual speed";
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
    onEmail: () => {
      const url = emailLink("Hydraulic pump sizing — results", serialize(state, unit));
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
        <label class="row__label" for="pump-${key}">${def.label}</label>
        <input id="pump-${key}" class="row__input" type="number" inputmode="decimal" step="any" min="0" placeholder="0" value="${state[key] ?? ""}" />
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
    const targetDef = f[state.mode];
    const display = fmt(result);
    const isBlank = display === "—";
    resultsCard.body.innerHTML = `
      <div class="result-hero">
        <div class="result-hero__value${isBlank ? " result-hero__value--blank" : ""}">
          ${display}<span class="result-hero__unit">${targetDef.unit}</span>
        </div>
        <div class="result-hero__label">${targetDef.label}</div>
        <div class="result-hero__hint">Result of the selected calculation</div>
      </div>
    `;
    formula.innerHTML = `
      <details open>
        <summary>Formula</summary>
        <div class="formula__grid">${formulaItems(state.mode, unit)}</div>
      </details>
    `;
    const rpm = +state.speed || 0;
    const slowness = 25;
    const visibleRpm = rpm / slowness;
    const cycleS = visibleRpm > 0 ? Math.max(0.4, Math.min(4, 60 / visibleRpm)) : 2;
    heroArt.style.setProperty("--rpm-s", `${cycleS}s`);
  }
}

function solve(s, unit) {
  const V  = +s.displacement || 0;
  const N  = +s.speed || 0;
  const ev = (+s.eta_v || 0) / 100;
  const et = (+s.eta_t || 0) / 100;
  const P  = +s.pressure || 0;
  const Q  = +s.flow || 0;
  const Pw = +s.power || 0;

  if (unit === "metric") {
    switch (s.mode) {
      // Q (lpm) = V·N·ev / 1000
      case "flow":         return ev > 0 ? (V * N * ev) / 1000 : null;
      case "displacement": return N > 0 && ev > 0 ? (Q * 1000) / (N * ev) : null;
      // Pw (kW) = Q (lpm) · P (bar) / (600 · et)
      case "power":        return et > 0 ? (Q * P) / (600 * et) : null;
      // et = Q·P / (600·Pw) → return as percent
      case "eta_t":        return Pw > 0 ? ((Q * P) / (600 * Pw)) * 100 : null;
    }
  } else {
    switch (s.mode) {
      // Q (gpm) = V·N·ev / 231
      case "flow":         return ev > 0 ? (V * N * ev) / 231 : null;
      case "displacement": return N > 0 && ev > 0 ? (Q * 231) / (N * ev) : null;
      // Pw (hp) = Q (gpm) · P (psi) / (1714 · et)
      case "power":        return et > 0 ? (Q * P) / (1714 * et) : null;
      case "eta_t":        return Pw > 0 ? ((Q * P) / (1714 * Pw)) * 100 : null;
    }
  }
  return null;
}

function formulaItems(mode, unit) {
  const M = unit === "metric";
  const item = (label, expr, caption) => `
    <div class="formula__item formula__item--span">
      <div class="formula__label">${label}</div>
      <div class="formula__expr">${expr}</div>
      ${caption ? `<div class="formula__caption">${caption}</div>` : ""}
    </div>`;
  const map = {
    flow:         M ? item("Flow rate",            "Q = V · N · ηv ÷ 1000",  "lpm · V cm³/rev · N rpm")
                    : item("Flow rate",            "Q = V · N · ηv ÷ 231",   "gpm · V in³/rev · N rpm"),
    displacement: M ? item("Displacement",         "V = (Q · 1000) ÷ (N · ηv)", "cm³/rev")
                    : item("Displacement",         "V = (Q · 231) ÷ (N · ηv)",  "in³/rev"),
    power:        M ? item("Electric motor power", "Pw = (Q · P) ÷ (600 · ηt)",  "kW · Q lpm · P bar")
                    : item("Electric motor power", "Pw = (Q · P) ÷ (1714 · ηt)", "hp · Q gpm · P psi"),
    eta_t:        M ? item("Total efficiency",     "ηt = (Q · P) ÷ (600 · Pw)",  "fraction × 100%")
                    : item("Total efficiency",     "ηt = (Q · P) ÷ (1714 · Pw)", "fraction × 100%"),
  };
  return map[mode];
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
    if (raw) return { mode: "flow", displacement: "", speed: "", eta_v: "", eta_t: "", pressure: "", flow: "", power: "", ...JSON.parse(raw) };
  } catch {}
  return { mode: "flow", ...PRESETS[unit] };
}

function saveState(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

function serialize(state, unit) {
  const f = FIELDS[unit];
  const result = solve(state, unit);
  const required = MODE_INPUTS[state.mode];
  return [
    "Hydraulic pump — Trelleborg-equivalent results",
    `Unit system: ${unit}`,
    `Solving for: ${MODES.find((m) => m.id === state.mode).label}`,
    "",
    "Inputs",
    ...required.map((k) => `  ${f[k].label.padEnd(24, " ")} ${(state[k] || "—")} ${f[k].unit}`),
    "",
    `Result: ${fmt(result)} ${f[state.mode].unit}`,
  ].join("\n");
}
