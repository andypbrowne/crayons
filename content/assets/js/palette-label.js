import { getPresetById } from "./presets.js";

export function getPaletteLabel(state) {
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

export function canExportPalette(state) {
  if (state.sharedColors?.length) return true;
  if (state.activeFilter.startsWith("user:")) return true;
  if (state.activeFilter !== "all" && state.activeFilter !== "shared") {
    return Boolean(getPresetById(state.activeFilter));
  }
  return false;
}
