const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/** Soft cap so VT stays smooth with ~120 crayons. */
const MAX_NAMED_CRAYONS = 48;

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

/**
 * Prefer in-viewport crayons nearest the screen center so morph cost stays bounded.
 * Unnamed crayons still update — they just snap instead of morphing.
 */
function pickNamedCrayons(items, limit = MAX_NAMED_CRAYONS) {
  if (items.length <= limit) return items;

  const viewportW = window.innerWidth || 1;
  const viewportH = window.innerHeight || 1;
  const centerX = viewportW / 2;
  const centerY = viewportH / 2;

  const scored = items.map((item, index) => {
    const rect = item.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const midY = rect.top + rect.height / 2;
    const inView =
      rect.bottom > 0 &&
      rect.top < viewportH &&
      rect.right > 0 &&
      rect.left < viewportW;
    const dist = Math.hypot(midX - centerX, midY - centerY);
    return { item, index, inView, dist };
  });

  scored.sort((a, b) => {
    if (a.inView !== b.inView) return a.inView ? -1 : 1;
    if (a.dist !== b.dist) return a.dist - b.dist;
    return a.index - b.index;
  });

  return scored.slice(0, limit).map((entry) => entry.item);
}

function cssEscapeIdent(value) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return String(value).replace(/[^a-zA-Z0-9_-]/g, "\\$&");
}

function vtNameFor(item) {
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
    item.style.viewTransitionName = "none";
  });
  items.forEach((item) => {
    item.style.removeProperty("view-transition-name");
    item.style.removeProperty("visibility");
    item.style.removeProperty("opacity");
  });
}

function restoreCrayonPaint(crayonList) {
  crayonList.querySelectorAll("li[data-hex]").forEach((item) => {
    item.style.removeProperty("visibility");
    item.style.removeProperty("opacity");
  });
  flushLayout(crayonList);
}

function flushLayout(crayonList) {
  void crayonList.offsetHeight;
}

function cleanupVtArtifacts(crayonList) {
  document.querySelectorAll("li[data-hex]").forEach((item) => {
    item.style.viewTransitionName = "none";
    item.style.removeProperty("view-transition-name");
    item.style.removeProperty("visibility");
    item.style.removeProperty("opacity");
  });
  document.querySelectorAll("style[data-crayon-vt-stagger]").forEach((el) => {
    el.remove();
  });
  document.documentElement.classList.remove("is-crayon-vt", "is-crayon-vt-settling");
  delete document.documentElement.dataset.vtMotion;
  if (crayonList) restoreCrayonPaint(crayonList);
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

  if (activeTransition) {
    try {
      activeTransition.skipTransition();
    } catch {
      // ignore
    }
    activeTransition = null;
    cleanupVtArtifacts(crayonList);
  }

  const beforeVisible = getVisibleCrayons(crayonList);
  const root = document.documentElement;
  // Name chrome (via CSS) before crayons so named crayons never paint above it.
  root.dataset.vtMotion = preset;
  root.classList.add("is-crayon-vt");
  root.classList.remove("is-crayon-vt-settling");
  const named = assignTransitionNames(pickNamedCrayons(beforeVisible));
  const namedSet = new Set(named);

  let staggerStyle = null;
  let pendingDelays = null;

  try {
    // Keep the update callback synchronous — never await rAF here.
    const transition = document.startViewTransition(() => {
      updateFn();
      flushLayout(crayonList);

      // Only stagger the crayons we already named (capped set).
      const stillNamed = getVisibleCrayons(crayonList).filter((item) =>
        namedSet.has(item),
      );
      pendingDelays = buildStaggerDelays(stillNamed, preset, layoutAfter);
      flushLayout(crayonList);
    });

    activeTransition = transition;

    transition.ready
      .then(() => {
        if (pendingDelays) {
          staggerStyle = applyStaggerStylesheet(pendingDelays);
        }
      })
      .catch(() => {
        // ready rejects when the transition is skipped.
      });

    await transition.finished;
  } catch {
    // Abort / unsupported mid-flight — update already applied.
  } finally {
    activeTransition = null;
    clearTransitionNames(named);
    staggerStyle?.remove();
    root.classList.remove("is-crayon-vt");
    delete root.dataset.vtMotion;
    // Hold content-visibility: visible one extra frame so list rows don't blank.
    root.classList.add("is-crayon-vt-settling");
    restoreCrayonPaint(crayonList);
    requestAnimationFrame(() => {
      restoreCrayonPaint(crayonList);
      requestAnimationFrame(() => {
        root.classList.remove("is-crayon-vt-settling");
      });
    });
  }
}
