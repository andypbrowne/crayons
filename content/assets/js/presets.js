import presetData from "./presets.json" with { type: "json" };

export const PRESETS = presetData;

export function getPresetById(id) {
  return PRESETS.find((preset) => preset.id === id) ?? null;
}

export function getPresetColors(id) {
  return getPresetById(id)?.colors ?? null;
}

export function isPresetId(id) {
  return PRESETS.some((preset) => preset.id === id);
}
