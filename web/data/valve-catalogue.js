// Vickers by Danfoss proportional directional valve catalogue.
//
// STATUS OF THIS DATA: every entry was EXTRACTED from the official Danfoss
// documents stored in docs/datasheets/ (committed to this repo), with a page
// citation for every value ("source" field). Entries carry
//   status: "extracted"  — read from the document, pending engineer sign-off
//   status: "verified"   — an application engineer has confirmed the entry
// To sign an entry off: open the cited document page, confirm the values,
// change status to "verified" and add your initials/date to "verified_by".
//
// Source documents (docs/datasheets/):
//   [D1] AxisPro_KBSD14-03_UG_BC536540937120en-000102.pdf
//        (footers read BC536540937120en-000201, 2025.11 — file may be misnamed)
//   [D2] AxisPro_KBHD15-05_UG_BC543728174733en-000101.pdf  (2025.12)
//   [D3] AxisPro_KBHD15-07_UG_BC544316984331en-000101.pdf  (2025.12)
//   [D4] KBFD-TG4V-3_TI_BC455580201423en-000102.pdf        (June 2023)
//   [D5] KBFD-TG4V-5_TI_BC444061850959en-000102.pdf        (January 2025)
//
// Field notes:
//   dp_basis  "per_land" → dp_ref is the drop across ONE metering edge
//                          (e.g. P→A alone). AxisPro KBHD & K(B)FDG4V ratings.
//             "total"    → dp_ref is across BOTH edges in series (P→A + B→T).
//                          AxisPro KBSD14 rating (70 bar total = 35 bar/edge).
//   envelope  Power-capacity envelope from the datasheet graphs: [Δp, Q] points,
//             graph-derived (±10%). basis "total" = Δp across the whole valve;
//             "single_path" = Δp across one metering edge. The sizing engine
//             caps the √Δp flow law with this — without it, low-Δp-rated
//             valves would be credited with impossible flows at high drops.
//   q_max_lpm Absolute envelope ceiling where only a maximum was readable.
//   bandwidth_hz  −3 dB small-signal bandwidth. ALL bandwidth values are
//             graph-derived from the published Bode plots (no numeric figure
//             is printed in any of these documents); the conservative low end
//             of the reading is stored.
//   p_max_bar     P/A/B work-port rating used for the supply check.
//   p_max_t_bar   Tank-port rating (often much lower — 160 bar on G4V!).
//
// The previous seed entries (KBSDG4V, KDG4V — legacy series) were REMOVED:
// they are superseded by the AxisPro documents above, and no datasheet for
// the basic KDG4V series has been provided yet. Add it back with a document.

const GITHUB_DOCS = "https://github.com/liamcarter1/HydraulicsCalculator/blob/main/docs/datasheets/";

