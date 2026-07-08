// Proportional valve sizing with a cylinder load. Follows the canonical
// industry method (Moog / Bosch Rexroth Size & Select): trapezoidal motion
// profile → per-phase force balance → per-land valve pressure drops →
// required rated flow Q_N = Q·√(Δp_N/Δp) → catalogue match, plus the
// oil-spring natural-frequency / valve-bandwidth check.
//
// Two unit tracks (metric & imperial), same house rule as calc/cylinder.js:
// constants are unit-specific, we never convert to SI and run one equation.
//
// Metric track units:
//   bore/rod/stroke/move mm · dead volume l · mass kg · forces kN
//   pressures/β bar · velocity m/s · accel m/s² · flow lpm · k_h N/m
//   (handy identities: 1 cm²·m/s = 6 lpm; 1 bar·cm² = 0.01 kN;
//    β[bar]·A[cm²]²/V[l] lands in N/m with no constant at all)
// Imperial track units:
//   bore/rod/stroke/move in · dead volume in³ · mass lb · forces lbf
//   pressures/β psi · velocity in/s · accel in/s² · flow gpm · k_h lbf/in
//   (psi·in² = lbf; 1 gpm = 231 in³/min; g_c = 386.4 in/s² converts lb
//    mass to lbf·s²/in — surfaced in the formulas, not hidden)

const PI = Math.PI;
const GC = 386.4; // in/s² — imperial gravitational conversion constant

// Effective bulk modulus defaults when the input is left blank.
export const BETA_DEFAULT = { metric: 14000 /* bar */, imperial: 175000 /* psi */ };

