import { normalizeHex, slugifyLabel, getColorName } from "./color-utils.js";
import { encodeAse } from "./export-ase.js";
import { createZipArchive } from "./export-zip.js";

const PROCREATE_MAX_COLORS = 30;
const POWERPOINT_MAX_COLORS = 50;

export const EXPORT_FORMATS = [
  {
    id: "json",
    label: "JSON",
    hint: "Design systems, code tokens, Figma plugins",
    extension: "json",
    mimeType: "application/json",
    binary: false,
  },
  {
    id: "csv",
    label: "CSV",
    hint: "Excel, Google Sheets, spreadsheets",
    extension: "csv",
    mimeType: "text/csv;charset=utf-8",
    binary: false,
  },
  {
    id: "hex",
    label: "Hex list",
    hint: "Plain text hex codes for web tools",
    extension: "txt",
    mimeType: "text/plain;charset=utf-8",
    binary: false,
  },
  {
    id: "rgb",
    label: "RGB list",
    hint: "Plain text RGB values for copy-paste",
    extension: "txt",
    mimeType: "text/plain;charset=utf-8",
    binary: false,
  },
  {
    id: "text",
    label: "Plain text",
    hint: "Readable name and hex list",
    extension: "txt",
    mimeType: "text/plain;charset=utf-8",
    binary: false,
  },
  {
    id: "gpl",
    label: "GIMP palette",
    hint: "Blender, Inkscape, Krita (.gpl)",
    extension: "gpl",
    mimeType: "application/octet-stream",
    binary: false,
  },
  {
    id: "ase",
    label: "Adobe ASE",
    hint: "Photoshop, Illustrator, Procreate",
    extension: "ase",
    mimeType: "application/octet-stream",
    binary: true,
  },
  {
    id: "procreate",
    label: "Procreate",
    hint: "Native .swatches palette",
    extension: "swatches",
    mimeType: "application/octet-stream",
    binary: true,
  },
  {
    id: "powerpoint-xml",
    label: "PowerPoint XML",
    hint: "Office theme color palette (.xml)",
    extension: "xml",
    mimeType: "application/xml;charset=utf-8",
    binary: false,
  },
  {
    id: "powerpoint-thmx",
    label: "PowerPoint theme",
    hint: "Office theme file (.thmx)",
    extension: "thmx",
    mimeType: "application/vnd.ms-officetheme",
    binary: true,
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

function rgbToHsv({ r, g, b }) {
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;

  let hue = 0;
  const brightness = max;
  const saturation = max === 0 ? 0 : delta / max;

  if (delta !== 0) {
    switch (max) {
      case red:
        hue = ((green - blue) / delta + (green < blue ? 6 : 0)) / 6;
        break;
      case green:
        hue = ((blue - red) / delta + 2) / 6;
        break;
      default:
        hue = ((red - green) / delta + 4) / 6;
        break;
    }
  }

  return { h: hue, s: saturation, v: brightness };
}

function escapeCsv(value) {
  const text = String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
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

function buildPowerPointThemeXml(entries, paletteName) {
  const customColors = entries
    .slice(0, POWERPOINT_MAX_COLORS)
    .map(
      ({ name, hex }) =>
        `    <a:custClr name="${escapeXml(name)}"><a:srgbClr val="${hex.slice(1)}"/></a:custClr>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${escapeXml(paletteName)}">
  <a:themeElements>
    <a:clrScheme name="Office">
      <a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1>
      <a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="44546A"/></a:dk2>
      <a:lt2><a:srgbClr val="E7E6E6"/></a:lt2>
      <a:accent1><a:srgbClr val="4472C4"/></a:accent1>
      <a:accent2><a:srgbClr val="ED7D31"/></a:accent2>
      <a:accent3><a:srgbClr val="A5A5A5"/></a:accent3>
      <a:accent4><a:srgbClr val="FFC000"/></a:accent4>
      <a:accent5><a:srgbClr val="5B9BD5"/></a:accent5>
      <a:accent6><a:srgbClr val="70AD47"/></a:accent6>
      <a:hlink><a:srgbClr val="0563C1"/></a:hlink>
      <a:folHlink><a:srgbClr val="954F72"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="Office">
      <a:majorFont>
        <a:latin typeface="Calibri Light"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:majorFont>
      <a:minorFont>
        <a:latin typeface="Calibri"/>
        <a:ea typeface=""/>
        <a:cs typeface=""/>
      </a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="Office">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="50000"/><a:shade val="99000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:shade val="99000"/><a:tint val="20000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="0"/>
        </a:gradFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:satMod val="103000"/><a:lumMod val="102000"/><a:tint val="94000"/></a:schemeClr></a:gs>
            <a:gs pos="50000"><a:schemeClr val="phClr"><a:satMod val="110000"/><a:lumMod val="100000"/><a:shade val="100000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="99000"/><a:satMod val="120000"/><a:shade val="78000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="0"/>
        </a:gradFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
        <a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
        <a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/><a:miter lim="800000"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle>
          <a:effectLst>
            <a:outerShdw blurRad="57150" dist="19050" dir="5400000" algn="ctr" rotWithShape="0">
              <a:srgbClr val="000000"><a:alpha val="63000"/></a:srgbClr>
            </a:outerShdw>
          </a:effectLst>
        </a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"><a:tint val="95000"/><a:satMod val="170000"/></a:schemeClr></a:solidFill>
        <a:gradFill rotWithShape="1">
          <a:gsLst>
            <a:gs pos="0"><a:schemeClr val="phClr"><a:tint val="93000"/><a:satMod val="150000"/><a:shade val="98000"/><a:lumMod val="102000"/></a:schemeClr></a:gs>
            <a:gs pos="50000"><a:schemeClr val="phClr"><a:satMod val="130000"/><a:shade val="90000"/><a:lumMod val="103000"/></a:schemeClr></a:gs>
            <a:gs pos="100000"><a:schemeClr val="phClr"><a:lumMod val="94000"/><a:contrastMod val="140000"/></a:schemeClr></a:gs>
          </a:gsLst>
          <a:lin ang="5400000" scaled="0"/>
        </a:gradFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
  <a:objectDefaults/>
  <a:extraClrSchemeLst/>
  <a:custClrLst>
${customColors}
  </a:custClrLst>
</a:theme>
`;
}

function buildPowerPointThmx(entries, paletteName) {
  const themeXml = buildPowerPointThemeXml(entries, paletteName);
  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
</Types>`;
  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>
</Relationships>`;

  return createZipArchive([
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rels },
    { name: "theme/theme1.xml", data: themeXml },
  ]);
}

function buildProcreateSwatches(entries, paletteName) {
  const swatches = entries.slice(0, PROCREATE_MAX_COLORS).map(({ rgb }) => {
    const hsv = rgbToHsv(rgb);
    return {
      hue: hsv.h,
      saturation: hsv.s,
      brightness: hsv.v,
      alpha: 1,
      colorSpace: 0,
    };
  });

  const json = JSON.stringify([
    {
      name: paletteName,
      swatches,
    },
  ]);

  return createZipArchive([{ name: "Swatches.json", data: json }]);
}

function buildBinaryPreview(format, entries, notes = []) {
  const lines = [
    `${format.label} (${entries.length} color${entries.length === 1 ? "" : "s"})`,
    "Binary file — download to import into your app.",
  ];
  notes.forEach((note) => lines.push(note));
  lines.push("");
  entries.slice(0, 8).forEach(({ name, hex }) => {
    lines.push(`${name} — ${hex}`);
  });
  if (entries.length > 8) {
    lines.push(`…and ${entries.length - 8} more`);
  }
  return lines.join("\n");
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

  rgb(entries) {
    return entries
      .map(({ rgb }) => `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`)
      .join("\n");
  },

  gpl(entries, paletteName) {
    const lines = [
      "GIMP Palette",
      `Name: ${paletteName}`,
      "Columns: 0",
      "#",
    ];
    entries.forEach(({ name, rgb }) => {
      lines.push(`${rgb.r} ${rgb.g} ${rgb.b} ${name}`);
    });
    return `${lines.join("\n")}\n`;
  },

  ase(entries, paletteName, format) {
    const content = encodeAse(entries);
    return {
      content,
      preview: buildBinaryPreview(format, entries),
    };
  },

  procreate(entries, paletteName, format) {
    const notes = [];
    if (entries.length > PROCREATE_MAX_COLORS) {
      notes.push(
        `Procreate supports up to ${PROCREATE_MAX_COLORS} colors; extra colors are omitted.`,
      );
    }
    const exported = entries.slice(0, PROCREATE_MAX_COLORS);
    return {
      content: buildProcreateSwatches(exported, paletteName),
      preview: buildBinaryPreview(format, exported, notes),
    };
  },

  "powerpoint-xml"(entries, paletteName) {
    return buildPowerPointThemeXml(entries, paletteName);
  },

  "powerpoint-thmx"(entries, paletteName, format) {
    const notes = [];
    if (entries.length > POWERPOINT_MAX_COLORS) {
      notes.push(
        `PowerPoint supports up to ${POWERPOINT_MAX_COLORS} custom colors; extra colors are omitted.`,
      );
    }
    const exported = entries.slice(0, POWERPOINT_MAX_COLORS);
    return {
      content: buildPowerPointThmx(exported, paletteName),
      preview: buildBinaryPreview(format, exported, notes),
    };
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
  const result = formatter(entries, paletteName, format);
  const content =
    result && typeof result === "object" && "content" in result
      ? result.content
      : result;
  const preview =
    result && typeof result === "object" && "preview" in result
      ? result.preview
      : content;

  const blob = new Blob([content], { type: format.mimeType });

  return {
    blob,
    filename: `${slugifyPaletteFilename(paletteName)}.${format.extension}`,
    mimeType: format.mimeType,
    preview,
  };
}
