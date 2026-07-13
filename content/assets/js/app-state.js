import { getPresetColors } from "./presets.js";
import {
  getFamilyAllowedHexes,
  intersectColorSets,
} from "./color-family.js";
import { getThemeAllowedHexes } from "./color-theme.js";
import { normalizeHex } from "./color-utils.js";

const SORT_VALUES = new Set([
  "default",
  "color",
  "brightness",
  "hue",
  "saturation",
  "random",
]);

export const LAYOUT_VALUES = new Set(["list", "grid", "arc", "pile"]);

const state = {
  sort: "default",
  layout: "list",
  shuffleSeed: 0,
  activeFilter: "all",
  sharedColors: null,
  userPalettes: [],
  selectedPaletteId: null,
  colorFamily: null,
  theme: null,
};

let validHexSet = null;

const listeners = new Set();

export function getState() {
  return {
    sort: state.sort,
    layout: state.layout,
    shuffleSeed: state.shuffleSeed,
    activeFilter: state.activeFilter,
    sharedColors: state.sharedColors ? [...state.sharedColors] : null,
    userPalettes: state.userPalettes.map((palette) => ({
      ...palette,
      colors: [...palette.colors],
    })),
    selectedPaletteId: state.selectedPaletteId,
    colorFamily: state.colorFamily,
    theme: state.theme,
  };
}

export function initVisibleColorsContext(hexSet) {
  validHexSet = hexSet;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  const snapshot = getState();
  listeners.forEach((listener) => listener(snapshot));
}

export function setState(partial) {
  if (partial.sort !== undefined) {
    state.sort = SORT_VALUES.has(partial.sort) ? partial.sort : "default";
  }
  if (partial.layout !== undefined) {
    state.layout = LAYOUT_VALUES.has(partial.layout) ? partial.layout : "list";
  }
  if (partial.shuffleSeed !== undefined) {
    state.shuffleSeed = partial.shuffleSeed;
  }
  if (partial.activeFilter !== undefined) {
    state.activeFilter = partial.activeFilter;
  }
  if (partial.sharedColors !== undefined) {
    state.sharedColors = partial.sharedColors?.length ? [...partial.sharedColors] : null;
  }
  if (partial.userPalettes !== undefined) {
    state.userPalettes = partial.userPalettes.map((palette) => ({
      ...palette,
      colors: [...palette.colors],
    }));
  }
  if (partial.selectedPaletteId !== undefined) {
    state.selectedPaletteId = partial.selectedPaletteId;
  }
  if (partial.colorFamily !== undefined) {
    state.colorFamily = partial.colorFamily;
  }
  if (partial.theme !== undefined) {
    state.theme = partial.theme;
  }
  notify();
}

export function getActiveColors(snapshot = null) {
  const sharedColors = snapshot ? snapshot.sharedColors : state.sharedColors;
  const activeFilter = snapshot ? snapshot.activeFilter : state.activeFilter;
  const userPalettes = snapshot ? snapshot.userPalettes : state.userPalettes;

  if (sharedColors?.length) {
    return sharedColors;
  }
  if (activeFilter === "all") {
    return null;
  }
  if (activeFilter.startsWith("user:")) {
    const id = activeFilter.slice(5);
    const palette = userPalettes.find((entry) => entry.id === id);
    if (!palette?.colors?.length) {
      return null;
    }
    return palette.colors;
  }
  if (activeFilter === "shared") {
    return sharedColors?.length ? sharedColors : null;
  }
  return getPresetColors(activeFilter);
}

export function getVisibleColors(snapshot = null) {
  const paletteColors = getActiveColors(snapshot);
  const colorFamily = snapshot ? snapshot.colorFamily : state.colorFamily;
  const theme = snapshot ? snapshot.theme : state.theme;
  const familyColors = getFamilyAllowedHexes(colorFamily, validHexSet);
  const themeColors = getThemeAllowedHexes(theme, validHexSet);

  if (!paletteColors && !familyColors && !themeColors) {
    return null;
  }

  const combined = intersectColorSets(
    intersectColorSets(paletteColors, familyColors),
    themeColors,
  );
  if (!combined?.length) {
    return [];
  }

  return combined
    .map((hex) => normalizeHex(hex))
    .filter(Boolean);
}

export function getActiveFilterLabel() {
  if (state.sharedColors?.length) {
    return `Shared selection (${state.sharedColors.length})`;
  }
  if (state.activeFilter === "all") {
    return "All";
  }
  if (state.activeFilter.startsWith("user:")) {
    const id = state.activeFilter.slice(5);
    const palette = state.userPalettes.find((entry) => entry.id === id);
    return palette?.name ?? "My palette";
  }
  return state.activeFilter;
}

export function getUserPaletteById(id) {
  return state.userPalettes.find((palette) => palette.id === id) ?? null;
}
