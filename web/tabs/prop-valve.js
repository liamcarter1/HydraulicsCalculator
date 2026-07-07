// Proportional Valve tab — sizes a proportional directional valve driving a
// cylinder load the way the industry reference tools do (Moog's method,
// Bosch Rexroth Size & Select): trapezoidal motion profile → per-phase force
// balance and per-land pressure drops → required rated flow → catalogue
// match against the Vickers-by-Danfoss proportional ranges, plus the
// natural-frequency / valve-bandwidth dynamics check.
//
// Pure math lives in ../calc/prop-valve.js; catalogue data (unverified seed
// values for application engineers to confirm) in ../data/valve-catalogue.js.

import { compute, matchValves, units as calcUnits, BETA_DEFAULT } from "../calc/prop-valve.js";
import { CATALOGUE, CATALOGUE_DISCLAIMER } from "../data/valve-catalogue.js";
import { illustrations } from "../illustrations.js";
import { fmt, inchFractionHint } from "../format.js";
import { actionsBar, copyToClipboard, emailLink } from "../actions.js";
import { g, glossaryHTML } from "../glossary.js";

const STORAGE_KEY = "hsc.prop-valve.inputs";

const DIRECTIONS = [
  { id: "extend",  label: "Extend" },
  { id: "retract", label: "Retract" },
];

// Internally consistent demo scenario (φ ≈ 2). Metric lands on
// KBSDG4V-3-40 at ×1.36 margin with f_n ≈ 41 Hz, so the margin and
// bandwidth pills show every state across the catalogue.
const PRESETS = {
  metric: {
    bore: "80", rod: "56", stroke: "500", moveDist: "500",
    deadA: "0.3", deadB: "0.3", mass: "500", extForce: "20", fricForce: "1",
    ps: "210", pt: "2", beta: "14000", vmax: "0.2", ta: "0.15", td: "0.2",
  },
  imperial: {
    bore: "3", rod: "2.125", stroke: "20", moveDist: "20",
    deadA: "20", deadB: "20", mass: "1100", extForce: "4500", fricForce: "225",
    ps: "3000", pt: "30", beta: "175000", vmax: "8", ta: "0.15", td: "0.2",
  },
};

const FIELDS = {
  metric: {
    ps:        { label: "Supply pressure",        unit: "bar" },
    pt:        { label: "Tank pressure",          unit: "bar",  hint: "Return-line back-pressure at the T port" },
    beta:      { label: "Effective bulk modulus", unit: "bar",  hint: `Blank = ${BETA_DEFAULT.metric.toLocaleString("en")} (mineral oil); halve for long hoses` },
    bore:      { label: "Piston / bore diameter", unit: "mm" },
    rod:       { label: "Rod diameter",           unit: "mm" },
    stroke:    { label: "Stroke",                 unit: "mm" },
    deadA:     { label: "Dead volume, cap side",  unit: "l",    hint: "Lines & fittings between valve and cylinder" },
    deadB:     { label: "Dead volume, rod side",  unit: "l" },
    mass:      { label: "Moved mass",             unit: "kg" },
    extForce:  { label: "External load force",    unit: "kN",   hint: "Negative = assists motion", allowNeg: true },
    fricForce: { label: "Friction force",         unit: "kN" },
    moveDist:  { label: "Move distance",          unit: "mm",   hint: "Blank = full stroke" },
    vmax:      { label: "Max velocity",           unit: "m/s" },
    ta:        { label: "Acceleration time",      unit: "s" },
    td:        { label: "Deceleration time",      unit: "s" },
  },
  imperial: {
    ps:        { label: "Supply pressure",        unit: "psi" },
    pt:        { label: "Tank pressure",          unit: "psi",  hint: "Return-line back-pressure at the T port" },
    beta:      { label: "Effective bulk modulus", unit: "psi",  hint: `Blank = ${BETA_DEFAULT.imperial.toLocaleString("en")} (mineral oil); halve for long hoses` },
    bore:      { label: "Piston / bore diameter", unit: "in",   frac: true },
    rod:       { label: "Rod diameter",           unit: "in",   frac: true },
    stroke:    { label: "Stroke",                 unit: "in",   frac: true },
    deadA:     { label: "Dead volume, cap side",  unit: "in³",  hint: "Lines & fittings between valve and cylinder" },
    deadB:     { label: "Dead volume, rod side",  unit: "in³" },
    mass:      { label: "Moved mass",             unit: "lb" },
    extForce:  { label: "External load force",    unit: "lbf",  hint: "Negative = assists motion", allowNeg: true },
    fricForce: { label: "Friction force",         unit: "lbf" },
    moveDist:  { label: "Move distance",          unit: "in",   hint: "Blank = full stroke", frac: true },
    vmax:      { label: "Max velocity",           unit: "in/s" },
    ta:        { label: "Acceleration time",      unit: "s" },
    td:        { label: "Deceleration time",      unit: "s" },
  },
};

