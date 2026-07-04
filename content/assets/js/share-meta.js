import { hexForUrl } from "./color-utils.js";
import { getPresetById } from "./presets.js";
import { getActiveColors, getState } from "./app-state.js";

export function resolveShareContextFromState(state, colorNameMap = new Map()) {
  const colors = (getActiveColors(state) ?? []).slice(0, 5);

  if (state.sharedColors?.length) {
    const colorNames = state.sharedColors
      .slice(0, 5)
      .map((hex) => colorNameMap.get(hex) ?? hex);
    return {
      label: "Shared selection",
      colors,
      paletteId: null,
      view: "custom",
      colorNames,
    };
  }

  if (state.activeFilter === "all" || !state.activeFilter) {
    return {
      label: "Curated color palettes",
      colors: getPresetById("palette1")?.colors.slice(0, 5) ?? [],
      paletteId: null,
      view: "all",
      colorNames: [],
    };
  }

  if (state.activeFilter.startsWith("user:")) {
    const id = state.activeFilter.slice(5);
    const palette = state.userPalettes.find((entry) => entry.id === id);
    const paletteColors = palette?.colors?.slice(0, 5) ?? colors;
    return {
      label: palette?.name ?? "My palette",
      colors: paletteColors,
      paletteId: state.activeFilter,
      view: "user",
      colorNames: paletteColors.map((hex) => colorNameMap.get(hex) ?? hex),
    };
  }

  const preset = getPresetById(state.activeFilter);
  if (preset) {
    return {
      label: `${preset.emoji} ${preset.label}`,
      colors: preset.colors.slice(0, 5),
      paletteId: preset.id,
      view: "preset",
      colorNames: preset.colors
        .slice(0, 5)
        .map((hex) => colorNameMap.get(hex) ?? hex),
    };
  }

  return {
    label: "Curated color palettes",
    colors,
    paletteId: null,
    view: "all",
    colorNames: [],
  };
}

export function buildShareDescription(context) {
  const count = context.colors.length;

  if (context.view === "all") {
    return "Browse all Crayola colors with curated starter palettes for creative projects.";
  }

  if (context.view === "preset") {
    return `${context.label} — a curated palette of ${count} Crayola colors.`;
  }

  if (context.view === "user") {
    if (count) {
      return `${context.label} — a custom palette of ${count} Crayola colors.`;
    }
    return `${context.label} — a custom Crayola palette.`;
  }

  if (context.colorNames?.length) {
    return `${context.label} — ${context.colorNames.slice(0, 5).join(", ")}.`;
  }

  if (count) {
    return `${context.label} — a selection of ${count} Crayola colors.`;
  }

  return "Curated Crayola color palettes for creative projects.";
}

export function buildOgImageQuery(context) {
  const params = new URLSearchParams();

  if (context.paletteId && context.view === "preset") {
    params.set("palette", context.paletteId);
  } else if (context.colors.length) {
    params.set("colors", context.colors.map(hexForUrl).join(","));
  }

  if (context.label) {
    params.set("label", context.label);
  }

  return params.toString();
}

export function buildOgImageUrl(context, origin = window.location.origin) {
  const query = buildOgImageQuery(context);
  return query ? `${origin}/og?${query}` : `${origin}/og`;
}

function setMetaTag(selector, content) {
  if (!content) return;
  let tag = document.head.querySelector(selector);
  if (!tag) {
    const isProperty = selector.includes("property=");
    tag = document.createElement("meta");
    if (isProperty) {
      tag.setAttribute("property", selector.match(/property="([^"]+)"/)[1]);
    } else {
      tag.setAttribute("name", selector.match(/name="([^"]+)"/)[1]);
    }
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
}

export function updateShareMeta(context, pageUrl = window.location.href) {
  const origin = window.location.origin;
  const description = buildShareDescription(context);
  const imageUrl = buildOgImageUrl(context, origin);

  document.title = "Crayons";

  setMetaTag('meta[name="description"]', description);
  setMetaTag('meta[property="og:title"]', "Crayons");
  setMetaTag('meta[property="og:description"]', description);
  setMetaTag('meta[property="og:image"]', imageUrl);
  setMetaTag('meta[property="og:url"]', pageUrl);
  setMetaTag('meta[name="twitter:card"]', "summary_large_image");
  setMetaTag('meta[name="twitter:title"]', "Crayons");
  setMetaTag('meta[name="twitter:description"]', description);
  setMetaTag('meta[name="twitter:image"]', imageUrl);
  setMetaTag('meta[name="twitter:image:alt"]', description);
}

export function resolveShareContextFromUrl(searchParams, presets) {
  const colorsParam = searchParams.get("colors");
  const paletteParam = searchParams.get("palette");

  if (colorsParam) {
    const colors = colorsParam
      .split(",")
      .map((part) => {
        const raw = part.trim().replace(/^#/, "").toUpperCase();
        return /^[0-9A-F]{6}$/.test(raw) ? `#${raw}` : null;
      })
      .filter(Boolean)
      .slice(0, 5);

    if (colors.length) {
      return {
        label: searchParams.get("label")?.trim() || "Custom palette",
        colors,
        paletteId: null,
        view: "custom",
        colorNames: [],
      };
    }
  }

  if (paletteParam && paletteParam !== "all" && !paletteParam.startsWith("user:")) {
    const preset = presets.find((entry) => entry.id === paletteParam);
    if (preset) {
      return {
        label: `${preset.emoji} ${preset.label}`,
        colors: preset.colors.slice(0, 5),
        paletteId: preset.id,
        view: "preset",
        colorNames: [],
      };
    }
  }

  if (paletteParam?.startsWith("user:")) {
    return {
      label: searchParams.get("label")?.trim() || "My palette",
      colors: [],
      paletteId: paletteParam,
      view: "user",
      colorNames: [],
    };
  }

  const fallback = presets[0];
  return {
    label: "Curated color palettes",
    colors: fallback?.colors?.slice(0, 5) ?? [],
    paletteId: null,
    view: "all",
    colorNames: [],
  };
}

export function updateShareMetaFromState(state, colorNameMap) {
  const context = resolveShareContextFromState(state, colorNameMap);
  updateShareMeta(context);
}
