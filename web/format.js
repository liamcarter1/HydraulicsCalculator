// Number formatting shared across tabs. Trelleborg shows ~4 sig figs;
// we follow the same rule but cap decimals so the columns stay tidy.

export function fmt(value, { decimals = 3, blank = "—" } = {}) {
  if (value == null || !Number.isFinite(value)) return blank;
  if (value === 0) return "0";
  const abs = Math.abs(value);
  if (abs >= 100000 || abs < 0.001) {
    return value.toExponential(2).replace("e", "·10^");
  }
  // Adaptive decimals so big numbers don't print 5 decimals.
  const auto =
    abs >= 1000 ? 0 :
    abs >= 100  ? 1 :
    abs >= 10   ? 2 :
    abs >= 1    ? 3 :
                  4;
  return value.toFixed(Math.min(decimals, auto));
}

// --- Fractional-inch display ------------------------------------------------
// Imperial dimensions are conventionally read off a machinist's rule, whose
// finest standard graduation is 1/64". These helpers express a decimal inch
// value as the nearest fractional-inch reading (display only — inputs stay
// decimal and the maths is unaffected). UK and US share the same binary
// fractional system, so there's no per-locale variation here.

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));

// Round to the nearest 1/denom" and reduce to lowest terms. Returns
// { text, exact } where text is full-size engineering notation — a mixed
// number ("2-1/4″"), a bare fraction ("19/64″") or a whole ("3″"). `exact`
// is false when rounding moved the value, so the caller can flag it with "≈".
// Returns null when there's nothing meaningful to show (blank, non-finite,
// ≤ 0, or rounds below half a tick).
export function inchFraction(value, { denom = 64 } = {}) {
  const n = typeof value === "number" ? value : parseFloat(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  const ticks = Math.round(n * denom);
  if (ticks <= 0) return null;
  const exact = Math.abs(n * denom - ticks) < 1e-9;
  const whole = Math.floor(ticks / denom);
  let num = ticks - whole * denom;
  let den = denom;
  if (num > 0) {
    const g = gcd(num, den);
    num /= g;
    den /= g;
  }
  let body;
  if (whole > 0 && num > 0) body = `${whole}-${num}/${den}`; // 2-1/4
  else if (num > 0) body = `${num}/${den}`;                  // 19/64
  else body = String(whole);                                 // 3
  return { text: `${body}″`, exact };
}

// Convenience: a bracketed label to sit beside the decimal value, e.g.
// "(2-1/4″)" or "(≈ 19/64″)" when rounded. Empty string when there's nothing
// to show, so it drops straight into an element without conditionals.
export function inchFractionHint(value, opts) {
  const f = inchFraction(value, opts);
  return f ? `(${f.exact ? "" : "≈ "}${f.text})` : "";
}
