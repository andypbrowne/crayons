import {
  formatColorsForUrl,
  parseColorsParam,
} from "./color-utils.js";
import { getPresetById, presetParamValue, resolvePresetParam } from "./presets.js";
import { getActiveColors, getUserPaletteById } from "./app-state.js";
import { MAX_COLORS_PER_PALETTE } from "./user-palettes.js";

const SORT_VALUES = new Set([
  "default",
  "color",
  "brightness",
  "hue",
  "saturation",
]);

function getShareableColors(state) {
  if (state.sharedColors?.length) {
    return state.sharedColors;
  }

  if (state.activeFilter?.startsWith("user:")) {
    const palette = getUserPaletteById(state.activeFilter.slice(5));
    return palette?.colors?.length ? palette.colors : null;
  }

  return null;
}

export function readUrlState(validHexSet, nameHexMap) {
  const params = new URLSearchParams(window.location.search);
  const sort = SORT_VALUES.has(params.get("sort")) ? params.get("sort") : "default";

  const colorsParam = params.get("colors");
  if (colorsParam) {
    const sharedColors = parseColorsParam(colorsParam, validHexSet, nameHexMap).slice(
      0,
      MAX_COLORS_PER_PALETTE,
    );
    if (sharedColors.length) {
      return {
        sort,
        activeFilter: "shared",
        sharedColors,
      };
    }
  }

  const paletteParam = params.get("palette");
  if (!paletteParam || paletteParam === "all") {
    return { sort, activeFilter: "all", sharedColors: null };
  }

  const preset = resolvePresetParam(paletteParam);
  if (preset) {
    return {
      sort,
      activeFilter: preset.id,
      sharedColors: null,
    };
  }

  if (paletteParam.startsWith("user:")) {
    return {
      sort,
      activeFilter: paletteParam,
      sharedColors: null,
    };
  }

  return { sort, activeFilter: "all", sharedColors: null };
}

export function writeUrlState(state, colorNameMap) {
  const params = new URLSearchParams();

  if (state.sort && state.sort !== "default") {
    params.set("sort", state.sort);
  }

  const shareableColors = getShareableColors(state);

  if (shareableColors?.length) {
    params.set("colors", formatColorsForUrl(shareableColors, colorNameMap));
  } else if (state.activeFilter && state.activeFilter !== "all" && state.activeFilter !== "shared") {
    const preset = getPresetById(state.activeFilter);
    if (preset) {
      params.set("palette", presetParamValue(preset));
    }
  }

  const query = params.toString();
  const nextUrl = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;

  window.history.replaceState({}, "", nextUrl);
}

export function buildShareUrl(state, colorNameMap) {
  const params = new URLSearchParams();
  const shareableColors = getShareableColors(state);

  if (shareableColors?.length) {
    params.set("colors", formatColorsForUrl(shareableColors, colorNameMap));
  } else if (state.activeFilter && state.activeFilter !== "all" && state.activeFilter !== "shared") {
    const preset = getPresetById(state.activeFilter);
    if (preset) {
      params.set("palette", presetParamValue(preset));
    }
  }

  const query = params.toString();
  return query
    ? `${window.location.origin}${window.location.pathname}?${query}`
    : `${window.location.origin}${window.location.pathname}`;
}
