import presetData from "./presets.json" with { type: "json" };
import { slugifyLabel } from "./color-utils.js";

export const PRESETS = presetData;

export function getPresetById(id) {
  return PRESETS.find((preset) => preset.id === id) ?? null;
}

export function getPresetBySlug(slug) {
  if (!slug) return null;
  const normalized = slugifyLabel(slug);
  return (
    PRESETS.find(
      (preset) =>
        preset.slug === normalized ||
        preset.id === slug ||
        slugifyLabel(preset.label) === normalized,
    ) ?? null
  );
}

export function resolvePresetParam(param) {
  if (!param || param === "all") return null;
  if (param.startsWith("user:")) return null;
  return getPresetBySlug(param) ?? getPresetById(param);
}

export function presetParamValue(preset) {
  return preset.slug ?? slugifyLabel(preset.label);
}

export function getPresetColors(id) {
  return getPresetById(id)?.colors ?? null;
}

export function isPresetId(id) {
  return PRESETS.some((preset) => preset.id === id);
}
