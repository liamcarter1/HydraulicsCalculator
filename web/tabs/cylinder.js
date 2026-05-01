// Cylinder tab — bore/rod side area, volume, force, time, velocity,
// outflow and ratio. Forward-only solver: top inputs drive everything.

import { illustrations } from "../illustrations.js";
import { compute, units } from "../calc/cylinder.js";
import { fmt } from "../format.js";
import { actionsBar, copyToClipboard, emailLink } from "../actions.js";
import { icons } from "../icons.js";

const STORAGE_KEY = "hsc.cylinder.inputs";

const PRESETS = {
  metric:   { bore: "80", rod: "40",  stroke: "200", pressure: "200",  flow: "20" },
  imperial: { bore: "3",  rod: "1.5", stroke: "8",   pressure: "2900", flow: "5"  },
};

const inputDefs = [
  { key: "bore",     label: "Piston / Bore Diameter" },
  { key: "rod",      label: "Rod Diameter" },
  { key: "stroke",   label: "Stroke" },
  { key: "pressure", label: "Pressure" },
  { key: "flow",     label: "Oil Flow", hint: "Inlet flow rate driving the cylinder" },
];

const resultRows = [
  { key: "area",     label: "Area" },
  { key: "volume",   label: "Volume" },
  { key: "force",    label: "Force",    hint: "P × A on each side" },
  { key: "time",     label: "Time",     hint: "Volume ÷ flow rate" },
  { key: "velocity", label: "Velocity" },
  { key: "outflow",  label: "Outflow",  hint: "Opposite-port flow" },
];

