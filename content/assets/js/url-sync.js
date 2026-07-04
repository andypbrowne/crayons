import { hexForUrl, normalizeHex, parseColorsParam } from "./color-utils.js";
import { isPresetId } from "./presets.js";
import { getUserPaletteById } from "./app-state.js";

const SORT_VALUES = new Set([
  "default",
  "color",
  "brightness",
  "hue",
  "saturation",
]);

export function readUrlState(validHexSet) {
  const params = new URLSearchParams(window.location.search);
  const sort = SORT_VALUES.has(params.get("sort")) ? params.get("sort") : "default";

  const colorsParam = params.get("colors");
  if (colorsParam) {
    const sharedColors = parseColorsParam(colorsParam, validHexSet);
    if (sharedColors.length) {
      return {
        sort,
        activeFilter: "shared",
        sharedColors,
      };
    }
  }

  const paletteParam = params.get("palette") ?? "all";
  if (paletteParam === "all") {
    return { sort, activeFilter: "all", sharedColors: null };
  }

  if (paletteParam.startsWith("user:")) {
    return {
      sort,
      activeFilter: paletteParam,
      sharedColors: null,
    };
  }

  if (isPresetId(paletteParam)) {
    return {
      sort,
      activeFilter: paletteParam,
      sharedColors: null,
    };
  }

  return { sort, activeFilter: "all", sharedColors: null };
}

export function writeUrlState(state) {
  const params = new URLSearchParams(window.location.search);

  if (state.sort && state.sort !== "default") {
    params.set("sort", state.sort);
  } else {
    params.delete("sort");
  }

  if (state.sharedColors?.length) {
    params.set("colors", state.sharedColors.map(hexForUrl).join(","));
    params.delete("palette");
  } else if (state.activeFilter && state.activeFilter !== "all" && state.activeFilter !== "shared") {
    params.set("palette", state.activeFilter);
    params.delete("colors");
  } else {
    params.delete("palette");
    params.delete("colors");
  }

  const query = params.toString();
  const nextUrl = query
    ? `${window.location.pathname}?${query}`
    : window.location.pathname;

  window.history.replaceState({}, "", nextUrl);
}

export function buildShareUrl(state) {
  const params = new URLSearchParams();

  if (state.sort && state.sort !== "default") {
    params.set("sort", state.sort);
  }

  if (state.sharedColors?.length) {
    params.set("colors", state.sharedColors.map(hexForUrl).join(","));
  } else if (state.activeFilter?.startsWith("user:")) {
    const palette = getUserPaletteById(state.activeFilter.slice(5));
    if (palette?.colors?.length) {
      params.set("colors", palette.colors.map(hexForUrl).join(","));
    } else {
      params.set("palette", state.activeFilter);
    }
  } else if (state.activeFilter && state.activeFilter !== "all" && state.activeFilter !== "shared") {
    params.set("palette", state.activeFilter);
  }

  const query = params.toString();
  return query
    ? `${window.location.origin}${window.location.pathname}?${query}`
    : `${window.location.origin}${window.location.pathname}`;
}

export function colorsFromSharedSelection(colors) {
  return colors.map(normalizeHex).filter(Boolean);
}
