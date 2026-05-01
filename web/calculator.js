// Hydraulic System Calculator — entry point.
// Tabs render their own panels; this module wires the unit toggle, tab
// switching, and shared helpers. Per-tab logic lives in /tabs/.

import { tabs } from "./tabs/index.js";

const state = {
  unit: "metric",      // 'metric' | 'imperial'
  activeTab: tabs[0].id,
};

const tabbar = document.querySelector(".tabbar");
const panel = document.querySelector(".tab-panel");
const unitButtons = document.querySelectorAll(".unit-toggle__option");

function renderTabbar() {
  tabbar.innerHTML = tabs
    .map(
      (t) => `
      <button
        type="button"
        class="tab-button ${t.id === state.activeTab ? "is-active" : ""}"
        role="tab"
        aria-selected="${t.id === state.activeTab}"
        data-tab="${t.id}"
      >
        <span class="tab-button__icon" aria-hidden="true">${t.icon}</span>
        <span class="tab-button__label" data-short="${t.labelShort ?? t.label}">${t.label}</span>
        <span class="tab-button__hint">${t.hint}</span>
      </button>
    `
    )
    .join("");

  tabbar.querySelectorAll(".tab-button").forEach((btn) => {
    btn.addEventListener("click", () => setActiveTab(btn.dataset.tab));
  });
}

function renderPanel() {
  const tab = tabs.find((t) => t.id === state.activeTab);
  panel.innerHTML = "";
  tab.render(panel, { unit: state.unit, onUnitChange: setUnit });
}

function setActiveTab(id) {
  if (state.activeTab === id) return;
  state.activeTab = id;
  renderTabbar();
  renderPanel();
}

function setUnit(unit) {
  if (state.unit === unit) return;
  state.unit = unit;
  unitButtons.forEach((b) => {
    const active = b.dataset.unit === unit;
    b.classList.toggle("is-active", active);
    b.setAttribute("aria-pressed", String(active));
  });
  renderPanel();
}

unitButtons.forEach((btn) => {
  btn.addEventListener("click", () => setUnit(btn.dataset.unit));
});

renderTabbar();
renderPanel();