const CARD_FIELDS = {
  supply:   ["ps", "pt", "beta"],
  cylinder: ["bore", "rod", "stroke", "deadA", "deadB", "mass", "extForce", "fricForce"],
  motion:   ["moveDist", "vmax", "ta", "td"],
};

export function renderPropValve(host, { unit }) {
  const state = loadState(unit);
  const U = calcUnits[unit];
  const f = FIELDS[unit];

  const hero = buildHero({
    eyebrow: "06 · Proportional Valve",
    title: "Proportional valve sizing",
    lede:
      "Size a proportional directional valve for a cylinder move: the motion profile sets the flows, the force balance sets the pressure drops, and the oil-spring natural frequency checks the dynamics. Matching Vickers by Danfoss valves are ranked below — smallest adequate valve first (Moog ⅓-rule guidance built in).",
    art: illustrations.propValve,
  });
  host.appendChild(hero);
  const heroArt = hero.querySelector(".hero__art");

  const grid = document.createElement("div");
  grid.className = "calc";
  host.appendChild(grid);

  const supplyCard = card("Supply & fluid");
  const cylCard = card("Cylinder & load");
  const motionCard = card("Motion profile");
  const dynCard = card("Load dynamics");
  const phaseCard = card("Motion phases");
  const checksCard = card("Checks & warnings");
  const valveCard = card("Valve recommendation");
  phaseCard.el.classList.add("card--full");
  checksCard.el.classList.add("card--full");
  valveCard.el.classList.add("card--full");

  // Extend / Retract picker in the Motion card header.
  const picker = document.createElement("span");
  picker.className = "mode-picker";
  picker.innerHTML = `
    <span style="color:var(--color-ink-3);font-size:11px;letter-spacing:.1em;text-transform:uppercase;">Direction</span>
    <select aria-label="Stroke direction">
      ${DIRECTIONS.map((m) => `<option value="${m.id}" ${m.id === state.direction ? "selected" : ""}>${m.label}</option>`).join("")}
    </select>
  `;
  motionCard.el.querySelector(".card__header").appendChild(picker);
  picker.querySelector("select").addEventListener("change", (e) => {
    state.direction = e.target.value;
    saveState(state);
    paint();
  });

  [supplyCard, cylCard, motionCard, dynCard, phaseCard, checksCard, valveCard].forEach((c) =>
    grid.appendChild(c.el)
  );

  buildInputs(supplyCard.body, CARD_FIELDS.supply);
  buildInputs(cylCard.body, CARD_FIELDS.cylinder);
  buildInputs(motionCard.body, CARD_FIELDS.motion);

  const formula = document.createElement("section");
  formula.className = "formula";
  formula.innerHTML = `
    <details open>
      <summary>Formulas</summary>
      <div class="formula__grid">${formulaItems(unit)}</div>
      ${glossaryHTML([
        g("psys", U.pressure),
        g("ptank", U.pressure),
        g("pLload", U.pressure),
        g("dpland", U.pressure),
        g("dpN", U.pressure),
        g("Q", U.flow),
        g("QN", U.flow),
        g("A", U.area),
        g("phi"),
        g("F", U.force),
        g("mmass", unit === "metric" ? "kg" : "lb"),
        g("aacc", U.accel),
        g("vvel", U.velocity),
        g("beta_e", U.pressure),
        g("Vdead", U.volume),
        g("kh", U.stiffness),
        g("fn"),
        ...(unit === "imperial" ? [g("gc")] : []),
        g("kconst"),
      ])}
    </details>
  `;
  host.appendChild(formula);

  const actEl = actionsBar({
    onCopy: (e) => copyToClipboard(serialize(state, unit), e.currentTarget),
    onReset: () => {
      Object.keys(state).forEach((k) => k !== "direction" && (state[k] = ""));
      saveState(state);
      grid.querySelectorAll(".row__input").forEach((el) => (el.value = ""));
      paint();
    },
    onEmail: () => {
      const url = emailLink("Proportional valve sizing — results", serialize(state, unit));
      window.location.href = url;
    },
  });
  valveCard.el.appendChild(actEl);

  paint();

  function buildInputs(body, keys) {
    keys.forEach((key) => {
      const def = f[key];
      const row = document.createElement("div");
      row.className = "row";
      const showFrac = unit === "imperial" && def.frac;
      if (showFrac) row.classList.add("row--frac");
      const input = `<input id="pv-${key}" class="row__input" type="number" inputmode="decimal" step="any" ${def.allowNeg ? "" : 'min="0"'} placeholder="0" value="${state[key] ?? ""}" />`;
      row.innerHTML = `
        <label class="row__label" for="pv-${key}">
          ${def.label}
          ${def.hint ? `<span class="row__hint">${def.hint}</span>` : ""}
        </label>
        ${showFrac
          ? `<div class="row__field"><span class="row__frac" data-frac="${key}"></span>${input}</div>`
          : input}
        <span class="row__unit">${def.unit}</span>
      `;
      row.querySelector("input").addEventListener("input", (e) => {
        state[key] = e.target.value;
        saveState(state);
        paint();
      });
      body.appendChild(row);
    });
  }

  function paint() {
    grid.querySelectorAll(".row__frac").forEach((el) => {
      el.textContent = inchFractionHint(state[el.dataset.frac]);
    });

    const res = compute({ ...state, unit });
    const match = matchValves(res, CATALOGUE, unit);

    paintDynamics(res);
    paintPhases(res);
    paintChecks(res, match);
    paintValves(res, match);

    // Spool cycles once per computed move; streams flow with peak velocity.
    const t = res.profile?.tTotal;
    heroArt.style.setProperty("--pv-s", `${t > 0 ? Math.max(0.8, Math.min(4, t)) : 2.6}s`);
    const vSi = res.profile ? (unit === "imperial" ? res.profile.vPeak * 0.0254 : res.profile.vPeak) : 0;
    heroArt.style.setProperty("--flow-s", `${vSi > 0 ? Math.max(0.3, Math.min(3, 0.35 / vSi)) : 1.4}s`);
  }

  function paintDynamics(res) {
    const dyn = res.dynamics;
    const prof = res.profile;
    const fnV = dyn ? dyn.fn : null;
    const display = fmt(fnV, { decimals: 1 });
    const profileDesc = !prof
      ? null
      : prof.type === "triangle"
        ? `Triangular — v<sub>max</sub> not reached (peak ${fmt(prof.vPeak)} ${U.velocity})`
        : prof.type === "const"
          ? "Constant velocity (no ramp times given)"
          : "Trapezoidal (accel · constant · decel)";
    dynCard.body.innerHTML = `
      <div class="result-hero">
        <div class="result-hero__value${display === "—" ? " result-hero__value--blank" : ""}">
          ${display}<span class="result-hero__unit">Hz</span>
        </div>
        <div class="result-hero__label">Load natural frequency f_n</div>
        <div class="result-hero__hint">${dyn ? "oil spring + mass, mid-stroke worst case" : "needs bore, rod, stroke & mass"}</div>
      </div>
      ${outputRow("Hydraulic stiffness k_h", dyn ? dyn.kh : null, U.stiffness)}
      ${outputRow("Recommended valve bandwidth", dyn ? dyn.bwIdeal : null, "Hz", "≥ 3 × f_n for closed-loop authority")}
      ${outputRow("Stopping distance from peak v", prof ? prof.stopDist : null, U.length)}
      ${outputRow("Max achievable acceleration", prof ? prof.aMax : null, U.accel,
        prof && prof.aAccel != null ? `commanded ${fmt(prof.aAccel)} ${U.accel}` : "full supply, no valve drop")}
      ${outputRow("Total move time", prof ? prof.tTotal : null, U.time, profileDesc)}
    `;
  }

  function paintPhases(res) {
    if (!res.phases.length) {
      phaseCard.body.innerHTML = `<div class="warnings"><div class="warning">Enter the cylinder, supply and motion inputs to see the per-phase force balance and valve pressure drops.</div></div>`;
      return;
    }
    const M = unit === "metric";
    const inLand = res.direction === "extend" ? "P→A" : "P→B";
    const outLand = res.direction === "extend" ? "B→T" : "A→T";
    // Required rated flow shown against both catalogue Δp conventions.
    const dpServo = M ? 35 : 508;  // per land: servo rating (70 bar / 1000 psi total)
    const dpProp = M ? 10 : 145;   // per land: industrial proportional rating
    const qn = (p, dpN) => (p.dpIn > 0 ? p.Qin * Math.sqrt(dpN / p.dpIn) : null);

    const rows = res.phases
      .map((p) => {
        const sizing = res.sizing && res.sizing.phaseId === p.id;
        return `
        <tr class="${sizing ? "is-sizing" : ""}">
          <td><span class="cell-label">${p.label}</span>${sizing ? `<span class="cell-sub">sizing point</span>` : ""}</td>
          <td>${fmt(p.a)}</td>
          <td>${fmt(p.Ftot)}</td>
          <td>${fmt(p.pL)}</td>
          <td>${fmt(p.Qin)}</td>
          <td>${fmt(p.Qout)}</td>
          <td>${p.stall ? `<span class="pill pill--bad">stall</span>` : fmt(p.dpIn)}</td>
          <td>${p.stall ? "—" : fmt(p.dpOut)}</td>
          <td>${fmt(qn(p, dpServo))}</td>
          <td>${fmt(qn(p, dpProp))}</td>
        </tr>`;
      })
      .join("");

    const s = res.sizing;
    const sizingLine = s
      ? `Sizing point: <strong>${res.phases.find((p) => p.id === s.phaseId).label}</strong> phase — ` +
        `${fmt(s.Qpeak)} ${U.flow} meter-in with ${fmt(s.dpTotal)} ${U.pressure} across the valve ` +
        `(Moog optimum ≈ ⅓·p_s = ${fmt(s.psThird)} ${U.pressure}).`
      : `No phase can drive the load — see the warnings below.`;

    phaseCard.body.innerHTML = `
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Phase</th>
              <th>a<br>${U.accel}</th>
              <th>F total<br>${U.force}</th>
              <th>p_L<br>${U.pressure}</th>
              <th>Q in<br>${U.flow}</th>
              <th>Q out<br>${U.flow}</th>
              <th>Δp ${inLand}<br>${U.pressure}</th>
              <th>Δp ${outLand}<br>${U.pressure}</th>
              <th>Q_N req<br>@${dpServo} ${U.pressure}/land</th>
              <th>Q_N req<br>@${dpProp} ${U.pressure}/land</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="notice" style="background:var(--color-surface-2);border-color:var(--color-line);color:var(--color-ink-2);">${sizingLine}</div>
    `;
  }

  function paintChecks(res, match) {
    const all = [...res.warnings, ...match.warnings];
    checksCard.body.innerHTML = `
      <div class="warnings">
        ${all.length
          ? all.map((w) => `<div class="warning warning--${w.level}">${w.text}</div>`).join("")
          : `<div class="warning warning--pass">All checks passed — pressure-drop allocation, acceleration, deceleration back-pressure and profile feasibility are within guidance.</div>`}
      </div>
    `;
  }

  function paintValves(res, match) {
    if (!match.rows.length) {
      valveCard.body.innerHTML = `<div class="warnings"><div class="warning">Complete the inputs to match the requirement against the Vickers by Danfoss proportional valve ranges.</div></div>`;
      return;
    }
    const best = match.best;
    const M = unit === "metric";

    const marginPill = (r) =>
      r.margin == null
        ? "—"
        : `<span class="pill pill--${r.marginClass === "ok" ? "ok" : r.marginClass === "marginal" ? "warn" : "bad"}">×${fmt(r.margin, { decimals: 2 })}${r.marginClass === "short" ? " short" : ""}</span>`;
    const bwPill = (r) => {
      const hz = r.valve.bandwidth_hz;
      if (r.bwStatus === "unknown") return hz == null ? `<span class="pill pill--muted">n/a</span>` : `${hz} Hz`;
      const cls = r.bwStatus === "ok" ? "ok" : r.bwStatus === "marginal" ? "warn" : "bad";
      return `<span class="pill pill--${cls}">${hz} Hz ${r.bwStatus}</span>`;
    };

    const rows = match.rows
      .map((r) => {
        const v = r.valve;
        const cls = [
          !r.psOk ? "is-excluded" : "",
          best && v.id === best.valve.id ? "is-best" : "",
        ].join(" ");
        const pMax = M ? v.p_max_bar : v.p_max_psi;
        return `
        <tr class="${cls}">
          <td>
            <span class="cell-label">${v.series} · ${v.code}</span>
            <span class="cell-sub">${v.size} · ${v.performance_class}${v.feedback && v.performance_class !== "feedback" ? " · feedback" : ""}${!r.psOk ? " · excluded: p_max below supply" : ""}</span>
          </td>
          <td>${fmt(r.qRated, { decimals: 1 })} <span class="cell-sub">@ ${fmt(r.dpNland, { decimals: 0 })} ${U.pressure}/land${v.dp_basis === "total" ? ` (${M ? v.dp_ref_bar : v.dp_ref_psi} total)` : ""}</span></td>
          <td>${fmt(r.qReq)}</td>
          <td>${marginPill(r)}</td>
          <td>${bwPill(r)}</td>
          <td>${fmt(pMax, { decimals: 0 })}${!r.pbOk ? ` <span class="pill pill--warn">&lt; decel p_b</span>` : ""}</td>
          <td><a href="${v.datasheet_url}" target="_blank" rel="noopener"><span class="badge-unverified">${v.verified ? "verified" : "unverified"}</span></a></td>
        </tr>`;
      })
      .join("");

    const heroBlock = best
      ? `
        <div class="result-hero">
          <div class="result-hero__value" style="font-size:clamp(26px,3.4vw,38px);">${best.valve.series} · ${best.valve.code}</div>
          <div class="result-hero__label">Recommended valve — flow margin ×${fmt(best.margin, { decimals: 2 })}</div>
          <div class="result-hero__hint">${best.valve.size} · rated ${fmt(best.qRated, { decimals: 1 })} ${U.flow} vs ${fmt(best.qReq)} ${U.flow} required</div>
        </div>`
      : res.sizing
        ? `
        <div class="result-hero">
          <div class="result-hero__value result-hero__value--blank" style="font-size:clamp(26px,3.4vw,38px);">No match</div>
          <div class="result-hero__label">No catalogue valve meets the requirement</div>
          <div class="result-hero__hint">${match.closest ? `closest: ${match.closest.valve.series} · ${match.closest.valve.code} at ×${fmt(match.closest.margin, { decimals: 2 })}` : "see warnings above"}</div>
        </div>`
        : `
        <div class="result-hero">
          <div class="result-hero__value result-hero__value--blank" style="font-size:clamp(26px,3.4vw,38px);">—</div>
          <div class="result-hero__label">Awaiting inputs</div>
        </div>`;

    valveCard.body.innerHTML = `
      ${heroBlock}
      <div class="table-scroll">
        <table class="data-table">
          <thead>
            <tr>
              <th>Valve</th>
              <th>Rated flow ${U.flow}</th>
              <th>Q_N req ${U.flow}</th>
              <th>Margin</th>
              <th>Bandwidth</th>
              <th>p_max ${U.pressure}</th>
              <th>Data</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <div class="notice" style="background:var(--color-surface-2);border-color:var(--color-line);color:var(--color-ink-2);">
        Bandwidth rule applied: the valve's −3 dB bandwidth should exceed the load natural frequency f_n${res.dynamics ? ` (${fmt(res.dynamics.fn, { decimals: 1 })} Hz here)` : ""}, ideally by 3×. Rated flows scale with √(Δp/Δp_N); "total"-basis ratings are halved to a per-land figure before comparison.
      </div>
      <div class="notice">⚠ ${CATALOGUE_DISCLAIMER}</div>
    `;
  }

  function outputRow(label, value, unitLabel, hint) {
    return `
      <div class="row">
        <label class="row__label">
          ${label}
          ${hint ? `<span class="row__hint">${hint}</span>` : ""}
        </label>
        <input class="row__output" disabled value="${fmt(value)}" />
        <span class="row__unit">${unitLabel}</span>
      </div>
    `;
  }
}

