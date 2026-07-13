import { LAYOUT_VALUES, setState } from "./app-state.js";

const STORAGE_KEY = "crayons:layout";
const TWO_PI = Math.PI * 2;
const ARC_GAP_PX = 6;
const ARC_WHEEL_SCALE = 0.0022;
const ARC_DRAG_SCALE = 0.005;
const ARC_STAGE_LABEL =
  "Crayon arc. Use left and right arrow keys or scroll to rotate.";

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

function seedPileVars(crayonList, seed = 0) {
  crayonList.querySelectorAll("li[data-hex]").forEach((item) => {
    const hash = hashHex(item.dataset.hex) ^ (seed >>> 0);
    const rotate = (hash % 141) - 70;
    const x = 14 + (hash % 720) / 10;
    const y = 16 + (Math.floor(hash / 9) % 680) / 10;
    const z = (hash % 60) + 1;

    item.style.setProperty("--pile-rotate", `${rotate}deg`);
    item.style.setProperty("--pile-x", `${x}%`);
    item.style.setProperty("--pile-y", `${y}%`);
    item.style.setProperty("--pile-z", String(z));
  });
}

function getVisibleCrayons(crayonList) {
  return Array.from(crayonList.children).filter(
    (item) => item.matches("li[data-hex]") && !item.hidden,
  );
}

