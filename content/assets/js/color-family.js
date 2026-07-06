import { hexToHSL, normalizeHex } from "./color-utils.js";

export const FAMILIES = [
  { id: "red", label: "Reds", swatch: "#CB4154" },
  { id: "orange", label: "Oranges", swatch: "#FF7F49" },
  { id: "yellow", label: "Yellows", swatch: "#FBE870" },
  { id: "green", label: "Greens", swatch: "#1CAC78" },
  { id: "blue", label: "Blues", swatch: "#1F75FE" },
  { id: "purple", label: "Purples", swatch: "#7851A9" },
  { id: "pink", label: "Pinks", swatch: "#DE5D83" },
  { id: "brown", label: "Browns", swatch: "#B4674D" },
  { id: "neutral", label: "Neutrals", swatch: "#95918C" },
];

const FAMILY_IDS = new Set(FAMILIES.map((family) => family.id));

let hexToFamily = new Map();
let familyToHexes = new Map();

function classifyByHue(h) {
  if (h >= 345 || h < 15) return "red";
  if (h < 45) return "orange";
  if (h < 65) return "yellow";
  if (h < 165) return "green";
  if (h < 250) return "blue";
  if (h < 295) return "purple";
  return "pink";
}

export function getColorFamily(hex) {
  const normalized = normalizeHex(hex);
  if (!normalized) return "neutral";

  const { h, s, l } = hexToHSL(normalized);

  if (s <= 12 || l <= 8 || (l >= 92 && s <= 30)) {
    return "neutral";
  }

  if (s <= 28 && l >= 18 && l <= 55) {
    return "brown";
  }

  return classifyByHue(h);
}

export function buildFamilyIndex(crayonList) {
  hexToFamily = new Map();
  familyToHexes = new Map(FAMILIES.map((family) => [family.id, new Set()]));

  crayonList.querySelectorAll("li[data-hex]").forEach((item) => {
    const hex = normalizeHex(item.dataset.hex);
    if (!hex) return;

    const family = getColorFamily(hex);
    hexToFamily.set(hex, family);
    familyToHexes.get(family)?.add(hex);
  });

  return { hexToFamily, familyToHexes };
}

export function getFamilyCounts() {
  const counts = {};
  FAMILIES.forEach((family) => {
    counts[family.id] = familyToHexes.get(family.id)?.size ?? 0;
  });
  return counts;
}

export function getFamilyAllowedHexes(selectedFamily, validHexSet) {
  if (!selectedFamily || !FAMILY_IDS.has(selectedFamily)) return null;

  const allowed = [];
  familyToHexes.get(selectedFamily)?.forEach((hex) => {
    if (!validHexSet || validHexSet.has(hex)) {
      allowed.push(hex);
    }
  });

  return allowed.length ? allowed : [];
}

export function intersectColorSets(baseColors, familyColors) {
  if (!familyColors) {
    return baseColors;
  }

  if (!baseColors) {
    return familyColors;
  }

  const familySet = new Set(familyColors.map((hex) => normalizeHex(hex)).filter(Boolean));
  return baseColors.filter((hex) => familySet.has(normalizeHex(hex)));
}