export function compute(s) {
  const unit = s.unit === "imperial" ? "imperial" : "metric";
  const M = unit === "metric";

  const D = num(s.bore);
  const d = num(s.rod);
  const L = num(s.stroke);
  const move = num(s.moveDist) > 0 ? num(s.moveDist) : L;
  const deadA = Math.max(0, num(s.deadA));
  const deadB = Math.max(0, num(s.deadB));
  const m = num(s.mass);
  const Fext = num(s.extForce);  // signed: negative = assists motion
  const Ffric = Math.abs(num(s.fricForce));
  const ps = num(s.ps);
  const pt = Math.max(0, num(s.pt));
  const betaDefaulted = !(num(s.beta) > 0);
  const beta = betaDefaulted ? BETA_DEFAULT[unit] : num(s.beta);
  const vmax = num(s.vmax);
  const ta = num(s.ta);
  const td = num(s.td);
  const extend = s.direction !== "retract";

  const out = {
    unit,
    direction: extend ? "extend" : "retract",
    supply: { ps, pt, beta, betaDefaulted },
    geometry: null,
    dynamics: null,
    profile: null,
    phases: [],
    sizing: null,
    decel: null,
    warnings: [],
  };
  const warn = (code, params) => out.warnings.push(renderWarning(code, unit, params));

  // --- Geometry -------------------------------------------------------------
  if (!(D > 0)) return out;
  if (d >= D) {
    warn("W_ROD_GE_BORE");
    return out;
  }
  // Areas: metric cm² (πD²/4 mm² ÷ 100), imperial in².
  const Aa = M ? (PI * D * D) / 400 : (PI * D * D) / 4;
  const Ab = Aa - (d > 0 ? (M ? (PI * d * d) / 400 : (PI * d * d) / 4) : 0);
  const phi = Aa / Ab;
  out.geometry = { Aa, Ab, phi };

  // Meter-in / meter-out sides for the chosen direction.
  const Ain = extend ? Aa : Ab;
  const Aout = extend ? Ab : Aa;
  const r = Aout / Ain; // outflow/inflow ratio (extend: 1/φ, retract: φ)

  // Unit-track helper closures ------------------------------------------------
  const flow = (A, v) => (M ? 6 * A * v : (A * v * 60) / 231);          // lpm | gpm
  const inertia = (a) => (m > 0 && a ? (M ? (m * a) / 1000 : (m * a) / GC) : 0); // kN | lbf
  const forceP = (F) => (M ? 100 * F : F);                              // force → p·A units
  const pOfF = (F, A) => (M ? (100 * F) / A : F / A);                   // bar | psi

  // --- Load dynamics (oil column spring + mass) ------------------------------
  // Worst case is mid-stroke: trapped volumes are balanced → lowest stiffness.
  if (L > 0 && m > 0) {
    // Half-stroke swept volume + dead line volume per side.
    // metric: cm²·mm = 0.1 cm³ → litres is ÷ 10 000. imperial: in²·in = in³.
    const Va = (M ? (Aa * (L / 2)) / 10000 : Aa * (L / 2)) + deadA;
    const Vb = (M ? (Ab * (L / 2)) / 10000 : Ab * (L / 2)) + deadB;
    if (Va > 0 && Vb > 0) {
      const kh = beta * ((Aa * Aa) / Va + (Ab * Ab) / Vb); // N/m | lbf/in
      const wn = M ? Math.sqrt(kh / m) : Math.sqrt((kh * GC) / m);
      const fn = wn / (2 * PI);
      out.dynamics = { Va, Vb, kh, wn, fn, bwIdeal: 3 * fn };
    }
  }

  // --- Motion profile ---------------------------------------------------------
  if (!(vmax > 0)) return out;
  if (L > 0 && move > L) warn("W_MOVE_GT_STROKE");

  const sLin = M ? move / 1000 : move; // m | in — matches velocity units
  let aAccel = ta > 0 ? vmax / ta : null;
  let aDecel = td > 0 ? vmax / td : null;
  let vPeak = vmax;
  let type = aAccel == null && aDecel == null ? "const" : "trapezoid";

  if (type !== "const" && sLin > 0) {
    const rampDist = (aAccel ? (vmax * ta) / 2 : 0) + (aDecel ? (vmax * td) / 2 : 0);
    if (rampDist > sLin) {
      // v_max is never reached: triangular profile at the same accelerations.
      type = "triangle";
      const invSum = (aAccel ? 1 / aAccel : 0) + (aDecel ? 1 / aDecel : 0);
      vPeak = Math.sqrt((2 * sLin) / invSum);
      warn("W_TRIANGULAR", { vPeak: fmtNum(vPeak), vUnit: M ? "m/s" : "in/s" });
    }
  }

  let tTotal = null;
  if (sLin > 0) {
    const tRampA = aAccel ? vPeak / aAccel : 0;
    const tRampD = aDecel ? vPeak / aDecel : 0;
    const rampDist = (vPeak * (tRampA + tRampD)) / 2;
    tTotal = tRampA + tRampD + Math.max(0, sLin - rampDist) / vPeak;
  }

  // Theoretical max acceleration: full supply on the meter-in side, tank on the
  // meter-out side, no valve drop — the ceiling the hydraulics can ever deliver.
  let aMax = null;
  if (m > 0 && ps > 0) {
    const drive = ps * Ain - pt * Aout - forceP(Fext + Ffric); // p·A units
    aMax = M ? (10 * drive) / m : (drive * GC) / m; // m/s² | in/s²
  }
  const stopDist = aDecel ? (M ? (1000 * vPeak * vPeak) / (2 * aDecel) : (vPeak * vPeak) / (2 * aDecel)) : null;
  out.profile = { type, vPeak, tTotal, aAccel, aDecel, aMax, stopDist };

  if (aAccel != null && aMax != null && aAccel > aMax) {
    warn("W_ACCEL_UNREACHABLE", {
      a: fmtNum(aAccel), aMax: fmtNum(aMax), aUnit: M ? "m/s²" : "in/s²",
    });
  }

  // --- Per-phase force balance & valve pressure drops -------------------------
  // Symmetric spool: both metering lands share one opening, so the drops split
  // as the square of the flow ratio (Q_out/Q_in = √(Δp_out/Δp_in) at equal
  // opening ⇒ Δp_out = r²·Δp_in). Substituting into the piston force balance
  //   (p_s − Δp_in)·A_in − (p_t + r²·Δp_in)·A_out = F_tot
  // gives Δp_in = (p_s·A_in − p_t·A_out − F_tot) / (A_in·(1 + r³)).
  // Cross-check: Q_out·√(Δp_N/Δp_out) ≡ Q_in·√(Δp_N/Δp_in) — both lands demand
  // the same rated flow, which is the point of the split.
  if (!(ps > 0)) return out;

  const denom = Ain * (1 + r * r * r);
  const phaseDefs = [
    aAccel != null && { id: "accel", label: "Accelerate", a: aAccel, sign: +1 },
    (type === "trapezoid" || type === "const") && { id: "const", label: "Constant velocity", a: 0, sign: 0 },
    aDecel != null && { id: "decel", label: "Decelerate", a: aDecel, sign: -1 },
  ].filter(Boolean);

  let stalled = false;
  out.phases = phaseDefs.map((p) => {
    const Fin = p.sign * inertia(p.a);
    const Ftot = Fext + Ffric + Fin;
    const Qin = flow(Ain, vPeak);
    const Qout = flow(Aout, vPeak);
    const numer = ps * Ain - pt * Aout - forceP(Ftot);
    const stall = numer <= 0;
    if (stall) stalled = true;
    const dpIn = stall ? null : numer / denom;
    const dpOut = stall ? null : dpIn * r * r;
    return {
      id: p.id, label: p.label,
      a: p.sign * p.a, Fin, Ftot,
      pL: pOfF(Ftot, Ain),
      Qin, Qout, dpIn, dpOut,
      dpTotal: stall ? null : dpIn + dpOut,
      stall,
    };
  });
  if (stalled) {
    warn("W_STALL", { ps: fmtNum(ps), pUnit: M ? "bar" : "psi" });
  }

  // --- Sizing point: the phase demanding the largest rated flow ---------------
  // Q_N,req ∝ Q/√Δp_in, so the binding phase maximises that ratio.
  const usable = out.phases.filter((p) => !p.stall && p.dpIn > 0);
  if (usable.length) {
    const worst = usable.reduce((a, b) => (b.Qin / Math.sqrt(b.dpIn) > a.Qin / Math.sqrt(a.dpIn) ? b : a));
    out.sizing = {
      phaseId: worst.id,
      Qpeak: worst.Qin,
      dpIn: worst.dpIn,
      dpOut: worst.dpOut,
      dpTotal: worst.dpTotal,
      psThird: ps / 3,
    };
    const pUnit = M ? "bar" : "psi";
    if (worst.dpTotal < ps / 3) {
      warn("W_DP_BELOW_THIRD", { dp: fmtNum(worst.dpTotal), third: fmtNum(ps / 3), pUnit });
    } else if (worst.dpTotal > (2 * ps) / 3) {
      warn("W_DP_HIGH", { dp: fmtNum(worst.dpTotal), pUnit });
    }
  }

  // --- Meter-out deceleration: intensification & cavitation --------------------
  // Braking worst case: full supply lands on the meter-in side while the
  // meter-out land throttles to absorb the kinetic energy. As the load term
  // vanishes the outlet pressure tends to p_s·A_in/A_out (φ·p_s on extend).
  if (aDecel != null && m > 0) {
    const Fdec = Fext + Ffric - inertia(aDecel);
    const pbMax = (ps * Ain - forceP(Fdec)) / Aout;
    const pbAsymptote = (ps * Ain) / Aout;
    const decelPhase = out.phases.find((p) => p.id === "decel");
    const overrunning = Fdec < 0;
    const cavitationRisk =
      !!decelPhase && !decelPhase.stall && decelPhase.dpIn != null && ps - decelPhase.dpIn < pt;
    out.decel = { pbMax, pbAsymptote, overrunning, cavitationRisk };

    const pUnit = M ? "bar" : "psi";
    if (pbMax > ps) {
      warn("W_INTENSIFICATION", {
        pb: fmtNum(pbMax), asymptote: fmtNum(pbAsymptote), pUnit,
        side: extend ? "rod" : "cap",
      });
    }
    if (overrunning && cavitationRisk) warn("W_OVERRUN_CAVITATION");
  }

  return out;
}

