import { getPresetColors } from "./presets.js";

const SORT_VALUES = new Set([
  "default",
  "color",
  "brightness",
  "hue",
  "saturation",
]);

const state = {
  sort: "default",
  activeFilter: "all",
  sharedColors: null,
  userPalettes: [],
  selectedPaletteId: null,
};

const listeners = new Set();

export function getState() {
  return {
    sort: state.sort,
    activeFilter: state.activeFilter,
    sharedColors: state.sharedColors ? [...state.sharedColors] : null,
    userPalettes: state.userPalettes.map((palette) => ({
      ...palette,
      colors: [...palette.colors],
    })),
    selectedPaletteId: state.selectedPaletteId,
  };
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