function readCrayonHeightPx(crayonList) {
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:absolute;visibility:hidden;height:var(--crayon-height);pointer-events:none";
  crayonList.appendChild(probe);
  const height = probe.getBoundingClientRect().height || 36;
  probe.remove();
  return height;
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

/**
 * Smile fan: crayons on a full circle, stage clips to the lower arc.
 * Wheel/drag updates a shared offset; paint is rAF-throttled.
 */
function createArcController(crayonList) {
  let offset = 0;
  let rafId = 0;
  let items = [];
  let radius = 0;
  let cx = 0;
  let cy = 0;
  let bound = false;
  let dragging = false;
  let lastPointerX = 0;

  function layoutGeometry() {
    items = getVisibleCrayons(crayonList);
    const count = items.length;
    if (!count) {
      radius = 0;
      return;
    }

    const stageWidth = crayonList.clientWidth || window.innerWidth;
    const stageHeight = crayonList.clientHeight || window.innerHeight * 0.7;
    const crayonHeight = readCrayonHeightPx(crayonList);
    const crayonLength = crayonHeight * (1172 / 121);
    const spacing = crayonHeight + ARC_GAP_PX;
    const minRadius = Math.max(stageWidth * 0.55, stageHeight * 0.55);
    radius = Math.max(minRadius, (count * spacing) / TWO_PI);

    // Lowest crayon (butt at bottom of smile) sits near mid-stage.
    // At θ=π/2 the crayon is radial, so ~half its length hangs below the arc.
    const isCompact = stageWidth < 720 || stageHeight < 640;
    const smileBottom = stageHeight * (isCompact ? 0.67 : 0.7);
    cx = stageWidth / 2;
    cy = smileBottom - radius - crayonLength * 0.45;
  }

  function stepAngle() {
    const count = items.length || 1;
    return TWO_PI / count;
  }

  function nudgeOffset(delta) {
    offset += delta;
    schedulePaint();
  }

  function paint() {
    rafId = 0;
    const count = items.length;
    if (!count || !radius) return;

    const step = TWO_PI / count;
    items.forEach((item, index) => {
      const theta = offset + index * step;
      const x = cx + radius * Math.cos(theta);
      const y = cy + radius * Math.sin(theta);
      // Radial: tip points toward center (inward).
      const rotateDeg = ((theta + Math.PI) * 180) / Math.PI;

      item.style.setProperty("--arc-x", `${Math.round(x)}px`);
      item.style.setProperty("--arc-y", `${Math.round(y)}px`);
      item.style.setProperty("--arc-rotate", `${rotateDeg.toFixed(2)}deg`);
    });
  }

  function schedulePaint() {
    if (rafId) return;
    rafId = requestAnimationFrame(paint);
  }

  function onWheel(event) {
    event.preventDefault();
    if (prefersReducedMotion()) {
      const direction = event.deltaY + event.deltaX >= 0 ? 1 : -1;
      nudgeOffset(direction * stepAngle());
      return;
    }
    nudgeOffset(event.deltaY * ARC_WHEEL_SCALE + event.deltaX * ARC_WHEEL_SCALE);
  }

  function onKeyDown(event) {
    if (event.target.closest("button, a, input, select, textarea, [popover]")) {
      return;
    }
    if (
      event.key !== "ArrowLeft" &&
      event.key !== "ArrowRight" &&
      event.key !== "ArrowUp" &&
      event.key !== "ArrowDown"
    ) {
      return;
    }

    event.preventDefault();
    const step = stepAngle();
    if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nudgeOffset(-step);
    } else {
      nudgeOffset(step);
    }
  }

  function onPointerDown(event) {
    if (prefersReducedMotion()) return;
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest("button, a, [popover], .row-actions-menu")) return;
    dragging = true;
    lastPointerX = event.clientX;
    crayonList.setPointerCapture?.(event.pointerId);
  }

  function onPointerMove(event) {
    if (!dragging) return;
    const dx = event.clientX - lastPointerX;
    lastPointerX = event.clientX;
    nudgeOffset(dx * ARC_DRAG_SCALE);
  }

  function onPointerUp(event) {
    if (!dragging) return;
    dragging = false;
    try {
      crayonList.releasePointerCapture?.(event.pointerId);
    } catch {
      // Ignore if capture was already released.
    }
  }

  function bind() {
    if (bound) return;
    bound = true;
    crayonList.tabIndex = 0;
    crayonList.setAttribute("aria-label", ARC_STAGE_LABEL);
    crayonList.addEventListener("wheel", onWheel, { passive: false });
    crayonList.addEventListener("keydown", onKeyDown);
    crayonList.addEventListener("pointerdown", onPointerDown);
    crayonList.addEventListener("pointermove", onPointerMove);
    crayonList.addEventListener("pointerup", onPointerUp);
    crayonList.addEventListener("pointercancel", onPointerUp);
  }

  function unbind() {
    if (!bound) return;
    bound = false;
    dragging = false;
    crayonList.removeAttribute("tabindex");
    crayonList.removeAttribute("aria-label");
    crayonList.removeEventListener("wheel", onWheel);
    crayonList.removeEventListener("keydown", onKeyDown);
    crayonList.removeEventListener("pointerdown", onPointerDown);
    crayonList.removeEventListener("pointermove", onPointerMove);
    crayonList.removeEventListener("pointerup", onPointerUp);
    crayonList.removeEventListener("pointercancel", onPointerUp);
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = 0;
    }
  }

  function refresh() {
    layoutGeometry();
    paint();
  }

  function activate() {
    bind();
    refresh();
    // Re-measure after CSS stage height applies.
    requestAnimationFrame(() => {
      if (crayonList.dataset.layout === "arc") refresh();
    });
  }

  function deactivate() {
    unbind();
    clearArcStyles(crayonList);
  }

  return { activate, deactivate, refresh };
}

export function initLayoutUI({ crayonList, select }) {
  if (!crayonList) {
    return { update() {} };
  }

  const arc = createArcController(crayonList);
  let activeLayout = null;

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
        arc.refresh();
      }
    }, 120);
  });

  function applyLayout(layout, state) {
    crayonList.dataset.layout = layout;

    if (layout === "arc") {
      if (activeLayout !== "arc") {
        arc.activate();
      } else {
        arc.refresh();
      }
      activeLayout = layout;
      return;
    }

    if (activeLayout === "arc") {
      arc.deactivate();
    }

    if (layout === "pile") {
      const seed = state?.sort === "random" ? state.shuffleSeed : 0;
      seedPileVars(crayonList, seed);
    } else {
      clearArcStyles(crayonList);
    }

    activeLayout = layout;
  }

  function update(state) {
    const layout = LAYOUT_VALUES.has(state.layout) ? state.layout : "list";
    if (select && select.value !== layout) {
      select.value = layout;
    }
    applyLayout(layout, state);
  }

  return { update };
}
