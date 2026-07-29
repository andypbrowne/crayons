import { FAMILIES } from "./color-family.js";
import { THEMES } from "./color-theme.js";
import { getVisibleColors } from "./app-state.js";
import { getPaletteLabel, canExportPalette } from "./palette-label.js";

const SORT_LABELS = {
  color: "By color",
  brightness: "By brightness",
  hue: "By hue",
  saturation: "By saturation",
  random: "Random",
};

export function hasActiveFilters(state) {
  return (
    state.activeFilter !== "all" ||
    Boolean(state.sharedColors?.length) ||
    Boolean(state.colorFamily) ||
    Boolean(state.theme) ||
    state.sort !== "default"
  );
}

export function canShareFilterState(state) {
  return canExportPalette(state);
}

export { canExportPalette };

export function buildFilterSummary(state, { totalCount = 0 } = {}) {
  const parts = [];

  const palette = getPaletteLabel(state);
  if (palette) parts.push(palette);

  if (state.colorFamily) {
    const family = FAMILIES.find((entry) => entry.id === state.colorFamily);
    if (family) parts.push(family.label);
  }

  if (state.theme) {
    const theme = THEMES.find((entry) => entry.id === state.theme);
    if (theme) parts.push(theme.label);
  }

  if (state.sort !== "default") {
    parts.push(SORT_LABELS[state.sort] ?? state.sort);
  }

  const visible = getVisibleColors(state);
  const count = visible === null ? totalCount : visible.length;
  if (count > 0) {
    parts.push(`${count} color${count === 1 ? "" : "s"}`);
  }

  return parts.join(" · ");
}
