import { normalizeHex, slugifyLabel, getColorName } from "./color-utils.js";

export const EXPORT_FORMATS = [
  {
    id: "json",
    label: "JSON",
    hint: "Devs, Figma plugins, scripts",
    extension: "json",
    mimeType: "application/json",
  },
  {
    id: "csv",
    label: "CSV",
    hint: "Excel, Google Sheets, PowerPoint",
    extension: "csv",
    mimeType: "text/csv;charset=utf-8",
  },
  {
    id: "text",
    label: "Plain text",
    hint: "Readable list for any app",
    extension: "txt",
    mimeType: "text/plain;charset=utf-8",
  },
  {
    id: "hex",
    label: "Hex list",
    hint: "Figma, CSS, quick paste",
    extension: "txt",
    mimeType: "text/plain;charset=utf-8",
  },
  {
    id: "css",
    label: "CSS variables",
    hint: "Web projects",
    extension: "css",
    mimeType: "text/css;charset=utf-8",
  },
  {
    id: "gpl",
    label: "GIMP palette",
    hint: "GIMP (.gpl)",
    extension: "gpl",
    mimeType: "application/octet-stream",
  },
];

function hexToRgb(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16),
  };
}

function cssVarName(name, hex, index) {
  const slug = slugifyLabel(name);
  return slug ? `--${slug}` : `--color-${index + 1}`;
}

function escapeCsv(value) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function buildEntries(colors, colorNameMap) {
  return colors
    .map((hex) => normalizeHex(hex))
    .filter(Boolean)
    .map((hex, index) => ({
      hex,
      name: getColorName(hex, colorNameMap),
      rgb: hexToRgb(hex),
      index,
    }));
}

const formatters = {
  json(entries) {
    return JSON.stringify(
      entries.map(({ name, hex }) => ({ name, hex })),
      null,
      2,
    );
  },

  csv(entries) {
    const rows = [["name", "hex", "r", "g", "b"]];
    entries.forEach(({ name, hex, rgb }) => {
      rows.push([name, hex, rgb.r, rgb.g, rgb.b]);
    });
    return rows.map((row) => row.map(escapeCsv).join(",")).join("\n");
  },

  text(entries) {
    return entries.map(({ name, hex }) => `${name} — ${hex}`).join("\n");
  },

  hex(entries) {
    return entries.map(({ hex }) => hex).join("\n");
  },

  css(entries, paletteName) {
    const lines = entries.map(
      ({ name, hex, index }) =>
        `  ${cssVarName(name, hex, index)}: ${hex};`,
    );
    return `:root {\n  /* ${paletteName} */\n${lines.join("\n")}\n}\n`;
  },

  gpl(entries, paletteName) {
    const lines = [
      "GIMP Palette",
      `Name: ${paletteName}`,
      "Columns: 0",
      "#",
    ];
    entries.forEach(({ name, hex, rgb }) => {
      lines.push(`${rgb.r} ${rgb.g} ${rgb.b} ${name}`);
    });
    return `${lines.join("\n")}\n`;
  },
};

export function slugifyPaletteFilename(name) {
  const withoutEmoji = String(name)
    .replace(/[\p{Extended_Pictographic}\uFE0F]/gu, "")
    .trim();
  return slugifyLabel(withoutEmoji) || "palette";
}

export function exportPalette(formatId, { name, colors, colorNameMap }) {
  const format = EXPORT_FORMATS.find((entry) => entry.id === formatId);
  const formatter = formatters[formatId];
  if (!format || !formatter) {
    throw new Error(`Unknown export format: ${formatId}`);
  }

  const entries = buildEntries(colors, colorNameMap);
  if (!entries.length) {
    throw new Error("No colors to export.");
  }

  const paletteName = name?.trim() || "Palette";
  const content = formatter(entries, paletteName);
  const blob = new Blob([content], { type: format.mimeType });

  return {
    blob,
    filename: `${slugifyPaletteFilename(paletteName)}.${format.extension}`,
    mimeType: format.mimeType,
    preview: content,
  };
}
