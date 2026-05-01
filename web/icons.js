// Inline SVG icons. Lucide-style line icons for UI controls;
// referenced from tab definitions and action buttons.

const stroke = (d, opts = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${opts}>${d}</svg>`;

export const icons = {
  cylinder: stroke(`
    <ellipse cx="12" cy="6" rx="6.5" ry="2"/>
    <path d="M5.5 6v9c0 1.1 2.9 2 6.5 2s6.5-.9 6.5-2V6"/>
    <path d="M12 17v4"/>
    <path d="M9 21h6"/>
  `),
  motor: stroke(`
    <circle cx="12" cy="12" r="6.5"/>
    <circle cx="12" cy="12" r="2.2"/>
    <path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.2 5.2l2.1 2.1M16.7 16.7l2.1 2.1M5.2 18.8l2.1-2.1M16.7 7.3l2.1-2.1"/>
  `),
  pump: stroke(`
    <circle cx="12" cy="12" r="7"/>
    <path d="M12 5v7l5 3"/>
    <path d="M5 12h-3M22 12h-3"/>
  `),
  gauge: stroke(`
    <path d="M3 14a9 9 0 0 1 18 0"/>
    <path d="M12 14l5-4"/>
    <circle cx="12" cy="14" r="1.4"/>
    <path d="M3 14h2M19 14h2M12 5v2"/>
  `),
  pipe: stroke(`
    <path d="M3 8h7a4 4 0 0 1 4 4v0a4 4 0 0 0 4 4h3"/>
    <path d="M3 16h7a4 4 0 0 0 4-4v0a4 4 0 0 1 4-4h3"/>
  `),
  copy: stroke(`
    <rect x="9" y="9" width="11" height="11" rx="2"/>
    <path d="M5 15V6a2 2 0 0 1 2-2h9"/>
  `),
  refresh: stroke(`
    <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/>
    <path d="M21 3v5h-5"/>
    <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/>
    <path d="M3 21v-5h5"/>
  `),
  mail: stroke(`
    <rect x="3" y="5" width="18" height="14" rx="2"/>
    <path d="M3 7l9 6 9-6"/>
  `),
  info: stroke(`
    <circle cx="12" cy="12" r="9"/>
    <path d="M12 11v5"/>
    <circle cx="12" cy="8" r=".8" fill="currentColor"/>
  `),
};
