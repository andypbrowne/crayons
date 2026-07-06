import { normalizeHex } from "./color-utils.js";

// Naming themes match against the crayon's *name*, not its color. A crayon can
// belong to more than one theme (e.g. Salmon is both an animal and a food).
export const THEMES = [
  {
    id: "food",
    label: "Food & Drink",
    keywords: [
      "almond", "apricot", "banana", "chestnut", "candy", "eggplant",
      "apple", "lime", "lemon", "macaroni", "cheese", "mango", "melon",
      "carrot", "olive", "peach", "plum", "sherbert", "sherbet",
      "strawberry", "watermelon", "tangerine", "jam", "asparagus",
    ],
  },
  {
    id: "plants",
    label: "Plants & Flowers",
    keywords: [
      "bell", "carnation", "cornflower", "dandelion", "fern", "forest",
      "goldenrod", "jungle", "lavender", "meadow", "orchid", "pine",
      "shamrock", "weed", "wisteria", "periwinkle",
    ],
  },
  {
    id: "animals",
    label: "Animals",
    keywords: [
      "beaver", "canary", "worm", "manatee", "flamingo", "piggy",
      "robin", "salmon", "wolf",
    ],
  },
  {
    id: "sky-water",
    label: "Sky & Water",
    keywords: [
      "aquamarine", "marine", "caribbean", "midnight", "space",
      "pacific", "sea", "sky", "sunset", "ocean",
    ],
  },
];

const THEME_IDS = new Set(THEMES.map((theme) => theme.id));

let themeToHexes = new Map();

function tokenize(name) {
  return String(name)
    .toLowerCase()
    .replace(/['’]/g, "")
    .split(/[^a-z]+/)
    .filter(Boolean);
}

export function getColorThemes(name) {
  const tokens = tokenize(name);
  if (!tokens.length) return [];

  return THEMES.filter((theme) =>
    tokens.some((token) =>
      theme.keywords.some((keyword) => token.includes(keyword)),
    ),
  ).map((theme) => theme.id);
}

export function buildThemeIndex(crayonList) {
  themeToHexes = new Map(THEMES.map((theme) => [theme.id, new Set()]));

  crayonList.querySelectorAll("li[data-hex]").forEach((item) => {
    const hex = normalizeHex(item.dataset.hex);
    const name = item.dataset.colorName?.trim();
    if (!hex || !name) return;

    getColorThemes(name).forEach((themeId) => {
      themeToHexes.get(themeId)?.add(hex);
    });
  });

  return { themeToHexes };
}

export function getThemeCounts() {
  const counts = {};
  THEMES.forEach((theme) => {
    counts[theme.id] = themeToHexes.get(theme.id)?.size ?? 0;
  });
  return counts;
}

export function getThemeAllowedHexes(selectedTheme, validHexSet) {
  if (!selectedTheme || !THEME_IDS.has(selectedTheme)) return null;

  const allowed = [];
  themeToHexes.get(selectedTheme)?.forEach((hex) => {
    if (!validHexSet || validHexSet.has(hex)) {
      allowed.push(hex);
    }
  });

  return allowed.length ? allowed : [];
}
