const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const MOTION = {
  sort: { maxStaggerMs: 160 },
  shuffle: { maxStaggerMs: 200 },
  "list-grid": { maxStaggerMs: 140 },
  "arc-in": { maxStaggerMs: 220 },
  "arc-out": { maxStaggerMs: 180 },
  "pile-in": { maxStaggerMs: 240 },
  "pile-out": { maxStaggerMs: 180 },
  "arc-pile": { maxStaggerMs: 220 },
};

function prefersReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

export function canUseViewTransitions() {
  return (
    typeof document.startViewTransition === "function" &&
    !prefersReducedMotion()
  );
}

/**
 * Pick a motion preset from the before/after layout + what changed.
 */
export function resolveMotionPreset({
  fromLayout,
  toLayout,
  sortChanged,
  shuffleChanged,
}) {
  if (fromLayout !== toLayout) {
    if (
      (fromLayout === "arc" && toLayout === "pile") ||
      (fromLayout === "pile" && toLayout === "arc")
    ) {
      return "arc-pile";
    }
    if (toLayout === "arc") return "arc-in";
    if (toLayout === "pile") return "pile-in";
    if (fromLayout === "arc") return "arc-out";
    if (fromLayout === "pile") return "pile-out";
    if (
      (fromLayout === "list" && toLayout === "grid") ||
      (fromLayout === "grid" && toLayout === "list")
    ) {
      return "list-grid";
    }
    return "sort";
  }

  if (shuffleChanged) return "shuffle";
  if (sortChanged) return "sort";
  return "sort";
}

function getVisibleCrayons(crayonList) {
  return Array.from(crayonList.children).filter(
    (item) => item.matches("li[data-hex]") && !item.hidden,
  );
}

function cssEscapeIdent(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function vtNameFor(item) {
  // Prefer stable id; fall back to a hex-derived custom-ident.
  if (item.id) return item.id;
  const hex = (item.dataset.hex || "").replace(/^#/, "").toLowerCase();
  return hex ? `crayon-${hex}` : "";
}

function hashHex(hex) {
  let hash = 0;
  const value = String(hex || "");
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

/**
 * Rank visible crayons for stagger order based on the preset / layout.
 */
function rankForStagger(items, preset, layout) {
  const ranked = items.map((item, index) => ({ item, index }));

  if (preset === "pile-in" || (preset === "arc-pile" && layout === "pile")) {
    ranked.sort((a, b) => {
      const zA = Number.parseInt(a.item.style.getPropertyValue("--pile-z"), 10) || 0;
      const zB = Number.parseInt(b.item.style.getPropertyValue("--pile-z"), 10) || 0;
      if (zA !== zB) return zA - zB;
      return hashHex(a.item.dataset.hex) - hashHex(b.item.dataset.hex);
    });
    return ranked.map((entry) => entry.item);
  }

  if (preset === "arc-in" || (preset === "arc-pile" && layout === "arc")) {
    ranked.sort((a, b) => {
      const xA = Number.parseFloat(a.item.style.getPropertyValue("--arc-x")) || 0;
      const xB = Number.parseFloat(b.item.style.getPropertyValue("--arc-x")) || 0;
      return xA - xB;
    });
    return ranked.map((entry) => entry.item);
  }

  // Default: destination DOM / reading order.
  return items;
}

function buildStaggerDelays(items, preset, layout) {
  const config = MOTION[preset] || MOTION.sort;
  const maxStagger = config.maxStaggerMs;
  const ordered = rankForStagger(items, preset, layout);
  const last = Math.max(ordered.length - 1, 1);
  const delays = new Map();

  ordered.forEach((item, index) => {
    let delay = (index / last) * maxStagger;
    if (preset === "pile-in" || preset === "shuffle") {
      delay += hashHex(item.dataset.hex) % 7;
    }
    delays.set(item, Math.round(delay));
  });

  return delays;
}

function applyStaggerStylesheet(delays) {
  const rules = [];
  delays.forEach((delayMs, item) => {
    const name = vtNameFor(item);
    if (!name || delayMs <= 0) return;
    rules.push(
      `::view-transition-group(${cssEscapeIdent(name)}){animation-delay:${delayMs}ms;}`,
    );
  });

  if (!rules.length) return null;

  const style = document.createElement("style");
  style.dataset.crayonVtStagger = "true";
  style.textContent = rules.join("");
  document.head.appendChild(style);
  return style;
}

function assignTransitionNames(items) {
  const assigned = [];
  items.forEach((item) => {
    const name = vtNameFor(item);
    if (!name) return;
    item.style.viewTransitionName = name;
    assigned.push(item);
  });
  return assigned;
}

function clearTransitionNames(items) {
  items.forEach((item) => {
    item.style.viewTransitionName = "";
    item.style.removeProperty("view-transition-name");
  });
}

function waitFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

let activeTransition = null;

/**
 * Run a DOM update inside a same-document view transition with
 * scenario easing (via data-vt-motion) and staggered group delays.
 */
export async function runCrayonTransition(
  crayonList,
  { updateFn, preset = "sort", layoutAfter = "list" },
) {
  if (!crayonList || typeof updateFn !== "function") {
    await updateFn?.();
    return;
  }

  if (!canUseViewTransitions()) {
    await updateFn();
    return;
  }

  // If a morph is in flight, skip it so this update can start cleanly.
  if (activeTransition) {
    try {
      activeTransition.skipTransition();
    } catch {
      // ignore
    }
    activeTransition = null;
    // Drop any leftover names/stagger from the aborted run.
    document.querySelectorAll("li[data-hex]").forEach((item) => {
      item.style.viewTransitionName = "";
      item.style.removeProperty("view-transition-name");
    });
    document.querySelectorAll("style[data-crayon-vt-stagger]").forEach((el) => {
      el.remove();
    });
    delete document.documentElement.dataset.vtMotion;
  }

  const beforeVisible = getVisibleCrayons(crayonList);
  const named = assignTransitionNames(beforeVisible);
  const root = document.documentElement;
  root.dataset.vtMotion = preset;

  let staggerStyle = null;

  try {
    const transition = document.startViewTransition(async () => {
      await updateFn();
      // Let arc/pile geometry CSS vars settle before the after-snapshot.
      if (layoutAfter === "arc" || layoutAfter === "pile") {
        await waitFrame();
      }

      const afterVisible = getVisibleCrayons(crayonList);
      // Ensure newly visible items are also named for the morph.
      afterVisible.forEach((item) => {
        const name = vtNameFor(item);
        if (!name) return;
        if (!item.style.viewTransitionName) {
          item.style.viewTransitionName = name;
          named.push(item);
        }
      });

      staggerStyle = applyStaggerStylesheet(
        buildStaggerDelays(afterVisible, preset, layoutAfter),
      );
    });

    activeTransition = transition;
    await transition.finished;
  } catch {
    // Abort / unsupported mid-flight — update already applied.
  } finally {
    activeTransition = null;
    clearTransitionNames(named);
    staggerStyle?.remove();
    delete root.dataset.vtMotion;
  }
}
