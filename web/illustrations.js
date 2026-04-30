// Hand-crafted isometric illustrations for each calculator tab.
// Two-tone: Danfoss red accent + dark neutral, on a transparent
// background so the hero card's tinted surface shows through.

const RED = "#ED071B";
const INK = "#0F0F10";
const STEEL = "#D4D4D8";
const SHADOW = "rgba(15,15,16,0.08)";

const wrap = (inner) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" role="img">${inner}</svg>`;

export const illustrations = {
  // Hydraulic cylinder — isometric body with extending rod.
  cylinder: wrap(`
    <defs>
      <linearGradient id="cyl-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#1f1f22"/>
        <stop offset="1" stop-color="#0a0a0c"/>
      </linearGradient>
    </defs>
    <ellipse cx="110" cy="200" rx="90" ry="10" fill="${SHADOW}"/>
    <!-- Cylinder body -->
    <g transform="translate(20,52)">
      <rect x="0" y="20" width="130" height="58" rx="6" fill="url(#cyl-body)"/>
      <rect x="0" y="20" width="130" height="58" rx="6" fill="none" stroke="${INK}" stroke-width="1.2"/>
      <ellipse cx="0" cy="49" rx="6" ry="29" fill="#0a0a0c" stroke="${INK}" stroke-width="1.2"/>
      <ellipse cx="130" cy="49" rx="6" ry="29" fill="#1c1c1f" stroke="${INK}" stroke-width="1.2"/>
      <!-- Mounting feet -->
      <rect x="14" y="78" width="22" height="10" rx="2" fill="${INK}"/>
      <rect x="94" y="78" width="22" height="10" rx="2" fill="${INK}"/>
      <!-- Port -->
      <rect x="20" y="10" width="14" height="14" rx="2" fill="${RED}"/>
      <!-- Piston rod extending out -->
      <rect x="136" y="44" width="58" height="12" rx="3" fill="#9a9aa1" stroke="${INK}" stroke-width="1.2"/>
      <ellipse cx="194" cy="50" rx="3" ry="6" fill="${RED}" stroke="${INK}" stroke-width="1.2"/>
      <!-- Stroke arrow -->
      <g stroke="${RED}" stroke-width="1.6" fill="none" stroke-linecap="round">
        <path d="M148 30 L188 30"/>
        <path d="M184 26 L188 30 L184 34"/>
      </g>
    </g>
  `),

  // Hydraulic motor — round housing with shaft + ports.
  motor: wrap(`
    <ellipse cx="110" cy="200" rx="80" ry="9" fill="${SHADOW}"/>
    <g transform="translate(40,40)">
      <!-- Housing -->
      <circle cx="70" cy="70" r="62" fill="#16161a" stroke="${INK}" stroke-width="1.2"/>
      <circle cx="70" cy="70" r="52" fill="#0a0a0c" stroke="#26262b" stroke-width="1"/>
      <!-- Cooling fins -->
      <g stroke="${STEEL}" stroke-width="1" opacity="0.55">
        <circle cx="70" cy="70" r="44" fill="none"/>
        <circle cx="70" cy="70" r="38" fill="none"/>
        <circle cx="70" cy="70" r="32" fill="none"/>
      </g>
      <!-- Shaft -->
      <rect x="60" y="-6" width="20" height="22" rx="3" fill="#9a9aa1" stroke="${INK}" stroke-width="1.2"/>
      <circle cx="70" cy="70" r="14" fill="${RED}"/>
      <circle cx="70" cy="70" r="6" fill="#0a0a0c"/>
      <!-- Ports -->
      <rect x="-8" y="60" width="14" height="20" rx="2" fill="${INK}"/>
      <rect x="134" y="60" width="14" height="20" rx="2" fill="${INK}"/>
      <!-- Mount holes -->
      <g fill="#26262b">
        <circle cx="22" cy="22" r="3"/>
        <circle cx="118" cy="22" r="3"/>
        <circle cx="22" cy="118" r="3"/>
        <circle cx="118" cy="118" r="3"/>
      </g>
    </g>
  `),

  // Gear pump — two intermeshing gears with ports.
  pump: wrap(`
    <ellipse cx="110" cy="200" rx="80" ry="9" fill="${SHADOW}"/>
    <g transform="translate(20,46)">
      <!-- Housing -->
      <rect x="0" y="0" width="180" height="118" rx="14" fill="#16161a" stroke="${INK}" stroke-width="1.2"/>
      <!-- Inlet/outlet ports -->
      <rect x="-10" y="48" width="14" height="22" rx="2" fill="${INK}"/>
      <rect x="176" y="48" width="14" height="22" rx="2" fill="${INK}"/>
      <text x="-2" y="42" font-family="ui-monospace, monospace" font-size="10" fill="${RED}" text-anchor="middle">IN</text>
      <text x="183" y="42" font-family="ui-monospace, monospace" font-size="10" fill="${RED}" text-anchor="middle">OUT</text>
      <!-- Gears -->
      <g stroke="${INK}" stroke-width="1.2">
        <circle cx="60" cy="59" r="34" fill="#0a0a0c"/>
        <circle cx="120" cy="59" r="34" fill="#0a0a0c"/>
        <circle cx="60" cy="59" r="6" fill="${RED}"/>
        <circle cx="120" cy="59" r="6" fill="${RED}"/>
      </g>
      <!-- Tooth ticks -->
      <g stroke="${STEEL}" stroke-width="1.4" stroke-linecap="round" opacity="0.7">
        ${Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x1 = 60 + Math.cos(a) * 28;
          const y1 = 59 + Math.sin(a) * 28;
          const x2 = 60 + Math.cos(a) * 33;
          const y2 = 59 + Math.sin(a) * 33;
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
        }).join("")}
        ${Array.from({ length: 12 }, (_, i) => {
          const a = (i / 12) * Math.PI * 2;
          const x1 = 120 + Math.cos(a) * 28;
          const y1 = 59 + Math.sin(a) * 28;
          const x2 = 120 + Math.cos(a) * 33;
          const y2 = 59 + Math.sin(a) * 33;
          return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
        }).join("")}
      </g>
    </g>
  `),

  // Orifice plate between two flanges.
  orifice: wrap(`
    <ellipse cx="110" cy="200" rx="80" ry="9" fill="${SHADOW}"/>
    <g transform="translate(10,70)">
      <!-- Left pipe -->
      <rect x="0" y="20" width="78" height="40" fill="#1c1c1f" stroke="${INK}" stroke-width="1.2"/>
      <!-- Left flange -->
      <rect x="78" y="6" width="12" height="68" fill="#0a0a0c" stroke="${INK}" stroke-width="1.2"/>
      <!-- Orifice plate (the narrow plate between flanges) -->
      <rect x="92" y="2" width="6" height="76" fill="${RED}" stroke="${INK}" stroke-width="1.2"/>
      <circle cx="95" cy="40" r="5" fill="#16161a" stroke="${INK}" stroke-width="1"/>
      <!-- Right flange -->
      <rect x="100" y="6" width="12" height="68" fill="#0a0a0c" stroke="${INK}" stroke-width="1.2"/>
      <!-- Right pipe -->
      <rect x="112" y="20" width="78" height="40" fill="#1c1c1f" stroke="${INK}" stroke-width="1.2"/>
      <!-- Bolts -->
      <g fill="${STEEL}">
        <circle cx="84" cy="14" r="2.2"/>
        <circle cx="84" cy="66" r="2.2"/>
        <circle cx="106" cy="14" r="2.2"/>
        <circle cx="106" cy="66" r="2.2"/>
      </g>
      <!-- Flow arrow -->
      <g stroke="${RED}" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path d="M30 40 L70 40"/>
        <path d="M64 34 L70 40 L64 46"/>
        <path d="M120 40 L160 40"/>
        <path d="M154 34 L160 40 L154 46"/>
      </g>
    </g>
  `),

  // Pipe section, angled, with flow direction indicator.
  pipe: wrap(`
    <ellipse cx="110" cy="200" rx="80" ry="9" fill="${SHADOW}"/>
    <g transform="translate(20,40)">
      <!-- Outer pipe (long diagonal) -->
      <g transform="rotate(-18 90 70)">
        <rect x="-10" y="40" width="200" height="60" rx="14" fill="#16161a" stroke="${INK}" stroke-width="1.2"/>
        <rect x="-10" y="40" width="200" height="14" fill="#26262b"/>
        <rect x="-10" y="86" width="200" height="14" fill="#0a0a0c"/>
        <!-- Inside diameter line -->
        <rect x="-10" y="56" width="200" height="28" fill="#0a0a0c"/>
        <!-- Flow arrow -->
        <g stroke="${RED}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 70 L160 70"/>
          <path d="M150 62 L160 70 L150 78"/>
        </g>
      </g>
      <!-- End cap rings -->
      <ellipse cx="184" cy="42" rx="6" ry="20" fill="${RED}" opacity="0.85"/>
    </g>
  `),
};