export function renderCylinder(host, { unit }) {
  const u = units[unit];
  const state = loadState(unit);

  // Hero ----------------------------------------------------
  const hero = buildHero({
    eyebrow: "01 · Cylinder",
    title: "Hydraulic cylinder design",
    lede:
      "Size a single-rod cylinder around its bore, rod and stroke. Bore and rod sides are computed in parallel, so you can compare extend-stroke against retract-stroke at a glance.",
    art: illustrations.cylinder,
  });
  host.appendChild(hero);
  const heroArt = hero.querySelector(".hero__art");

  // Calculator grid ----------------------------------------
  const grid = document.createElement("div");
  grid.className = "calc";
  host.appendChild(grid);

  // Inputs card --------------------------------------------
  const inputsCard = card("Inputs");
  inputDefs.forEach((def) => {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <label class="row__label" for="cyl-${def.key}">
        ${def.label}
        ${def.hint ? `<span class="row__hint">${def.hint}</span>` : ""}
      </label>
      <input
        id="cyl-${def.key}"
        class="row__input"
        type="number"
        inputmode="decimal"
        step="any"
        min="0"
        placeholder="0"
        value="${state[def.key] ?? ""}"
      />
      <span class="row__unit">${u[def.key]}</span>
    `;
    inputsCard.body.appendChild(row);
  });
  grid.appendChild(inputsCard.el);

  // Results card -------------------------------------------
  const resultsCard = card("Results");
  // Header row with Bore / Rod column titles
  const head = document.createElement("div");
  head.className = "row row--dual row--header";
  head.innerHTML = `
    <span class="row__label" style="color:var(--color-ink-3);font-size:11px;letter-spacing:.1em;text-transform:uppercase;">Quantity</span>
    <span class="row__col-hd">Bore Side</span>
    <span class="row__col-hd">Rod Side</span>
    <span class="row__unit"></span>
  `;
  resultsCard.body.appendChild(head);

  resultRows.forEach((def) => {
    const row = document.createElement("div");
    row.className = "row row--dual";
    row.innerHTML = `
      <label class="row__label">
        ${def.label}
        ${def.hint ? `<span class="row__hint">${def.hint}</span>` : ""}
      </label>
      <input class="row__output" data-side="bore" data-key="${def.key}" disabled value="—" />
      <input class="row__output" data-side="rod"  data-key="${def.key}" disabled value="—" />
      <span class="row__unit">${u[def.key]}</span>
    `;
    resultsCard.body.appendChild(row);
  });

  // Single-value Ratio row spans both columns
  const ratioRow = document.createElement("div");
  ratioRow.className = "row row--dual";
  ratioRow.innerHTML = `
    <label class="row__label">
      Area ratio
      <span class="row__hint">A_bore ÷ A_rod</span>
    </label>
    <span></span>
    <input class="row__output" data-key="ratio" disabled value="—" />
    <span class="row__unit">:1</span>
  `;
  resultsCard.body.appendChild(ratioRow);

  grid.appendChild(resultsCard.el);

  // Formula reveal -----------------------------------------
  const formula = document.createElement("section");
  formula.className = "formula";
  formula.innerHTML = `
    <details open>
      <summary>Show formulas</summary>
A_bore = π · R²                A_rod = A_bore − π · r²
V       = A · L                F      = P · A
T       = V ÷ FR               v      = L ÷ T
Outflow_bore = FR ÷ Z          Outflow_rod  = FR · Z
Z (ratio) = A_bore ÷ A_rod
    </details>
  `;
  host.appendChild(formula);

  // Actions ------------------------------------------------
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
        const key = el.id.replace("cyl-", "");
        el.value = state[key] ?? "";
      });
      paint();
    },
    onEmail: () => {
      const url = emailLink("Hydraulic cylinder design — results", serialize(state, unit));
      window.location.href = url;
    },
  });
  resultsCard.el.appendChild(actEl);

  // Wire inputs -------------------------------------------
  inputsCard.body.querySelectorAll(".row__input").forEach((input) => {
    input.addEventListener("input", () => {
      const key = input.id.replace("cyl-", "");
      state[key] = input.value;
      saveState(state);
      paint();
    });
  });

  function paint() {
    const r = compute({ unit, ...state });
    resultsCard.body.querySelectorAll(".row__output[data-side]").forEach((cell) => {
      const side = cell.dataset.side;
      const key = cell.dataset.key;
      cell.value = fmt(r[side][key]);
    });
    const ratioCell = resultsCard.body.querySelector('.row__output[data-key="ratio"]');
    ratioCell.value = r.ratio == null ? "—" : `${fmt(r.ratio)} : 1`.replace(" : 1", "");
    if (r.ratio != null) ratioCell.value = `${fmt(r.ratio)}`;
    // Drive rod animation: full cycle (extend+retract) takes 2× the bore-fill time,
    // clamped to a visible range so very fast or very slow strokes still read.
    const t = r.bore?.time;
    const cycleS = t > 0 ? Math.max(0.8, Math.min(6, 2 * t)) : 3;
    heroArt.style.setProperty("--cycle-s", `${cycleS}s`);
  }

  paint();
}

// ---------- helpers ---------------------------------------

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
    if (raw) return { bore: "", rod: "", stroke: "", pressure: "", flow: "", ...JSON.parse(raw) };
  } catch {}
  return { ...PRESETS[unit] };
}

function saveState(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
}

function serialize(state, unit) {
  const u = units[unit];
  const r = compute({ unit, ...state });
  const lines = [
    "Hydraulic cylinder — Trelleborg-equivalent results",
    `Unit system: ${unit}`,
    "",
    "Inputs",
    `  Bore Ø:    ${state.bore || "—"} ${u.bore}`,
    `  Rod  Ø:    ${state.rod || "—"} ${u.rod}`,
    `  Stroke:    ${state.stroke || "—"} ${u.stroke}`,
    `  Pressure:  ${state.pressure || "—"} ${u.pressure}`,
    `  Oil flow:  ${state.flow || "—"} ${u.flow}`,
    "",
    "Results                Bore           Rod",
    `  Area     ${pad(fmt(r.bore.area))} ${pad(fmt(r.rod.area))} ${u.area}`,
    `  Volume   ${pad(fmt(r.bore.volume))} ${pad(fmt(r.rod.volume))} ${u.volume}`,
    `  Force    ${pad(fmt(r.bore.force))} ${pad(fmt(r.rod.force))} ${u.force}`,
    `  Time     ${pad(fmt(r.bore.time))} ${pad(fmt(r.rod.time))} ${u.time}`,
    `  Velocity ${pad(fmt(r.bore.velocity))} ${pad(fmt(r.rod.velocity))} ${u.velocity}`,
    `  Outflow  ${pad(fmt(r.bore.outflow))} ${pad(fmt(r.rod.outflow))} ${u.outflow}`,
    `  Ratio    ${pad(fmt(r.ratio))}`,
  ];
  return lines.join("\n");
}

function pad(s) { return String(s).padEnd(12, " "); }
