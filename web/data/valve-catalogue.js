// Vickers-by-Danfoss proportional directional valve catalogue — seed data.
//
// ⚠️  EVERY ENTRY IS UNVERIFIED (verified: false). Ratings were seeded from
//     public Danfoss / Eaton / Vickers literature while building the tool and
//     MUST be checked by an application engineer before customer release.
//
// To verify an entry:
//   1. Open the current datasheet for the series (start from datasheet_url).
//   2. Confirm q_rated_lpm, dp_ref_bar, dp_basis, p_max_bar, bandwidth_hz,
//      step_ms against the document. Fix anything that differs.
//   3. Replace datasheet_url with the exact document you used.
//   4. Set verified: true — the amber "unverified" badge disappears.
// To add a valve, copy any entry and fill in the same fields. Imperial
// figures (gpm / psi) are derived automatically below — only edit metric.
//
// Field notes:
//   dp_basis   "total"    → dp_ref is the TOTAL drop across both metering
//                           lands (servo convention, e.g. 70 bar ⇒ 35/land).
//              "per_land" → dp_ref is per metering land (industrial
//                           proportional convention, typically 10 bar).
//   bandwidth_hz  −3 dB small-signal frequency response; null = not published.
//   performance_class  "servo" | "feedback" | "basic" — display grouping.

const RAW = [
  // KBSDG4V-3 — NG6 (D03) servo-performance proportional, OBE + spool feedback
  { id: "kbsdg4v3-05",  series: "KBSDG4V-3", code: "5",   size: "NG6 (D03)",
    q_rated_lpm: 5,   dp_ref_bar: 70, dp_basis: "total", p_max_bar: 350,
    bandwidth_hz: 90, step_ms: 10, feedback: true, performance_class: "servo" },
  { id: "kbsdg4v3-12",  series: "KBSDG4V-3", code: "12",  size: "NG6 (D03)",
    q_rated_lpm: 12,  dp_ref_bar: 70, dp_basis: "total", p_max_bar: 350,
    bandwidth_hz: 90, step_ms: 10, feedback: true, performance_class: "servo" },
  { id: "kbsdg4v3-24",  series: "KBSDG4V-3", code: "24",  size: "NG6 (D03)",
    q_rated_lpm: 24,  dp_ref_bar: 70, dp_basis: "total", p_max_bar: 350,
    bandwidth_hz: 90, step_ms: 10, feedback: true, performance_class: "servo" },
  { id: "kbsdg4v3-40",  series: "KBSDG4V-3", code: "40",  size: "NG6 (D03)",
    q_rated_lpm: 40,  dp_ref_bar: 70, dp_basis: "total", p_max_bar: 350,
    bandwidth_hz: 90, step_ms: 10, feedback: true, performance_class: "servo" },

  // KBSDG4V-5 — NG10 (D05) servo-performance proportional
  { id: "kbsdg4v5-63",  series: "KBSDG4V-5", code: "63",  size: "NG10 (D05)",
    q_rated_lpm: 63,  dp_ref_bar: 70, dp_basis: "total", p_max_bar: 350,
    bandwidth_hz: 60, step_ms: 15, feedback: true, performance_class: "servo" },
  { id: "kbsdg4v5-100", series: "KBSDG4V-5", code: "100", size: "NG10 (D05)",
    q_rated_lpm: 100, dp_ref_bar: 70, dp_basis: "total", p_max_bar: 350,
    bandwidth_hz: 60, step_ms: 15, feedback: true, performance_class: "servo" },

  // KFDG4V — proportional directional with spool feedback
  { id: "kfdg4v3-40",   series: "KFDG4V-3",  code: "40",  size: "NG6 (D03)",
    q_rated_lpm: 40,  dp_ref_bar: 10, dp_basis: "per_land", p_max_bar: 350,
    bandwidth_hz: 25, step_ms: 25, feedback: true, performance_class: "feedback" },
  { id: "kfdg4v5-100",  series: "KFDG4V-5",  code: "100", size: "NG10 (D05)",
    q_rated_lpm: 100, dp_ref_bar: 10, dp_basis: "per_land", p_max_bar: 350,
    bandwidth_hz: 20, step_ms: 40, feedback: true, performance_class: "feedback" },

  // KDG4V / KDG5V — basic proportional, no spool feedback (open loop)
  { id: "kdg4v3-40",    series: "KDG4V-3",   code: "40",  size: "NG6 (D03)",
    q_rated_lpm: 40,  dp_ref_bar: 10, dp_basis: "per_land", p_max_bar: 345,
    bandwidth_hz: null, step_ms: null, feedback: false, performance_class: "basic" },
  { id: "kdg5v5-80",    series: "KDG5V-5",   code: "80",  size: "NG10 (D05)",
    q_rated_lpm: 80,  dp_ref_bar: 10, dp_basis: "per_land", p_max_bar: 345,
    bandwidth_hz: null, step_ms: null, feedback: false, performance_class: "basic" },
];

// Every entry starts unverified; the datasheet link is a live search on the
// Danfoss site for the series (deep PDF links rot — engineers paste the exact
// document URL when they verify).
const seed = (v) => ({
  ...v,
  verified: false,
  datasheet_url: `https://www.danfoss.com/en/search/?query=${encodeURIComponent(v.series)}`,
});

// Imperial figures derived once, visibly — the sizing engine compares native
// numbers per unit system rather than silently converting mid-calculation.
const LPM_PER_GPM = 3.785412;
const PSI_PER_BAR = 14.5038;
const withImperial = (v) => ({
  ...v,
  q_rated_gpm: +(v.q_rated_lpm / LPM_PER_GPM).toFixed(2),
  dp_ref_psi: +(v.dp_ref_bar * PSI_PER_BAR).toFixed(0),
  p_max_psi: +(v.p_max_bar * PSI_PER_BAR).toFixed(0),
});

export const CATALOGUE = RAW.map(seed).map(withImperial);

export const CATALOGUE_DISCLAIMER =
  "Catalogue data pending engineering verification — every rating below was " +
  "seeded from public datasheets and is marked unverified. Edit " +
  "web/data/valve-catalogue.js to confirm or replace values before customer release.";
