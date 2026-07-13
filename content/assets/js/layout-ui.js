import { LAYOUT_VALUES, setState } from "./app-state.js";

const STORAGE_KEY = "crayons:layout";

export const LAYOUT_OPTIONS = [
  { id: "list", label: "List" },
  { id: "grid", label: "Grid" },
  { id: "arc", label: "Arc" },
  { id: "pile", label: "Pile" },
];

export function loadSavedLayout() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return LAYOUT_VALUES.has(value) ? value : "list";
  } catch {
    return "list";
  }
}

function saveLayout(layout) {
  try {
    localStorage.setItem(STORAGE_KEY, layout);
  } catch {
    // Ignore quota / private-mode failures.
  }
}

function hashHex(hex) {
  let hash = 0;
  const value = String(hex);
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function seedPileVars(crayonList) {
  crayonList.querySelectorAll("li[data-hex]").forEach((item) => {
    const hash = hashHex(item.dataset.hex);
    const rotate = (hash % 141) - 70;
    // Keep inset so list-sized rotated crayons stay on stage
    const x = 14 + (hash % 720) / 10;
    const y = 16 + (Math.floor(hash / 9) % 680) / 10;
    const z = (hash % 60) + 1;

    item.style.setProperty("--pile-rotate", `${rotate}deg`);
    item.style.setProperty("--pile-x", `${x}%`);
    item.style.setProperty("--pile-y", `${y}%`);
    item.style.setProperty("--pile-z", String(z));
  });
}

function clearArcStyles(crayonList) {
  crayonList.style.removeProperty("--arc-stage-width");
  crayonList.style.removeProperty("--arc-stage-height");
  crayonList.querySelectorAll("li[data-hex]").forEach((item) => {
    item.style.removeProperty("--arc-x");
    item.style.removeProperty("--arc-y");
    item.style.removeProperty("--arc-rotate");
  });
}

function applyArcLayout(crayonList) {
  const items = Array.from(crayonList.children).filter(
    (item) => item.matches("li[data-hex]") && !item.hidden,
  );
  const count = items.length;

  if (!count) {
    clearArcStyles(crayonList);
    return;
  }

  const spacing = Math.max(48, Math.min(92, 720 / Math.max(count, 1)));
  const radius = Math.max(220, (count * spacing) / Math.PI);
  const stageWidth = radius * 2 + 220;
  const stageHeight = radius * 0.72 + 120;

  crayonList.style.setProperty("--arc-stage-width", `${Math.round(stageWidth)}px`);
  crayonList.style.setProperty("--arc-stage-height", `${Math.round(stageHeight)}px`);

  items.forEach((item, index) => {
    const t = count === 1 ? 0.5 : index / (count - 1);
    const angle = Math.PI - t * Math.PI;
    const x = radius + Math.cos(angle) * radius + 40;
    const y = radius * 0.62 - Math.sin(angle) * radius * 0.55 + 24;
    const rotate = ((Math.PI / 2 - angle) * 180) / Math.PI;

    item.style.setProperty("--arc-x", `${Math.round(x)}px`);
    item.style.setProperty("--arc-y", `${Math.round(y)}px`);
    item.style.setProperty("--arc-rotate", `${rotate.toFixed(1)}deg`);
  });
}

function applyLayout(crayonList, layout) {
  crayonList.dataset.layout = layout;

  if (layout === "pile") {
    clearArcStyles(crayonList);
    seedPileVars(crayonList);
    return;
  }

  if (layout === "arc") {
    applyArcLayout(crayonList);
    return;
  }

  clearArcStyles(crayonList);
}

export function initLayoutUI({ crayonList, select }) {
  if (!crayonList) {
    return { update() {} };
  }

  if (select) {
    select.innerHTML = "";
    LAYOUT_OPTIONS.forEach((option) => {
      const el = document.createElement("option");
      el.value = option.id;
      el.textContent = option.label;
      select.appendChild(el);
    });

    select.addEventListener("change", (event) => {
      const layout = event.target.value;
      saveLayout(layout);
      setState({ layout });
    });
  }

  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (crayonList.dataset.layout === "arc") {
        applyArcLayout(crayonList);
      }
    }, 120);
  });

  function update(state) {
    const layout = LAYOUT_VALUES.has(state.layout) ? state.layout : "list";
    if (select && select.value !== layout) {
      select.value = layout;
    }
    applyLayout(crayonList, layout);
  }

  return { update };
}
