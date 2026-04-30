// Cylinder calculations. Two unit tracks (metric & imperial) so the
// numbers exactly match Trelleborg's reference tool — its formulas
// embed unit-specific constants (231 in/gal, etc.), so we can't just
// "convert to SI and run one equation".

// Inputs (per unit system):
//   metric:   d, r (mm), L (mm), P (bar), FR (lpm)
//   imperial: d, r (in), L (in), P (psi), FR (gpm)
//
// Outputs (per side):
//   metric:   A (cm²), V (l),   F (kN),  T (s), v (m/s),  Out (lpm)
//   imperial: A (in²), V (in³), F (lbf), T (s), v (in/s), Out (gpm)

const PI = Math.PI;

export function compute({ unit, bore, rod, stroke, pressure, flow }) {
  const d = num(bore);
  const r = num(rod);
  const L = num(stroke);
  const P = num(pressure);
  const FR = num(flow);

  const out = {
    bore: blank(),
    rod: blank(),
    ratio: null,
  };

  if (!d || d <= 0) return out;

  if (unit === "metric") {
    // Areas in mm² (work in mm to keep formulas obvious), report in cm²
    const A_bore_mm2 = (PI * d * d) / 4;
    const A_rod_mm2 = A_bore_mm2 - (r > 0 ? (PI * r * r) / 4 : 0);

    out.bore.area = A_bore_mm2 / 100; // cm²
    out.rod.area = A_rod_mm2 / 100;

    if (L > 0) {
      out.bore.volume = (A_bore_mm2 * L) / 1_000_000; // L
      out.rod.volume = (A_rod_mm2 * L) / 1_000_000;
    }
    if (P > 0) {
      out.bore.force = (P * A_bore_mm2) / 10_000; // kN  (bar·mm² → N → kN)
      out.rod.force = (P * A_rod_mm2) / 10_000;
    }
    if (FR > 0 && out.bore.volume != null) {
      out.bore.time = (60 * out.bore.volume) / FR; // s
      out.rod.time = out.rod.volume != null ? (60 * out.rod.volume) / FR : null;
    }
    if (L > 0 && out.bore.time) out.bore.velocity = L / out.bore.time / 1000; // m/s
    if (L > 0 && out.rod.time) out.rod.velocity = L / out.rod.time / 1000;

    if (A_rod_mm2 > 0) {
      const Z = A_bore_mm2 / A_rod_mm2;
      out.ratio = Z;
      if (FR > 0) {
        out.bore.outflow = FR / Z; // oil exiting rod side when bore fills
        out.rod.outflow = FR * Z;  // oil exiting bore side when rod fills
      }
    }
  } else {
    // Imperial: dimensions stay in inches.
    const A_bore = (PI * d * d) / 4; // in²
    const A_rod = A_bore - (r > 0 ? (PI * r * r) / 4 : 0);

    out.bore.area = A_bore;
    out.rod.area = A_rod;

    if (L > 0) {
      out.bore.volume = A_bore * L; // in³
      out.rod.volume = A_rod * L;
    }
    if (P > 0) {
      out.bore.force = P * A_bore; // lbf  (psi = lbf/in²)
      out.rod.force = P * A_rod;
    }
    if (FR > 0 && out.bore.volume != null) {
      // gpm → in³/min: × 231; ÷60 → in³/s
      out.bore.time = (60 * out.bore.volume) / (231 * FR);
      out.rod.time = out.rod.volume != null ? (60 * out.rod.volume) / (231 * FR) : null;
    }
    if (L > 0 && out.bore.time) out.bore.velocity = L / out.bore.time; // in/s
    if (L > 0 && out.rod.time) out.rod.velocity = L / out.rod.time;

    if (A_rod > 0) {
      const Z = A_bore / A_rod;
      out.ratio = Z;
      if (FR > 0) {
        out.bore.outflow = FR / Z;
        out.rod.outflow = FR * Z;
      }
    }
  }

  return out;
}

export const units = {
  metric: {
    bore: "mm", rod: "mm", stroke: "mm", pressure: "bar", flow: "lpm",
    area: "cm²", volume: "l", force: "kN", time: "sec", velocity: "m/s", outflow: "lpm",
  },
  imperial: {
    bore: "in", rod: "in", stroke: "in", pressure: "psi", flow: "gpm",
    area: "in²", volume: "in³", force: "lbf", time: "sec", velocity: "in/s", outflow: "gpm",
  },
};

function num(v) {
  if (v === "" || v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function blank() {
  return { area: null, volume: null, force: null, time: null, velocity: null, outflow: null };
}