// Rated flow the catalogue valve must carry: Q_N = Q·√(Δp_N/Δp_in),
// with Δp_N expressed PER METERING LAND (halve "total"-basis ratings first).
export function requiredRatedFlow(sizing, dpNland) {
  if (!sizing || !(sizing.dpIn > 0) || !(dpNland > 0)) return null;
  return sizing.Qpeak * Math.sqrt(dpNland / sizing.dpIn);
}

// Match the computed requirement against the valve catalogue.
// Returns rows (ranked), the best pick, the closest miss when nothing fits,
// and match-level warnings — all in the caller's unit system.
//
// Two capacity constraints per valve, and the binding one wins:
//  1. Rated-flow law: allowable flow at the operating Δp per the √ scaling,
//     q_rated·√(Δp_in/Δp_N,land). Valid near the rating point.
//  2. Power-capacity envelope: the datasheet's flow-force limit. Low-Δp-rated
//     valves (5 bar/land) would be credited with impossible flows at high
//     drops by the √ law alone — the envelope caps them.
export function matchValves(result, catalogue, unit) {
  const M = unit !== "imperial";
  const empty = { rows: [], best: null, closest: null, warnings: [] };
  if (!result || !result.sizing) return empty;

  const ps = result.supply.ps;
  const pt = result.supply.pt;
  const fn = result.dynamics ? result.dynamics.fn : null;
  const pbMax = result.decel ? result.decel.pbMax : null;

  const rows = catalogue.map((v) => {
    const qRated = M ? v.q_rated_lpm : v.q_rated_gpm;
    const dpRef = M ? v.dp_ref_bar : v.dp_ref_psi;
    const pMax = M ? v.p_max_bar : v.p_max_psi;
    const pMaxT = M ? v.p_max_t_bar : v.p_max_t_psi;
    const env = M ? v.envelope : v.envelope_imperial;
    const qMaxCeil = M ? v.q_max_lpm : v.q_max_gpm;
    const dpNland = v.dp_basis === "total" ? dpRef / 2 : dpRef;
    const qReq = requiredRatedFlow(result.sizing, dpNland);
    const marginRated = qReq > 0 ? qRated / qReq : null;

    // Envelope cap at the operating point.
    let qCap = null;
    if (env && env.points && env.points.length) {
      const dpOp = env.basis === "single_path" ? result.sizing.dpIn : result.sizing.dpTotal;
      qCap = interpEnvelope(env.points, dpOp);
    } else if (qMaxCeil != null) {
      qCap = qMaxCeil;
    }
    const marginEnv = qCap != null && result.sizing.Qpeak > 0 ? qCap / result.sizing.Qpeak : null;

    let margin = marginRated;
    let limitedBy = "rated";
    if (marginEnv != null && (margin == null || marginEnv < margin)) {
      margin = marginEnv;
      limitedBy = "envelope";
    }

    return {
      valve: v,
      qRated, dpNland, qReq, margin, limitedBy,
      psOk: pMax >= ps,
      ptOk: pMaxT == null || pt <= pMaxT,
      pbOk: pbMax == null || pMax >= pbMax,
      marginClass:
        margin == null ? "unknown" : margin >= 1.1 ? "ok" : margin >= 1 ? "marginal" : "short",
      bwStatus:
        !(fn > 0) || v.bandwidth_hz == null
          ? "unknown"
          : v.bandwidth_hz >= 3 * fn ? "ok" : v.bandwidth_hz >= fn ? "marginal" : "low",
    };
  });

  // Rank feasible valves by overall suitability, not flow margin alone:
  // a valve whose bandwidth sits below the load's natural frequency, or whose
  // rating the deceleration back-pressure exceeds, is a worse pick than a
  // dynamically sound one — and a heavily oversized valve loses control
  // resolution. Lower score = better; ties broken by smallest margin.
  const suitability = (r) =>
    (r.bwStatus === "ok" ? 0 : r.bwStatus === "low" ? 6 : 2) + // dynamics first
    (r.pbOk ? 0 : 2) +                                          // decel back-pressure rating
    (r.margin < 1.1 ? 2 : 0) +                                  // thin flow margin
    (r.margin > 4 ? 2 : r.margin > 2.5 ? 1 : 0);                // oversizing → poor resolution
  const feasible = (r) => r.psOk && r.ptOk && r.margin != null && r.margin >= 1;
  const bucket = (r) => (!r.psOk || !r.ptOk ? 2 : feasible(r) ? 0 : 1);
  const sorted = [...rows].sort((a, b) => {
    const d = bucket(a) - bucket(b);
    if (d) return d;
    if (bucket(a) === 0) {
      const s = suitability(a) - suitability(b);
      return s !== 0 ? s : a.margin - b.margin;
    }
    return (b.margin ?? -1) - (a.margin ?? -1); // infeasible: closest first
  });

  const best = sorted.find(feasible) || null;
  const closest = best ? null : sorted.find((r) => r.psOk && r.ptOk && r.margin != null) || null;

  const warnings = [];
  const fUnit = M ? "lpm" : "gpm";
  if (!best) {
    warnings.push(
      renderWarning("W_NO_MATCH", unit, {
        qReq: closest ? fmtNum(closest.qReq) : "—",
        fUnit,
        closest: closest ? `${closest.valve.series}-${closest.valve.code}` : null,
        margin: closest ? fmtNum(closest.margin) : null,
      })
    );
  } else if (best.marginClass === "marginal") {
    warnings.push(renderWarning("W_MARGIN_LOW", unit, {
      valve: `${best.valve.series}-${best.valve.code}`, margin: fmtNum(best.margin),
    }));
  }
  return { rows: sorted, best, closest, warnings };
}

