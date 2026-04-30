// Tab registry. Each tab defines its id, label, hint, icon, and a render
// function that mounts the tab's UI into a container element.

import { icons } from "../icons.js";
import { renderCylinder } from "./cylinder.js";
import { renderMotor } from "./motor.js";
import { renderPump } from "./pump.js";
import { renderPressureDrop } from "./pressure-drop.js";
import { renderPiping } from "./piping.js";

export const tabs = [
  {
    id: "cylinder",
    label: "Cylinder",
    hint: "Force, velocity, ratio",
    icon: icons.cylinder,
    render: renderCylinder,
  },
  {
    id: "motor",
    label: "Motor",
    hint: "Flow, pressure, power",
    icon: icons.motor,
    render: renderMotor,
  },
  {
    id: "pump",
    label: "Pump",
    hint: "Displacement, flow, drive",
    icon: icons.pump,
    render: renderPump,
  },
  {
    id: "pressure-drop",
    label: "Pressure Drop",
    hint: "Orifice ΔP",
    icon: icons.gauge,
    render: renderPressureDrop,
  },
  {
    id: "piping",
    label: "Piping",
    hint: "Velocity, Reynolds №",
    icon: icons.pipe,
    render: renderPiping,
  },
];
