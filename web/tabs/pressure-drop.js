// Pressure Drop tab — orifice equation. Single-mode (no Calculate
// selector); given Q, d, K and Sg, solve for ΔP.

import { illustrations } from "../illustrations.js";
import { fmt } from "../format.js";
import { actionsBar, copyToClipboard, emailLink } from "../actions.js";

const STORAGE_KEY = "hsc.pressure-drop.inputs";

const PRESETS = {
  metric:   { flow: "40", diameter: "8",   K: "0.7", Sg: "0.87" },
  imperial: { flow: "10", diameter: "0.3", K: "0.7", Sg: "0.87" },
};

const FIELDS = {
  metric: {
    flow:    { label: "Flow rate",                   unit: "lpm" },
    diameter:{ label: "Orifice diameter",            unit: "mm" },
    K:       { label: "Orifice flow coefficient",    unit: "" },
    Sg:      { label: "Specific gravity of fluid",   unit: "" },
    dp:      { label: "Pressure drop",               unit: "kPa" },
  },
  imperial: {
    flow:    { label: "Flow rate",                   unit: "gpm" },
    diameter:{ label: "Orifice diameter",            unit: "in" },
    K:       { label: "Orifice flow coefficient",    unit: "" },
    Sg:      { label: "Specific gravity of fluid",   unit: "" },
    dp:      { label: "Pressure drop",               unit: "psi" },
  },
};

export function renderPressureDrop(host, { unit }) {
  const state = loadState(unit);

  const hero = buildHero({
    eyebrow: "04 · Pressure Drop",
    title: "Orifice pressure drop",
    lede:
      "Estimate ΔP across a sharp-edged orifice from the upstream flow rate and orifice geometry. Useful for sizing flow-control valves and metering plates.",
    art: illustrations.orifice,
  });
  host.appendChild(hero);
  const heroArt = hero.querySelector(".hero__art");

  const grid = document.createElement("div");
  grid.className = "calc";
  host.appendChild(grid);

  const inputsCard = card("Inputs");
  ["flow", "diameter", "K", "Sg"].forEach((key) => {
    const def = FIELDS[unit][key];
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <label class="row__label" for="pd-${key}">${def.label}</label>
      <input id="pd-${key}" class="row__input" type="number" inputmode="decimal" step="any" min="0" placeholder="0" value="${state[key] ?? ""}" />
      <span class="row__unit">${def.unit}</span>
    `;
    row.querySelector("input").addEventListener("input", (e) => {
      state[key] = e.target.value;
      saveState(state);
      paint();
    });
    inputsCard.body.appendChild(row);
  });
  grid.appendChild(inputsCard.el);

  const resultsCard = card("Results");
  grid.appendChild(resultsCard.el);

  const formula = document.createElement("section");
  formula.className = "formula";
  formula.innerHTML = `
    <details open>
      <summary>Show formula</summary>${formulaText(unit)}</details>
  `;
  host.appendChild(formula);

  const actEl = actionsBar({
    onCopy: (e) => copyToClipboard(serialize(state, unit), e.currentTarget),
    onReset: () => {
      Object.keys(state).forEach((k) => (state[k] = ""));
      saveState(state);
      inputsCard.body.querySelectorAll(".row__input").forEach((el) => (el.value = ""));
      paint();
    },
    onPreset: () => {
      Object.assign(state, PRESETS[unit]);
      saveState(state);
      inputsCard.body.querySelectorAll(".row__input").forEach((el) => {
        const key = el.id.replace("pd-", "");
        el.value = state[key] ?? "";
      });
      paint();
    },
    onEmail: () => {
      const url = emailLink("Orifice pressure drop — results", serialize(state, unit));
      window.location.href = url;
    },
  });
  resultsCard.el.appendChild(actEl);

  paint();

  function paint() {
    const dp = solve(state, unit);
    const def = FIELDS[unit].dp;
    const display = fmt(dp);
    const isBlank = display === "—";
    resultsCard.body.innerHTML = `
      <div class="result-hero">
        <div class="result-hero__value${isBlank ? " result-hero__value--blank" : ""}">
          ${display}<span class="result-hero__unit">${def.unit}</span>
        </div>
        <div class="result-hero__label">${def.label}</div>
        <div class="result-hero__hint">ΔP across the orifice</div>
      </div>
    `;
    // Animate orifice flow proportional to Q. Normalise to a friendly cycle window.
    const Q = +state.flow || 0;
    const refQ = unit === "imperial" ? 10 : 40; // preset values yield 1.0s
    const cycleS = Q > 0 ? Math.max(0.25, Math.min(3, refQ / Q)) : 2;
    heroArt.style.setProperty("--flow-s", `${cycleS}s`);
  }
}

function solve(s, unit) {
  const Q = +s.flow || 0;
  const d = +s.diameter || 0;
  const K = +s.K || 0;
  const Sg = +s.Sg || 0;
  if (Q <= 0 || d <= 0 || K <= 0 || Sg <= 0) return null;

  if (unit === "imperial") {
    // Trelleborg constant 9.525 — Q gpm, d in, ΔP psi.
    const denom = 9.525 * Math.PI * K * d * d;
    return Math.pow(Q / denom, 2) * Sg;
  }
  // Metric: do it in SI then convert.
  // Q lpm → m³/s : /60 000
  const Q_si = Q / 60000;
  const A_si = (Math.PI * Math.pow(d / 1000, 2)) / 4; // m²
  const rho = Sg * 1000; // kg/m³
  // ΔP_Pa = ρ/2 · (Q/(K·A))²
  const dp_Pa = (rho / 2) * Math.pow(Q_si / (K * A_si), 2);
  return dp_Pa / 1000; // kPa
}

function formulaText(unit) {
  if (unit === "imperial") {
    return "ΔP = [ Q / (9.525 · π · K · d²) ]² · Sg     [psi, Q gpm, d in]";
  }
  return "ΔP = (ρ/2) · ( Q / (K · A) )²                  [Pa]\nρ = 1000 · Sg     A = π · d² / 4     ΔP shown in kPa";
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
    if (raw) return { flow: "", diameter: "", K: "", Sg: "", ...JSON.parse(raw) };
  } catch {}
  return { ...PRESETS[unit] };
}

function saveState(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

function serialize(state, unit) {
  const f = FIELDS[unit];
  const dp = solve(state, unit);
  return [
    "Orifice pressure drop — Trelleborg-equivalent results",
    `Unit system: ${unit}`,
    "",
    "Inputs",
    `  ${f.flow.label.padEnd(28)} ${state.flow || "—"} ${f.flow.unit}`,
    `  ${f.diameter.label.padEnd(28)} ${state.diameter || "—"} ${f.diameter.unit}`,
    `  ${f.K.label.padEnd(28)} ${state.K || "—"}`,
    `  ${f.Sg.label.padEnd(28)} ${state.Sg || "—"}`,
    "",
    `Pressure drop: ${fmt(dp)} ${f.dp.unit}`,
  ].join("\n");
}
