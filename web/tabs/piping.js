// Piping tab — pipe velocity, cross-sectional area, Reynolds number.
// Two modes: viscosity supplied as absolute (cP) or kinematic (cSt).

import { illustrations } from "../illustrations.js";
import { fmt } from "../format.js";
import { actionsBar, copyToClipboard, emailLink } from "../actions.js";

const STORAGE_KEY = "hsc.piping.inputs";

const MODES = [
  { id: "absolute",  label: "Using absolute viscosity" },
  { id: "kinematic", label: "Using kinematic viscosity" },
];

const FIELDS = {
  metric: {
    flow:     { label: "Flow rate",          unit: "lpm" },
    diameter: { label: "Inside pipe diameter", unit: "mm" },
    Sg:       { label: "Specific gravity",   unit: "" },
    mu:       { label: "Absolute viscosity", unit: "cP" },
    nu:       { label: "Kinematic viscosity",unit: "cSt" },
    area:     { label: "Cross-sectional area", unit: "mm²" },
    v:        { label: "Velocity",           unit: "m/s" },
    Re:       { label: "Reynolds number",    unit: "" },
  },
  imperial: {
    flow:     { label: "Flow rate",          unit: "gpm" },
    diameter: { label: "Inside pipe diameter", unit: "in" },
    Sg:       { label: "Specific gravity",   unit: "" },
    mu:       { label: "Absolute viscosity", unit: "cP" },
    nu:       { label: "Kinematic viscosity",unit: "cSt" },
    area:     { label: "Cross-sectional area", unit: "in²" },
    v:        { label: "Velocity",           unit: "ft/s" },
    Re:       { label: "Reynolds number",    unit: "" },
  },
};

export function renderPiping(host, { unit }) {
  const state = loadState();

  host.appendChild(buildHero({
    eyebrow: "05 · Piping",
    title: "Pipe sizing & flow regime",
    lede:
      "Check that flow stays in the laminar / transitional / turbulent regime you expect. Reynolds № tells you which side of ~2300 you're on; velocity tells you whether your fluid is whistling.",
    art: illustrations.pipe,
  }));

  const grid = document.createElement("div");
  grid.className = "calc";
  host.appendChild(grid);

  const inputsCard = card("Inputs");
  const resultsCard = card("Results");

  const picker = document.createElement("span");
  picker.className = "mode-picker";
  picker.innerHTML = `
    <span style="color:var(--color-ink-3);font-size:11px;letter-spacing:.1em;text-transform:uppercase;">Calculate</span>
    <select aria-label="Viscosity input">
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
  formula.innerHTML = `
    <details open>
      <summary>Show formulas</summary>${formulaText(unit)}</details>
  `;
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
      const url = emailLink("Pipe sizing — results", serialize(state, unit));
      window.location.href = url;
    },
  });
  resultsCard.el.appendChild(actEl);

  rebuildInputs();
  paint();

  function rebuildInputs() {
    const f = FIELDS[unit];
    const required = state.mode === "absolute"
      ? ["flow", "diameter", "Sg", "mu"]
      : ["flow", "diameter", "nu"];
    inputsCard.body.innerHTML = "";
    required.forEach((key) => {
      const def = f[key];
      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML = `
        <label class="row__label" for="pipe-${key}">${def.label}</label>
        <input id="pipe-${key}" class="row__input" type="number" inputmode="decimal" step="any" min="0" placeholder="0" value="${state[key] ?? ""}" />
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
    const r = solve(state, unit);
    resultsCard.body.innerHTML = `
      ${resultRow(f.area, r.area)}
      ${resultRow(f.v, r.v)}
      ${resultRow(f.Re, r.Re, regimeHint(r.Re))}
    `;
  }
}

function resultRow(def, value, hint) {
  return `
    <div class="row">
      <label class="row__label">
        ${def.label}
        ${hint ? `<span class="row__hint">${hint}</span>` : ""}
      </label>
      <input class="row__output" disabled value="${fmt(value)}" />
      <span class="row__unit">${def.unit}</span>
    </div>
  `;
}

function regimeHint(Re) {
  if (Re == null) return "";
  if (Re < 2300) return "Laminar (Re < 2300)";
  if (Re < 4000) return "Transitional (2300 ≤ Re < 4000)";
  return "Turbulent (Re ≥ 4000)";
}

