// Copy / Reset / Email button bar — shared across all tabs.

import { icons } from "./icons.js";

export function actionsBar({ onCopy, onReset, onEmail }) {
  const el = document.createElement("div");
  el.className = "actions";
  el.innerHTML = `
    <button type="button" class="action" data-act="copy">${icons.copy}<span>Copy</span></button>
    <button type="button" class="action" data-act="reset">${icons.refresh}<span>Reset</span></button>
    <span class="actions__spacer"></span>
    <button type="button" class="action action--primary" data-act="email">${icons.mail}<span>Email</span></button>
  `;
  el.querySelector('[data-act="copy"]').addEventListener("click", onCopy);
  el.querySelector('[data-act="reset"]').addEventListener("click", onReset);
  el.querySelector('[data-act="email"]').addEventListener("click", onEmail);
  return el;
}

export async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    flash(btn, "Copied");
  } catch {
    flash(btn, "Copy failed");
  }
}

export function emailLink(subject, body) {
  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function flash(btn, msg) {
  if (!btn) return;
  const label = btn.querySelector("span");
  if (!label) return;
  const old = label.textContent;
  label.textContent = msg;
  setTimeout(() => (label.textContent = old), 1400);
}
