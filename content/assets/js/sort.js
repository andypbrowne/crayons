import { brightness, hexToHSL } from "./color-utils.js";

// Rotate the wheel so hue 345 becomes the origin. This keeps reds (which
// straddle the 0/360 boundary) contiguous at the start and lets pinks trail
// the purples at the end, producing a clean red -> pink rainbow.
const HUE_ORIGIN = 345;

function hueSortKey(hex) {
  const { h, s, l } = hexToHSL(hex);
  return {
    // Grays/black/white have no meaningful hue, so group them separately.
    achromatic: s <= 12,
    hue: (h - HUE_ORIGIN + 360) % 360,
    lightness: l,
  };
}

function compareHue(hexA, hexB) {
  const a = hueSortKey(hexA);
  const b = hueSortKey(hexB);

  if (a.achromatic !== b.achromatic) {
    return a.achromatic ? 1 : -1;
  }

  if (a.achromatic) {
    return a.lightness - b.lightness;
  }

  if (a.hue !== b.hue) {
    return a.hue - b.hue;
  }

  return b.lightness - a.lightness;
}

function mulberry32(seed) {
  let t = seed >>> 0;
  return function next() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleInPlace(items, seed) {
  const random = mulberry32(seed || 1);
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    const tmp = items[i];
    items[i] = items[j];
    items[j] = tmp;
  }
}

export function createSorter(crayonList) {
  const originalOrder = Array.from(crayonList.children);

  function getHex(item) {
    return item.dataset.hex ?? item.querySelector("[data-hex]")?.dataset.hex ?? "";
  }

  return function applySort(sortBy, shuffleSeed = 0) {
    const crayons = Array.from(crayonList.children);

    if (sortBy === "default") {
      originalOrder.forEach((crayon) => crayonList.appendChild(crayon));
      return;
    }

    if (sortBy === "random") {
      shuffleInPlace(crayons, shuffleSeed);
    } else if (sortBy === "color") {
      crayons.sort((a, b) => getHex(a).localeCompare(getHex(b)));
    } else if (sortBy === "brightness") {
      crayons.sort((a, b) => brightness(getHex(a)) - brightness(getHex(b)));
    } else if (sortBy === "hue") {
      crayons.sort((a, b) => compareHue(getHex(a), getHex(b)));
    } else if (sortBy === "saturation") {
      crayons.sort(
        (a, b) => hexToHSL(getHex(a)).s - hexToHSL(getHex(b)).s,
      );
    }

    crayons.forEach((crayon) => crayonList.appendChild(crayon));
  };
}
