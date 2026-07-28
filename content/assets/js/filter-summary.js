import { getPresetById } from "./presets.js";
import { FAMILIES } from "./color-family.js";
import { THEMES } from "./color-theme.js";
import { getVisibleColors } from "./app-state.js";

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
  if (state.sharedColors?.length) return true;
  if (state.activeFilter.startsWith("user:")) return true;
  if (state.activeFilter !== "all" && state.activeFilter !== "shared") {
    return Boolean(getPresetById(state.activeFilter));
  }
  return false;
}

function paletteLabel(state) {
  if (state.sharedColors?.length) {
    return "Shared palette";
  }
  if (state.activeFilter === "all" || state.activeFilter === "shared") {
    return null;
  }
  if (state.activeFilter.startsWith("user:")) {
    const id = state.activeFilter.slice(5);
    const palette = state.userPalettes.find((entry) => entry.id === id);
    return palette?.name ?? "My palette";
  }
  const preset = getPresetById(state.activeFilter);
  if (preset) {
    return `${preset.emoji} ${preset.label}`;
  }
  return state.activeFilter;
}

export function buildFilterSummary(state, { totalCount = 0 } = {}) {
  const parts = [];

  const palette = paletteLabel(state);
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
