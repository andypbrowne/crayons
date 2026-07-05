import PRESETS from "../../content/assets/js/presets.json" with { type: "json" };
import CRAYOLA from "../../_data/crayola.json" with { type: "json" };

const DEFAULT_COLORS = PRESETS[0].colors;

const NAME_HEX_MAP = buildNameHexMap();

function slugifyLabel(value) {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildNameHexMap() {
  const map = new Map();
  for (const entry of CRAYOLA) {
    const hex = normalizeHex(entry.hex);
    if (hex) {
      map.set(slugifyLabel(entry.color), hex);
    }
  }
  return map;
}

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
    .map((part) => {
      const hexValue = normalizeHex(part);
      if (hexValue) return hexValue;
      return NAME_HEX_MAP.get(slugifyLabel(part)) ?? null;
    })
    .filter(Boolean);
}

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
  if (!param || param === "all" || param.startsWith("user:")) return null;
  return getPresetBySlug(param) ?? getPresetById(param);
}

export function presetParamValue(preset) {
  return preset.slug ?? slugifyLabel(preset.label);
}

export function isPresetId(id) {
  return PRESETS.some((preset) => preset.id === id);
}

export function resolveShareContext(searchParams) {
  const colorsParam = searchParams.get("colors");
  const paletteParam = searchParams.get("palette");

  if (colorsParam) {
    const colors = parseColorsParam(colorsParam).slice(0, 5);
    if (colors.length) {
      return {
        label: "Custom palette",
        colors,
        paletteId: null,
        view: "custom",
      };
    }
  }

  const preset = resolvePresetParam(paletteParam);
  if (preset) {
    return {
      label: `${preset.emoji} ${preset.label}`,
      colors: preset.colors.slice(0, 5),
      paletteId: preset.id,
      view: "preset",
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
    const preset = getPresetById(context.paletteId);
    params.set("palette", preset ? presetParamValue(preset) : context.paletteId);
  } else if (context.colors.length) {
    params.set(
      "colors",
      context.colors
        .map((hex) => {
          for (const [slug, mappedHex] of NAME_HEX_MAP.entries()) {
            if (mappedHex === normalizeHex(hex)) return slug;
          }
          return hexForUrl(hex);
        })
        .join(","),
    );
  }

  return params.toString();
}