// --- Warning copy --------------------------------------------------------------
// One table so the UI card, the per-row flags and the Copy/Email report all say
// exactly the same thing.
export const WARNINGS = {
  W_ROD_GE_BORE: {
    level: "error",
    text: () => "Rod diameter must be smaller than the bore — the rod-side area is zero or negative.",
  },
  W_STALL: {
    level: "error",
    text: (u, p) => `The load exceeds the force available at ${p.ps} ${p.pUnit} supply — the cylinder stalls in the highlighted phase. Raise supply pressure or bore diameter.`,
  },
  W_TRIANGULAR: {
    level: "warn",
    text: (u, p) => `Max velocity is never reached: the move is too short for the accel/decel times, so the profile is triangular with a peak of ${p.vPeak} ${p.vUnit}. Flows are computed at that achievable peak.`,
  },
  W_ACCEL_UNREACHABLE: {
    level: "warn",
    text: (u, p) => `Commanded acceleration ${p.a} ${p.aUnit} exceeds the ${p.aMax} ${p.aUnit} the supply can deliver against this load — the accel time will stretch in practice.`,
  },
  W_DP_BELOW_THIRD: {
    level: "warn",
    text: (u, p) => `Only ${p.dp} ${p.pUnit} is available across the valve at the sizing point — below the ⅓·p_s = ${p.third} ${p.pUnit} guideline (Moog). With little pressure margin the valve loses control authority; consider a higher supply pressure or a larger cylinder.`,
  },
  W_DP_HIGH: {
    level: "info",
    text: (u, p) => `Most of the supply (${p.dp} ${p.pUnit}) drops across the valve at the sizing point. Fine for sizing — a smaller, faster valve is optimal here — but expect the excess energy to become heat.`,
  },
  W_INTENSIFICATION: {
    level: "warn",
    text: (u, p) => `Meter-out braking intensifies the ${p.side}-end pressure to ≈ ${p.pb} ${p.pUnit} (worst case tends to ${p.asymptote} ${p.pUnit}). Check the cylinder and valve ratings — catalogue rows below this pressure are flagged.`,
  },
  W_OVERRUN_CAVITATION: {
    level: "warn",
    text: () => "The load overruns during deceleration and the meter-in side may cavitate. Consider anti-cavitation checks or a counterbalance valve.",
  },
  W_MOVE_GT_STROKE: {
    level: "warn",
    text: () => "The move distance exceeds the cylinder stroke.",
  },
  W_MARGIN_LOW: {
    level: "warn",
    text: (u, p) => `Best catalogue match (${p.valve}) has under 10 % flow margin (×${p.margin}). Verify against the manufacturer's sizing tool before committing.`,
  },
  W_NO_MATCH: {
    level: "warn",
    text: (u, p) =>
      `No catalogue valve meets the required rated flow of ${p.qReq} ${p.fUnit} at this pressure drop` +
      (p.closest ? ` — closest is ${p.closest} at ×${p.margin} margin.` : ".") +
      " Options: lower the max velocity, raise supply pressure, allocate more Δp to the valve, or split the flow across two valves.",
  },
};

