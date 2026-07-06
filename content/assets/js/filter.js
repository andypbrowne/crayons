import { normalizeHex } from "./color-utils.js";

export function applyFilter(crayonList, activeColors) {
  const items = Array.from(crayonList.children).filter(
    (item) => item.matches("li[data-hex]"),
  );
  const emptyState = document.getElementById("crayon-list-empty");

  if (!activeColors) {
    items.forEach((item) => {
      item.hidden = false;
      item.style.display = "";
    });
    if (emptyState) emptyState.hidden = true;
    return;
  }

  const allowed = new Set(activeColors.map((hex) => normalizeHex(hex)).filter(Boolean));
  let visibleCount = 0;

  items.forEach((item) => {
    const hex = normalizeHex(item.dataset.hex);
    const visible = hex && allowed.has(hex);
    item.hidden = !visible;
    item.style.display = visible ? "" : "none";
    if (visible) visibleCount += 1;
  });

  if (emptyState) {
    emptyState.hidden = visibleCount > 0;
  }
}
