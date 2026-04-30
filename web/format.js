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
