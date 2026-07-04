export function normalizeHex(value) {
  if (!value) return null;
  const raw = String(value).trim().replace(/^#/, "").toUpperCase();
  if (!/^[0-9A-F]{6}$/.test(raw)) return null;
  return `#${raw}`;
}

export function hexForUrl(hex) {
  return normalizeHex(hex)?.slice(1) ?? "";
}

export function parseColorsParam(param, validHexSet) {
  if (!param) return [];
  const colors = param
    .split(",")
    .map((part) => normalizeHex(part))
    .filter(Boolean);

  if (!validHexSet) return colors;
  return colors.filter((hex) => validHexSet.has(hex));
}

export function brightness(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return 0;
  const r = parseInt(normalized.slice(1, 3), 16);
  const g = parseInt(normalized.slice(3, 5), 16);
  const b = parseInt(normalized.slice(5, 7), 16);
  return Math.round((r * 299 + g * 587 + b * 114) / 1000);
}

export function hexToHSL(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return { h: 0, s: 0, l: 0 };

  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === r) {
      h = (g - b) / delta + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function buildValidHexSet(crayonList) {
  const set = new Set();
  crayonList.querySelectorAll("li[data-hex]").forEach((item) => {
    const hex = normalizeHex(item.dataset.hex);
    if (hex) set.add(hex);
  });
  return set;
}