const RAW = [
  // === AxisPro KBSD14-03 — NG6 (D03), direct-operated, servo-performance ====
  // Rated at 70 bar (1000 psi) TOTAL valve Δp = 35 bar (500 psi) per edge
  // [D1 p.12]. P/A/B 350 bar, T 250 bar [D1 p.10]. Step 8 ms [D1 p.20].
  // Bandwidth ~130-150 Hz (Bode, D1 p.13) → 130 stored. Envelopes D1 p.12-13.
  {
    id: "kbsd14-03-05", series: "KBSD14-03", code: "92L05", size: "NG6 (D03)",
    q_rated_lpm: 5, dp_ref_bar: 70, dp_basis: "total",
    p_max_bar: 350, p_max_t_bar: 250, bandwidth_hz: 130, step_ms: 8,
    feedback: true, performance_class: "servo", pilot: null,
    envelope: { basis: "total", points: [[50, 4], [110, 6], [200, 8], [350, 10.5]] },
    spools: "92/96/94/76 fail-safe centres; 8% overlap (82/86); dual-gain options",
    doc: "AxisPro_KBSD14-03_UG_BC536540937120en-000102.pdf",
    source: "D1: flow p.6, Δp basis p.12, pressures p.10, step p.20, Bode p.13 (graph), envelope p.12 (graph)",
    notes: "File footers read rev -000201 (2025.11); filename says -000102 — confirm current revision.",
  },
  {
    id: "kbsd14-03-12", series: "KBSD14-03", code: "92L12", size: "NG6 (D03)",
    q_rated_lpm: 12, dp_ref_bar: 70, dp_basis: "total",
    p_max_bar: 350, p_max_t_bar: 250, bandwidth_hz: 130, step_ms: 8,
    feedback: true, performance_class: "servo", pilot: null,
    envelope: { basis: "total", points: [[50, 10], [120, 15], [225, 20], [315, 24], [350, 24]] },
    spools: "92/96/94/76 fail-safe centres; 8% overlap; asymmetric 92L24N12 (2:1)",
    doc: "AxisPro_KBSD14-03_UG_BC536540937120en-000102.pdf",
    source: "D1: flow p.6, Δp basis p.12, pressures p.10, step p.20, envelope p.12 (graph)",
  },
  {
    id: "kbsd14-03-24", series: "KBSD14-03", code: "92L24", size: "NG6 (D03)",
    q_rated_lpm: 24, dp_ref_bar: 70, dp_basis: "total",
    p_max_bar: 350, p_max_t_bar: 250, bandwidth_hz: 130, step_ms: 8,
    feedback: true, performance_class: "servo", pilot: null,
    // Envelope folds back above ~180 bar (flow-force limit) — D1 p.13.
    envelope: { basis: "total", points: [[50, 20], [130, 30], [180, 33], [260, 26], [350, 21]] },
    spools: "92/96 centres; asymmetric 92L24N12 (2:1); dual-gain 92L02U24",
    doc: "AxisPro_KBSD14-03_UG_BC536540937120en-000102.pdf",
    source: "D1: flow p.6, Δp basis p.12, pressures p.10, step p.20, envelope p.13 (graph)",
  },
  {
    id: "kbsd14-03-40", series: "KBSD14-03", code: "92L40", size: "NG6 (D03)",
    q_rated_lpm: 40, dp_ref_bar: 70, dp_basis: "total",
    p_max_bar: 350, p_max_t_bar: 250, bandwidth_hz: 130, step_ms: 8,
    feedback: true, performance_class: "servo", pilot: null,
    envelope: { basis: "total", points: [[40, 30], [70, 40], [105, 50], [155, 60], [188, 65], [250, 31], [350, 28]] },
    spools: "92/96 centres; asymmetric 92L40N20 (2:1), 92L40N10 (4:1); dual-gain 92L04T40",
    doc: "AxisPro_KBSD14-03_UG_BC536540937120en-000102.pdf",
    source: "D1: flow p.6, Δp basis p.12, pressures p.10, step p.20, envelope p.13 (graph)",
    notes: "Envelope folds back sharply above ~190 bar total Δp (fail-safe operating limit ~188 bar, D1 p.13).",
  },

  // === AxisPro KBHD15-05 — NG10 (D05), two-stage pilot-operated ============
  // Rated at 5 bar (72 psi) PER metering path [D2 p.7]; table header's
  // "@ ΔP 10 bar" is both edges summed. P/A/B 315 bar (210 with internal
  // pilot, no reducer); T 210 bar ext. drain [D2 p.7]. Min pilot 50 bar.
  // Step 24 ms [D2 p.16]. Bandwidth ~80 Hz (Bode, D2 p.8) → 75 stored.
  // Frame envelope "flow through P-A-B-T" D2 p.8; hard limit ~365 lpm.
  {
    id: "kbhd15-05-80", series: "KBHD15-05", code: "33C80N", size: "NG10 (D05)",
    q_rated_lpm: 80, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 315, p_max_t_bar: 210, bandwidth_hz: 75, step_ms: 24,
    feedback: true, performance_class: "servo", pilot: "two-stage; min pilot 50 bar",
    envelope: { basis: "total", points: [[8, 100], [18, 150], [33, 200], [52, 250], [76, 300], [105, 350], [113, 365], [350, 365]] },
    spools: "33C: P blocked, A&B→T at null; asymmetric 33C80N50",
    doc: "AxisPro_KBHD15-05_UG_BC543728174733en-000101.pdf",
    source: "D2: flow p.6, Δp basis p.7, pressures p.7, step p.16, Bode p.8 (graph), envelope p.8 (graph)",
  },
  {
    id: "kbhd15-05-95", series: "KBHD15-05", code: "2C95N", size: "NG10 (D05)",
    q_rated_lpm: 95, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 315, p_max_t_bar: 210, bandwidth_hz: 75, step_ms: 24,
    feedback: true, performance_class: "servo", pilot: "two-stage; min pilot 50 bar",
    envelope: { basis: "total", points: [[8, 100], [18, 150], [33, 200], [52, 250], [76, 300], [105, 350], [113, 365], [350, 365]] },
    spools: "2C: all ports blocked at null; asymmetric 2C90N60, 2C70N45; PQ87F P-Q spool",
    doc: "AxisPro_KBHD15-05_UG_BC543728174733en-000101.pdf",
    source: "D2: flow p.6, Δp basis p.7, pressures p.7, step p.16, Bode p.8 (graph), envelope p.8 (graph)",
  },
  {
    id: "kbhd15-05-97", series: "KBHD15-05", code: "5C97N", size: "NG10 (D05)",
    q_rated_lpm: 97, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 315, p_max_t_bar: 210, bandwidth_hz: 75, step_ms: 24,
    feedback: true, performance_class: "servo", pilot: "two-stage; min pilot 50 bar",
    envelope: { basis: "total", points: [[8, 100], [18, 150], [33, 200], [52, 250], [76, 300], [105, 350], [113, 365], [350, 365]] },
    spools: "5C: critically (zero) lapped; asymmetric 5C90N55",
    doc: "AxisPro_KBHD15-05_UG_BC543728174733en-000101.pdf",
    source: "D2: flow p.6, Δp basis p.7, pressures p.7, step p.16, Bode p.8 (graph)",
    notes: "Doc conflict: 5C90N55 asymmetric listed as 90 l/min on p.5 but 80 l/min on p.6 — query Danfoss.",
  },

  // === AxisPro KBHD15-07 — D07 (NG16), two-stage pilot-operated ============
  // Rated at 5 bar (72 psi) PER metering path [D3 p.8]. P/A/B 350 bar
  // (210 with internal pilot, no reducer); T 350 bar ext. drain / 50 int.
  // [D3 p.8]. Min pilot 50 bar. Step <60 ms [D3 p.18]. Bandwidth ~55-60 Hz
  // (Bode, D3 p.9) → 55 stored. Envelope D3 p.9; hard limit ~630 lpm.
  {
    id: "kbhd15-07-160", series: "KBHD15-07", code: "33C160N", size: "D07 (NG16)",
    q_rated_lpm: 160, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 350, p_max_t_bar: 350, bandwidth_hz: 55, step_ms: 60,
    feedback: true, performance_class: "servo", pilot: "two-stage; min pilot 50 bar",
    envelope: { basis: "total", points: [[5, 200], [15, 300], [30, 400], [48, 500], [80, 630], [350, 630]] },
    spools: "33C: P blocked, A&B→T at null; asymmetric 33C130N65 (2:1), 33C230N140",
    doc: "AxisPro_KBHD15-07_UG_BC544316984331en-000101.pdf",
    source: "D3: flow p.6, Δp basis p.8, pressures p.8, step p.18, Bode p.9 (graph), envelope p.9 (graph)",
  },
  {
    id: "kbhd15-07-200", series: "KBHD15-07", code: "2C200N", size: "D07 (NG16)",
    q_rated_lpm: 200, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 350, p_max_t_bar: 350, bandwidth_hz: 55, step_ms: 60,
    feedback: true, performance_class: "servo", pilot: "two-stage; min pilot 50 bar",
    envelope: { basis: "total", points: [[5, 200], [15, 300], [30, 400], [48, 500], [80, 630], [350, 630]] },
    spools: "2C: all ports blocked at null; asymmetric 2C150N85",
    doc: "AxisPro_KBHD15-07_UG_BC544316984331en-000101.pdf",
    source: "D3: flow p.6, Δp basis p.8, pressures p.8, step p.18, envelope p.9 (graph)",
  },
  {
    id: "kbhd15-07-230", series: "KBHD15-07", code: "2C230N", size: "D07 (NG16)",
    q_rated_lpm: 230, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 350, p_max_t_bar: 350, bandwidth_hz: 55, step_ms: 60,
    feedback: true, performance_class: "servo", pilot: "two-stage; min pilot 50 bar",
    envelope: { basis: "total", points: [[5, 200], [15, 300], [30, 400], [48, 500], [80, 630], [350, 630]] },
    spools: "also 5C230N (zero lap), 33C230N; asymmetric 2C230N140, 5C230N140; PQ230F",
    doc: "AxisPro_KBHD15-07_UG_BC544316984331en-000101.pdf",
    source: "D3: flow p.6, Δp basis p.8, pressures p.8, step p.18, Bode p.9 (graph), envelope p.9 (graph)",
    notes: "D3 p.8 max-pressure table contains a misprint ('50(5000)' for A&B, ext/ext row) — 350 bar used per all other rows; confirm with Danfoss.",
  },

  // === K(B)FDG4V-3 — NG6 (D03), proportional directional with feedback ======
  // Rated at 5 bar (75 psi) PER metering path [D4 p.5]. Normal usage
  // P/A/B 315 bar, T 160 bar (350/210 only with L port drained, N/F-Z
  // models) [D4 p.7]. KB (integral amp): step 17 ms [D4 p.6], bandwidth
  // ~55-60 Hz (Bode, D4 p.9) → 55 stored. KFDG4V (external Eurocard amp)
  // variant is slower: ~25-30 Hz — noted per entry, not a separate row.
  // Single-path envelopes D4 p.8.
  {
    id: "kbfdg4v3-07", series: "KBFDG4V-3", code: "2C07N", size: "NG6 (D03)",
    q_rated_lpm: 7, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 315, p_max_t_bar: 160, bandwidth_hz: 55, step_ms: 17,
    feedback: true, performance_class: "feedback", pilot: null,
    envelope: { basis: "single_path", points: [[100, 29], [350, 27]] },
    spools: "2C/33C centres; fine-metering 2C03F; KFDG4V-3 (ext. amp) variant ~25-30 Hz",
    doc: "KBFD-TG4V-3_TI_BC455580201423en-000102.pdf",
    source: "D4: flow p.5, Δp basis p.5, pressures p.7, step p.6, Bode p.9 (graph), envelope p.8 (graph)",
  },
  {
    id: "kbfdg4v3-13", series: "KBFDG4V-3", code: "2C13N", size: "NG6 (D03)",
    q_rated_lpm: 13, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 315, p_max_t_bar: 160, bandwidth_hz: 55, step_ms: 17,
    feedback: true, performance_class: "feedback", pilot: null,
    envelope: { basis: "single_path", points: [[70, 45], [350, 30]] },
    spools: "2C/33C centres; KFDG4V-3 (ext. amp) variant ~25-30 Hz",
    doc: "KBFD-TG4V-3_TI_BC455580201423en-000102.pdf",
    source: "D4: flow p.5, Δp basis p.5, pressures p.7, step p.6, envelope p.8 (graph)",
  },
  {
    id: "kbfdg4v3-20", series: "KBFDG4V-3", code: "2C20N", size: "NG6 (D03)",
    q_rated_lpm: 20, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 315, p_max_t_bar: 160, bandwidth_hz: 55, step_ms: 17,
    feedback: true, performance_class: "feedback", pilot: null,
    envelope: { basis: "single_path", points: [[50, 60], [350, 32]] },
    spools: "2C/33C/5C (zero lap) centres; asymmetric 2C20N10, 33C20N10 (2:1)",
    doc: "KBFD-TG4V-3_TI_BC455580201423en-000102.pdf",
    source: "D4: flow p.5, Δp basis p.5, pressures p.7, step p.6, envelope p.8 (graph)",
  },
  {
    id: "kbfdg4v3-30", series: "KBFDG4V-3", code: "2C30N", size: "NG6 (D03)",
    q_rated_lpm: 30, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 315, p_max_t_bar: 160, bandwidth_hz: 55, step_ms: 17,
    feedback: true, performance_class: "feedback", pilot: null,
    // D4 publishes no envelope for the 30 code — the 20-code envelope is used
    // as a CONSERVATIVE stand-in (a larger spool can only pass more). Replace
    // when Danfoss provides the 30-code envelope.
    envelope: { basis: "single_path", points: [[50, 60], [350, 32]] },
    spools: "2C/5C (zero lap) centres; meter-out-only 2C28S",
    doc: "KBFD-TG4V-3_TI_BC455580201423en-000102.pdf",
    source: "D4: flow p.5, Δp basis p.5, pressures p.7, step p.6; envelope NOT published for 30 code — 20-code envelope used conservatively (p.8)",
    notes: "Doc conflicts: asymmetric 33C08N04 printed as 8 l/min (p.5) vs 9 l/min (p.4); p.7 pressure-table row 1 layout is garbled in the source PDF.",
  },

  // === K(B)FDG4V-5 — NG10 (D05), proportional directional with feedback =====
  // Rated at 5 bar (75 psi) PER metering path [D5 p.5]. P/A/B 315 bar,
  // T 160 bar (210 with L drained, C**N-Z models) [D5 p.7]. KB (integral
  // amp): step 30 ms [D5 p.6], bandwidth ~35-40 Hz (Bode, D5 p.9) → 35
  // stored. KFDG4V-5 (ext. amp) ~20-22 Hz. Envelope maxima only (graph,
  // D5 p.8) → stored as q_max ceilings.
  {
    id: "kbfdg4v5-30", series: "KBFDG4V-5", code: "2C30N", size: "NG10 (D05)",
    q_rated_lpm: 30, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 315, p_max_t_bar: 160, bandwidth_hz: 35, step_ms: 30,
    feedback: true, performance_class: "feedback", pilot: null,
    envelope: null, q_max_lpm: 95,
    spools: "2C/33C centres; KFDG4V-5 (ext. amp) variant ~20-22 Hz",
    doc: "KBFD-TG4V-5_TI_BC444061850959en-000102.pdf",
    source: "D5: flow p.5, Δp basis p.5, pressures p.7, step p.6, Bode p.9 (graph), envelope max p.8 (graph)",
  },
  {
    id: "kbfdg4v5-50", series: "KBFDG4V-5", code: "2C50N", size: "NG10 (D05)",
    q_rated_lpm: 50, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 315, p_max_t_bar: 160, bandwidth_hz: 35, step_ms: 30,
    feedback: true, performance_class: "feedback", pilot: null,
    envelope: null, q_max_lpm: 130,
    spools: "2C/33C/9C (zero lap) centres; asymmetric 2C50N25, 33C50N25 (2:1)",
    doc: "KBFD-TG4V-5_TI_BC444061850959en-000102.pdf",
    source: "D5: flow p.5, Δp basis p.5, pressures p.7, step p.6, envelope max p.8 (graph)",
  },
  {
    id: "kbfdg4v5-70", series: "KBFDG4V-5", code: "2C70N", size: "NG10 (D05)",
    q_rated_lpm: 70, dp_ref_bar: 5, dp_basis: "per_land",
    p_max_bar: 315, p_max_t_bar: 160, bandwidth_hz: 35, step_ms: 30,
    feedback: true, performance_class: "feedback", pilot: null,
    envelope: null, q_max_lpm: 165,
    spools: "2C/33C centres; meter-out-only 2C65S; asymmetric 2C75N45",
    doc: "KBFD-TG4V-5_TI_BC444061850959en-000102.pdf",
    source: "D5: flow p.5, Δp basis p.5, pressures p.7, step p.6, envelope max p.8 (graph)",
  },
];