function solve(s, unit) {
  const Q = +s.flow || 0;
  const d = +s.diameter || 0;
  const Sg = +s.Sg || 0;
  const mu = +s.mu || 0;
  const nu = +s.nu || 0;
  const out = { area: null, v: null, Re: null };
  if (Q <= 0 || d <= 0) return out;

  if (unit === "imperial") {
    // Trelleborg uses: A = π·d²/4 (in²); v = Q/A then unit shuffle to ft/s;
    // Re = 7740·v·d·Sg/μ  (v ft/s, d in, μ cP)
    const A = (Math.PI * d * d) / 4; // in²
    out.area = A;
    // Q (gpm) → in³/s = Q · 231/60; velocity = (in³/s) / (in²) = in/s; ÷12 → ft/s
    const v_in_s = (Q * 231) / 60 / A;
    out.v = v_in_s / 12; // ft/s
    if (s.mode === "absolute" && Sg > 0 && mu > 0) {
      out.Re = (7740 * out.v * d * Sg) / mu;
    } else if (s.mode === "kinematic" && nu > 0) {
      // Equivalent: Re = 7740·v·d / (ν·Sg) ... but with kinematic ν the Sg cancels:
      // ν = μ/ρ → μ = ν·ρ → 7740·v·d·Sg/μ = 7740·v·d/ν     (since μ = ν·Sg in cP/cSt with water reference)
      out.Re = (7740 * out.v * d) / nu;
    }
  } else {
    // Metric: A mm², v m/s, Re dimensionless.
    const A = (Math.PI * d * d) / 4; // mm²
    out.area = A;
    // Q (lpm) → m³/s = Q / 60000; A (mm² → m²) ÷10⁶
    const A_m2 = A / 1e6;
    out.v = (Q / 60000) / A_m2; // m/s
    if (s.mode === "absolute" && Sg > 0 && mu > 0) {
      // Re = 1000 · v · d · Sg / μ   (v m/s, d mm, μ cP)
      out.Re = (1000 * out.v * d * Sg) / mu;
    } else if (s.mode === "kinematic" && nu > 0) {
      // Re = 1000 · v · d / ν  (v m/s, d mm, ν cSt)
      out.Re = (1000 * out.v * d) / nu;
    }
  }
  return out;
}

function formulaText(unit) {
  if (unit === "imperial") {
    return [
      "A  = π · d² / 4                                [in²]",
      "v  = (Q · 231) / 60 / A / 12                   [ft/s,  Q gpm, d in]",
      "Re_abs  = 7740 · v · d · Sg / μ                [v ft/s, d in, μ cP]",
      "Re_kin  = 7740 · v · d / ν                     [ν cSt]",
    ].join("\n");
  }
  return [
    "A  = π · d² / 4                                  [mm²]",
    "v  = Q / (A · 60)        with Q lpm, A in m²    [m/s]",
    "Re_abs  = 1000 · v · d · Sg / μ                  [v m/s, d mm, μ cP]",
    "Re_kin  = 1000 · v · d / ν                       [ν cSt]",
  ].join("\n");
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
    if (raw) return { mode: "absolute", flow: "", diameter: "", Sg: "", mu: "", nu: "", ...JSON.parse(raw) };
  } catch {}
  return { mode: "absolute", flow: "", diameter: "", Sg: "", mu: "", nu: "" };
}

function saveState(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

function serialize(state, unit) {
  const f = FIELDS[unit];
  const r = solve(state, unit);
  return [
    "Pipe sizing — Trelleborg-equivalent results",
    `Unit system: ${unit}`,
    `Mode: ${MODES.find((m) => m.id === state.mode).label}`,
    "",
    "Inputs",
    `  ${f.flow.label.padEnd(28)} ${state.flow || "—"} ${f.flow.unit}`,
    `  ${f.diameter.label.padEnd(28)} ${state.diameter || "—"} ${f.diameter.unit}`,
    state.mode === "absolute"
      ? `  ${f.Sg.label.padEnd(28)} ${state.Sg || "—"}\n  ${f.mu.label.padEnd(28)} ${state.mu || "—"} ${f.mu.unit}`
      : `  ${f.nu.label.padEnd(28)} ${state.nu || "—"} ${f.nu.unit}`,
    "",
    "Results",
    `  ${f.area.label.padEnd(28)} ${fmt(r.area)} ${f.area.unit}`,
    `  ${f.v.label.padEnd(28)} ${fmt(r.v)} ${f.v.unit}`,
    `  ${f.Re.label.padEnd(28)} ${fmt(r.Re)} ${regimeHint(r.Re)}`,
  ].join("\n");
}
