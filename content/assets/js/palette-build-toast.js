import { hideToast, showToast } from "./toast.js";

/** Show build guidance while a palette is still small (0–2 colors). */
export const BUILD_HINT_MAX_COLORS = 2;

const TOAST_ID = "palette-build-hint";

let dismissedKey = null;
let lastShownKey = null;

function getBuildingPalette(state) {
  if (!state.selectedPaletteId) return null;
  const palette = state.userPalettes.find(
    (entry) => entry.id === state.selectedPaletteId,
  );
  if (!palette || palette.colors.length > BUILD_HINT_MAX_COLORS) return null;
  return palette;
}

function buildHintKey(palette, state) {
  const filtered = state.activeFilter === `user:${palette.id}`;
  return `${palette.id}:${palette.colors.length}:${filtered}`;
}

function buildHintMessage(palette, state) {
  const count = palette.colors.length;
  const countLabel =
    count === 0 ? "no colors yet" : count === 1 ? "1 color" : `${count} colors`;
  const filtered = state.activeFilter === `user:${palette.id}`;

  if (filtered) {
    return `"${palette.name}" has ${countLabel}. Clear filters to browse all colors, then open ⋯ on a crayon → Manage palette.`;
  }

  return `Building "${palette.name}" (${countLabel}). Open ⋯ on any crayon, then Manage palette to add colors.`;
}

export function initPaletteBuildToast() {
  return {
    update(state) {
      const palette = getBuildingPalette(state);
      if (!palette) {
        hideToast(TOAST_ID);
        lastShownKey = null;
        return;
      }

      const key = buildHintKey(palette, state);
      if (dismissedKey === key) return;
      if (lastShownKey === key) return;

      lastShownKey = key;
      showToast(buildHintMessage(palette, state), {
        persistent: true,
        id: TOAST_ID,
        onDismiss: () => {
          dismissedKey = key;
          lastShownKey = null;
        },
      });
    },
  };
}
