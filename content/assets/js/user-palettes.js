import { normalizeHex } from "./color-utils.js";

export const STORAGE_KEY = "crayons:user-palettes";
export const SCHEMA_VERSION = 1;
export const MAX_PALETTES = 10;
export const MAX_COLORS_PER_PALETTE = 8;

export function loadUserPalettes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (parsed.v !== SCHEMA_VERSION || !Array.isArray(parsed.palettes)) {
      return [];
    }

    return parsed.palettes
      .map(normalizePalette)
      .filter(Boolean)
      .slice(0, MAX_PALETTES);
  } catch {
    return [];
  }
}

export function saveUserPalettes(palettes) {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      v: SCHEMA_VERSION,
      palettes: palettes.slice(0, MAX_PALETTES).map(normalizePalette).filter(Boolean),
    }),
  );
}

function normalizePalette(palette) {
  if (!palette?.id || !palette?.name) return null;

  const colors = Array.isArray(palette.colors)
    ? palette.colors.map(normalizeHex).filter(Boolean).slice(0, MAX_COLORS_PER_PALETTE)
    : [];

  return {
    id: String(palette.id),
    name: String(palette.name).trim().slice(0, 64),
    colors,
    createdAt: palette.createdAt ?? new Date().toISOString(),
    updatedAt: palette.updatedAt ?? new Date().toISOString(),
  };
}

export function createPalette(palettes, name, colors = []) {
  if (palettes.length >= MAX_PALETTES) {
    return { ok: false, error: "You can save up to 10 palettes." };
  }

  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Palette name is required." };
  }

  if (palettes.some((palette) => palette.name.toLowerCase() === trimmedName.toLowerCase())) {
    return { ok: false, error: "You already have a palette with that name." };
  }

  const now = new Date().toISOString();
  const palette = {
    id: crypto.randomUUID(),
    name: trimmedName,
    colors: colors.map(normalizeHex).filter(Boolean).slice(0, MAX_COLORS_PER_PALETTE),
    createdAt: now,
    updatedAt: now,
  };

  return { ok: true, palettes: [...palettes, palette], palette };
}

export function renamePalette(palettes, id, name) {
  const trimmedName = name.trim();
  if (!trimmedName) {
    return { ok: false, error: "Palette name is required." };
  }

  if (
    palettes.some(
      (palette) =>
        palette.id !== id && palette.name.toLowerCase() === trimmedName.toLowerCase(),
    )
  ) {
    return { ok: false, error: "You already have a palette with that name." };
  }

  const next = palettes.map((palette) =>
    palette.id === id
      ? { ...palette, name: trimmedName, updatedAt: new Date().toISOString() }
      : palette,
  );

  return { ok: true, palettes: next };
}

export function deletePalette(palettes, id) {
  return { ok: true, palettes: palettes.filter((palette) => palette.id !== id) };
}

export function addColorToPalette(palettes, id, hex, validHexSet) {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return { ok: false, error: "Invalid color." };
  }
  if (validHexSet && !validHexSet.has(normalized)) {
    return { ok: false, error: "That color is not in the crayon set." };
  }

  const palette = palettes.find((entry) => entry.id === id);
  if (!palette) {
    return { ok: false, error: "Palette not found." };
  }
  if (palette.colors.includes(normalized)) {
    return { ok: false, error: "Color is already in this palette." };
  }
  if (palette.colors.length >= MAX_COLORS_PER_PALETTE) {
    return { ok: false, error: `Palettes can have up to ${MAX_COLORS_PER_PALETTE} colors.` };
  }

  const next = palettes.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          colors: [...entry.colors, normalized],
          updatedAt: new Date().toISOString(),
        }
      : entry,
  );

  return { ok: true, palettes: next };
}

export function removeColorFromPalette(palettes, id, hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) {
    return { ok: false, error: "Invalid color." };
  }

  const next = palettes.map((entry) =>
    entry.id === id
      ? {
          ...entry,
          colors: entry.colors.filter((color) => color !== normalized),
          updatedAt: new Date().toISOString(),
        }
      : entry,
  );

  return { ok: true, palettes: next };
}