function renderWarning(code, unit, params = {}) {
  const def = WARNINGS[code];
  return { code, level: def.level, text: def.text(unit, params) };
}

// Piecewise-linear interpolation on a power-capacity envelope, clamped at
// both ends. Envelopes can fold back (flow-force limit), so this is a plain
// walk over Δp-sorted segments, not a monotonic lookup.
function interpEnvelope(points, dp) {
  if (!(dp > 0) || !points.length) return null;
  if (dp <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [d0, q0] = points[i - 1];
    const [d1, q1] = points[i];
    if (dp <= d1) return q0 + ((q1 - q0) * (dp - d0)) / (d1 - d0);
  }
  return points[points.length - 1][1];
}

// Output unit labels per system (inputs live in the tab's FIELDS map).
export const units = {
  metric: {
    area: "cm²", flow: "lpm", pressure: "bar", force: "kN", velocity: "m/s",
    accel: "m/s²", length: "mm", volume: "l", stiffness: "N/m", freq: "Hz", time: "s",
  },
  imperial: {
    area: "in²", flow: "gpm", pressure: "psi", force: "lbf", velocity: "in/s",
    accel: "in/s²", length: "in", volume: "in³", stiffness: "lbf/in", freq: "Hz", time: "s",
  },
};

function num(v) {
  if (v === "" || v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Compact number for warning sentences (the UI table uses format.js's fmt).
function fmtNum(v) {
  if (v == null || !Number.isFinite(v)) return "—";
  const abs = Math.abs(v);
  return v.toFixed(abs >= 100 ? 0 : abs >= 10 ? 1 : 2);
}
