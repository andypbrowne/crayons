import { FAMILIES, getFamilyCounts } from "./color-family.js";

export function initBrowseFiltersUI({ container, onFamilyChange }) {
  if (!container) {
    return { update() {} };
  }

  const familyCounts = getFamilyCounts();

  FAMILIES.forEach((family) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-family-chip";
    button.dataset.familyId = family.id;
    button.setAttribute("aria-pressed", "false");

    const swatch = document.createElement("span");
    swatch.className = "color-family-chip-swatch";
    swatch.style.backgroundColor = family.swatch;
    swatch.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "color-family-chip-label";
    label.textContent = family.label;

    const countEl = document.createElement("span");
    countEl.className = "color-family-chip-count";
    countEl.textContent = String(familyCounts[family.id] ?? 0);

    button.appendChild(swatch);
    button.appendChild(label);
    button.appendChild(countEl);

    button.addEventListener("click", () => {
      const isActive = button.classList.contains("is-active");
      onFamilyChange(isActive ? null : family.id);
    });

    container.appendChild(button);
  });

  function update(state) {
    const selected = state.colorFamily ?? null;
    container.querySelectorAll(".color-family-chip").forEach((chip) => {
      const active = chip.dataset.familyId === selected;
      chip.classList.toggle("is-active", active);
      chip.setAttribute("aria-pressed", String(active));
    });
  }

  return { update };
}
