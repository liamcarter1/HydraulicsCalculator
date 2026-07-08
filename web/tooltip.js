// Shared tooltip — explains status pills and badges on hover, keyboard
// focus, or tap (native title="" tooltips never appear on touch devices).
//
// Usage: give any element a data-tip="explanation" attribute (and
// tabindex="0" if it isn't naturally focusable), then call attachTips(host)
// once after rendering. One floating element is shared app-wide; it is
// positioned fixed so it can't be clipped by the table's overflow-x
// scroll container.

let tipEl = null;
let currentTarget = null;
let shownAt = 0;

function ensureTipEl() {
  if (tipEl) return tipEl;
  tipEl = document.createElement("div");
  tipEl.className = "tooltip";
  tipEl.id = "app-tooltip";
  tipEl.setAttribute("role", "tooltip");
  document.body.appendChild(tipEl);
  // Tap elsewhere dismisses; scrolling repositions (hiding on scroll would
  // kill the tooltip the instant the browser auto-scrolls a pill into view).
  document.addEventListener("click", (e) => {
    if (currentTarget && !currentTarget.contains(e.target)) hide();
  });
  const reposition = () => {
    if (currentTarget) requestAnimationFrame(() => currentTarget && show(currentTarget));
  };
  window.addEventListener("scroll", reposition, { passive: true, capture: true });
  window.addEventListener("resize", hide, { passive: true });
  return tipEl;
}

function show(target) {
  const text = target.getAttribute("data-tip");
  if (!text) return;
  const el = ensureTipEl();
  if (currentTarget !== target) shownAt = performance.now();
  currentTarget = target;
  el.textContent = text;
  el.classList.add("is-visible");
  target.setAttribute("aria-describedby", "app-tooltip");

  // Position above the target, clamped to the viewport; flip below if tight.
  const r = target.getBoundingClientRect();
  el.style.left = "0px"; // reset before measuring
  el.style.top = "0px";
  const w = el.offsetWidth;
  const h = el.offsetHeight;
  let left = r.left + r.width / 2 - w / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
  let top = r.top - h - 8;
  if (top < 8) top = r.bottom + 8;
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
}

function hide() {
  if (!tipEl) return;
  tipEl.classList.remove("is-visible");
  if (currentTarget) currentTarget.removeAttribute("aria-describedby");
  currentTarget = null;
}

// Delegate within a container so re-rendered rows keep working without
// re-binding per element.
export function attachTips(container) {
  const find = (e) => e.target.closest?.("[data-tip]");
  // Touch taps emit synthetic mouseover/mouseout around the click — the
  // trailing mouseout must not hide the tooltip the tap just opened.
  let lastTouch = 0;
  container.addEventListener("touchend", () => { lastTouch = performance.now(); }, { passive: true });
  container.addEventListener("mouseover", (e) => {
    const t = find(e);
    if (t && t !== currentTarget) show(t);
  });
  container.addEventListener("mouseout", (e) => {
    if (performance.now() - lastTouch < 700) return;
    const t = find(e);
    if (t && !t.contains(e.relatedTarget)) hide();
  });
  container.addEventListener("focusin", (e) => {
    const t = find(e);
    if (t) show(t);
  });
  container.addEventListener("focusout", hide);
  // Tap toggles on touch. A tap fires mouseover THEN click, so the click
  // must not immediately undo the show the mouseover just did — only treat
  // it as "toggle off" once the tooltip has been up for a moment.
  container.addEventListener("click", (e) => {
    const t = find(e);
    if (!t) return;
    if (t === currentTarget && performance.now() - shownAt > 400) hide();
    else show(t);
  });
}
