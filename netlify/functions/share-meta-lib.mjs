import PRESETS from "../../content/assets/js/presets.json" with { type: "json" };

const DEFAULT_COLORS = PRESETS[0].colors;

export function normalizeHex(value) {
  if (!value) return null;
  const raw = String(value).trim().replace(/^#/, "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(raw)) return null;
  return `#${raw}`;
}

export function hexForUrl(hex) {
  return normalizeHex(hex)?.slice(1) ?? "";
}

export function parseColorsParam(param) {
  if (!param) return [];
  return param
    .split(",")
    .map((part) => normalizeHex(part))
    .filter(Boolean);
}

export function getPresetById(id) {
  return PRESETS.find((preset) => preset.id === id) ?? null;
}

export function isPresetId(id) {
  return PRESETS.some((preset) => preset.id === id);
}

export function resolveShareContext(searchParams) {
  const colorsParam = searchParams.get("colors");
  const paletteParam = searchParams.get("palette");
  const labelParam = searchParams.get("label");

  if (colorsParam) {
    const colors = parseColorsParam(colorsParam).slice(0, 5);
    if (colors.length) {
      return {
        label: labelParam?.trim() || "Custom palette",
        colors,
        paletteId: null,
        view: "custom",
      };
    }
  }

  if (paletteParam && paletteParam !== "all" && !paletteParam.startsWith("user:")) {
    const preset = getPresetById(paletteParam);
    if (preset) {
      return {
        label: `${preset.emoji} ${preset.label}`,
        colors: preset.colors.slice(0, 5),
        paletteId: preset.id,
        view: "preset",
      };
    }
  }

  if (paletteParam?.startsWith("user:")) {
    return {
      label: labelParam?.trim() || "My palette",
      colors: parseColorsParam(colorsParam).slice(0, 5),
      paletteId: paletteParam,
      view: "user",
    };
  }

  return {
    label: "Curated color palettes",
    colors: DEFAULT_COLORS.slice(0, 5),
    paletteId: null,
    view: "all",
  };
}

export function buildShareDescription(context, colorNames = []) {
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

  if (colorNames.length) {
    const names = colorNames.slice(0, 5).join(", ");
    return `${context.label} — ${names}.`;
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