// --- Formulas (two honest unit tracks, like every other tab) -------------------

function formulaItems(unit) {
  const M = unit !== "imperial";
  const item = (label, expr, caption) => `
    <div class="formula__item">
      <div class="formula__label">${label}</div>
      <div class="formula__expr">${expr}</div>
      ${caption ? `<div class="formula__caption">${caption}</div>` : ""}
    </div>`;
  return [
    item("Areas",
      M ? "A_a = π·D² ÷ 400 · A_b = A_a − π·d² ÷ 400" : "A_a = π·D² ÷ 4 · A_b = A_a − π·d² ÷ 4",
      M ? "D, d mm → cm²" : "D, d in → in²"),
    item("Area ratio", "φ = A_a ÷ A_b", "extend meter-out = Q ÷ φ"),
    item("Flow",
      M ? "Q = 6 · A · v" : "Q = A · v · 60 ÷ 231",
      M ? "A cm², v m/s → lpm" : "A in², v in/s → gpm"),
    item("Inertial force",
      M ? "F_i = m · a ÷ 1000" : "F_i = m · a ÷ 386.4",
      M ? "kg · m/s² → kN" : "lb · in/s² → lbf (g_c)"),
    item("Load pressure",
      M ? "p_L = 100 · F ÷ A" : "p_L = F ÷ A",
      M ? "F kN, A cm² → bar" : "F lbf, A in² → psi (meter-in side)"),
    item("Land Δp split (extend)",
      M ? "Δp_in = (p_s·A_a − p_t·A_b − 100·F) ÷ (A_a·(1 + 1/φ³))" : "Δp_in = (p_s·A_a − p_t·A_b − F) ÷ (A_a·(1 + 1/φ³))",
      "symmetric spool: Δp_out = Δp_in ÷ φ² (drops share as the flow ratio squared)"),
    item("⅓ rule", "Δp_valve ≈ p_s ÷ 3", "Moog optimum sizing point — guidance, not a hard limit"),
    item("Required rated flow", "Q_N = Q · √(Δp_N ÷ Δp_in)", "Δp_N per land — halve a \"total\"-basis rating first"),
    item("Hydraulic stiffness",
      "k_h = β_e · (A_a² ÷ V_a + A_b² ÷ V_b)",
      M ? "β bar, A cm², V l → N/m · mid-stroke worst case" : "β psi, A in², V in³ → lbf/in · mid-stroke worst case"),
    item("Natural frequency",
      M ? "f_n = √(k_h ÷ m) ÷ 2π" : "f_n = √(k_h · 386.4 ÷ m) ÷ 2π",
      "Hz — valve bandwidth should exceed f_n, ideally 3×"),
    item("Stopping distance",
      M ? "s = 1000 · v² ÷ (2 · a_dec)" : "s = v² ÷ (2 · a_dec)",
      M ? "v m/s → mm" : "v in/s → in"),
    item("Decel intensification (extend)",
      M ? "p_b ≈ (p_s·A_a − 100·F_dec) ÷ A_b" : "p_b ≈ (p_s·A_a − F_dec) ÷ A_b",
      "meter-out braking; tends to φ·p_s as the load term vanishes"),
  ].join("");
}

