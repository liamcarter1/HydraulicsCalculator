// Symbol glossary — shared definitions for the letters that appear in the
// formula cards. Applications engineers asked for this: the equations use
// terse symbols (R, ηv, FR, Z …) and it wasn't clear what each one means.
//
// Each tab assembles its own list from the dictionary below via g(), so the
// glossary only ever shows symbols that actually appear in that tab's
// formulas. Units that change with the Metric/Inch toggle are passed in by
// the caller; units that are fixed (rpm, %, cP …) live on the definition.

export const G = {
  // Geometry & cylinder ----------------------------------------------------
  pi:      { sym: "π",   name: "Pi",                              desc: "Circle constant, ≈ 3.14159." },
  R:       { sym: "R",   name: "Bore radius",                     desc: "Half the piston / bore diameter (½ × bore Ø)." },
  r:       { sym: "r",   name: "Rod radius",                      desc: "Half the rod diameter (½ × rod Ø)." },
  L:       { sym: "L",   name: "Stroke",                          desc: "Distance the piston travels end to end." },
  A:       { sym: "A",   name: "Area",                            desc: "Effective piston area on the side shown." },
  Vvol:    { sym: "V",   name: "Volume",                          desc: "Oil volume swept over the full stroke." },
  F:       { sym: "F",   name: "Force",                           desc: "Push / pull the cylinder develops (P × A)." },
  FR:      { sym: "FR",  name: "Oil flow rate",                   desc: "Inlet flow supplied to the cylinder." },
  Ttime:   { sym: "T",   name: "Time",            unit: "sec",    desc: "Time to complete the stroke (volume ÷ flow)." },
  vvel:    { sym: "v",   name: "Velocity",                        desc: "Rod travel speed (stroke ÷ time)." },
  Out:     { sym: "Out", name: "Outflow",                         desc: "Oil pushed out of the opposite port." },
  Z:       { sym: "Z",   name: "Area ratio",      unit: ": 1",    desc: "Bore-side area ÷ rod-side area." },

  // Shared hydraulics ------------------------------------------------------
  P:       { sym: "P",   name: "Pressure",                        desc: "Working hydraulic pressure." },
  Q:       { sym: "Q",   name: "Flow rate",                       desc: "Volume of oil moved per unit time." },
  N:       { sym: "N",   name: "Speed",            unit: "rpm",   desc: "Rotational speed of the shaft." },
  Pw:      { sym: "Pw",  name: "Power",                           desc: "Mechanical or hydraulic power." },

  // Motor / pump -----------------------------------------------------------
  Vdisp:   { sym: "V",   name: "Displacement",                    desc: "Swept volume per revolution." },
  Ttorque: { sym: "T",   name: "Torque",                          desc: "Rotational moment at the shaft." },
  eta_v:   { sym: "ηv",  name: "Volumetric efficiency", unit: "%", desc: "Delivered flow ÷ theoretical flow — accounts for internal leakage." },
  eta_m:   { sym: "ηm",  name: "Mechanical efficiency", unit: "%", desc: "Useful torque ÷ theoretical torque — accounts for friction." },
  eta_t:   { sym: "ηt",  name: "Total efficiency",      unit: "%", desc: "Overall efficiency (volumetric × mechanical)." },
  kconst:  { sym: "constants", name: "Unit constants",            desc: "Fixed numbers (231, 1714, 600, 20π …) that convert the formula to the chosen unit system — not inputs you enter." },

  // Pressure drop ----------------------------------------------------------
  dP:      { sym: "ΔP",  name: "Pressure drop",                   desc: "Pressure lost across the orifice." },
  d:       { sym: "d",   name: "Diameter",                        desc: "Inside diameter of the orifice / pipe." },
  K:       { sym: "K",   name: "Orifice flow coefficient",        desc: "Discharge coefficient of the orifice (dimensionless, typically 0.6–0.8)." },
  Sg:      { sym: "Sg",  name: "Specific gravity",                desc: "Fluid density relative to water (dimensionless)." },
  rho:     { sym: "ρ",   name: "Fluid density",   unit: "kg/m³",  desc: "Mass per unit volume (1000 × Sg)." },

  // Piping -----------------------------------------------------------------
  Re:      { sym: "Re",  name: "Reynolds number",                 desc: "Flow-regime indicator: < 2300 laminar, > 4000 turbulent." },
  mu:      { sym: "μ",   name: "Absolute viscosity", unit: "cP",  desc: "Dynamic (absolute) viscosity of the fluid." },
  nu:      { sym: "ν",   name: "Kinematic viscosity", unit: "cSt", desc: "Kinematic viscosity (absolute viscosity ÷ density)." },
};

// Build a glossary entry from a dictionary key. Pass a unit string to override
// the toggle-dependent unit; pass "" to force "no unit"; omit to use the
// definition's own fixed unit (if any).
export function g(key, unit) {
  const base = G[key];
  if (!base) return { sym: key, name: key };
  return unit === undefined ? { ...base } : { ...base, unit };
}

// Render a list of entries into the glossary block shown under the formulas.
export function glossaryHTML(entries) {
  const items = entries
    .filter(Boolean)
    .map(
      (e) => `
      <div class="glossary__item">
        <dt class="glossary__sym">${e.sym}</dt>
        <dd class="glossary__def">
          <span class="glossary__name">${e.name}${
        e.unit ? ` <span class="glossary__unit">${e.unit}</span>` : ""
      }</span>
          ${e.desc ? `<span class="glossary__desc">${e.desc}</span>` : ""}
        </dd>
      </div>`
    )
    .join("");
  return `
    <div class="glossary">
      <p class="glossary__title">Symbol glossary</p>
      <dl class="glossary__grid">${items}</dl>
    </div>`;
}