// Imperial figures and document links derived once, visibly — the sizing
// engine compares native numbers per unit system (no silent SI detour).
const LPM_PER_GPM = 3.785412;
const PSI_PER_BAR = 14.5038;
const toGpm = (lpm) => +(lpm / LPM_PER_GPM).toFixed(2);
const toPsi = (bar) => +(bar * PSI_PER_BAR).toFixed(0);

const expand = (v) => ({
  ...v,
  status: "extracted", // → "verified" after engineer sign-off (see header)
  verified_by: null,
  q_rated_gpm: toGpm(v.q_rated_lpm),
  dp_ref_psi: toPsi(v.dp_ref_bar),
  p_max_psi: toPsi(v.p_max_bar),
  p_max_t_psi: toPsi(v.p_max_t_bar),
  q_max_gpm: v.q_max_lpm != null ? toGpm(v.q_max_lpm) : null,
  envelope_imperial: v.envelope
    ? { basis: v.envelope.basis, points: v.envelope.points.map(([dp, q]) => [toPsi(dp), toGpm(q)]) }
    : null,
  datasheet_url: GITHUB_DOCS + v.doc,
});

export const CATALOGUE = RAW.map(expand);

export const CATALOGUE_DISCLAIMER =
  "Catalogue data extracted from the official Danfoss documents in docs/datasheets/ " +
  "with page citations, pending application-engineer sign-off. Bandwidth figures and " +
  "power-capacity envelopes are graph-derived (±10%). To sign an entry off, confirm it " +
  "against the cited pages and set status: \"verified\" in web/data/valve-catalogue.js.";