// --- House-pattern helpers (each tab keeps local copies) ------------------------

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
  const empty = Object.fromEntries(Object.keys(FIELDS.metric).map((k) => [k, ""]));
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { direction: "extend", ...empty, ...JSON.parse(raw) };
  } catch {}
  return { direction: "extend", ...PRESETS[unit] };
}

function saveState(s) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {} }

function serialize(state, unit) {
  const f = FIELDS[unit];
  const U = calcUnits[unit];
  const res = compute({ ...state, unit });
  const match = matchValves(res, CATALOGUE, unit);
  const line = (label, value, u = "") => `  ${label.padEnd(26)} ${value} ${u}`.trimEnd();

  const out = [
    "Proportional valve sizing — cylinder load",
    `Unit system: ${unit}`,
    `Direction: ${state.direction}`,
    "",
    "Inputs",
    ...Object.keys(f).map((k) => line(f[k].label, state[k] || "—", f[k].unit)),
  ];

  if (res.geometry) {
    out.push("", "Cylinder", line("Area cap / rod side", `${fmt(res.geometry.Aa)} / ${fmt(res.geometry.Ab)}`, U.area), line("Area ratio φ", fmt(res.geometry.phi)));
  }
  if (res.dynamics) {
    out.push("", "Dynamics",
      line("Natural frequency f_n", fmt(res.dynamics.fn, { decimals: 1 }), "Hz"),
      line("Hydraulic stiffness", fmt(res.dynamics.kh), U.stiffness),
      line("Recommended bandwidth", `≥ ${fmt(res.dynamics.bwIdeal, { decimals: 1 })}`, "Hz"));
  }
  if (res.phases.length) {
    out.push("", "Phases  (a · F · p_L · Q in · Δp in / Δp out)");
    res.phases.forEach((p) => {
      out.push(line(p.label, p.stall
        ? "STALL — load exceeds available force"
        : `${fmt(p.a)} ${U.accel} · ${fmt(p.Ftot)} ${U.force} · ${fmt(p.pL)} ${U.pressure} · ${fmt(p.Qin)} ${U.flow} · ${fmt(p.dpIn)}/${fmt(p.dpOut)} ${U.pressure}`));
    });
  }
  if (res.sizing) {
    out.push("", line("Sizing point", `${res.sizing.phaseId} phase — ${fmt(res.sizing.Qpeak)} ${U.flow} at ${fmt(res.sizing.dpTotal)} ${U.pressure} valve drop (⅓·p_s = ${fmt(res.sizing.psThird)})`));
  }

  const allWarnings = [...res.warnings, ...match.warnings];
  out.push("", "Checks");
  out.push(...(allWarnings.length ? allWarnings.map((w) => `  [${w.level}] ${w.text}`) : ["  All checks passed."]));

  if (match.rows.length && res.sizing) {
    out.push("", "Top catalogue matches (UNVERIFIED seed data — confirm with engineering)");
    match.rows.slice(0, 3).forEach((r) => {
      out.push(line(`${r.valve.series} ${r.valve.code}`, `margin ×${fmt(r.margin, { decimals: 2 })} · rated ${fmt(r.qRated)} ${U.flow} @ ${fmt(r.dpNland)} ${U.pressure}/land · bw ${r.valve.bandwidth_hz ?? "n/a"} Hz`));
    });
  }
  return out.join("\n");
}
