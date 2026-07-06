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

export function createSorter(crayonList) {
  const originalOrder = Array.from(crayonList.children);

  function getHex(item) {
    return item.dataset.hex ?? item.querySelector("[data-hex]")?.dataset.hex ?? "";
  }

  return function applySort(sortBy) {
    const crayons = Array.from(crayonList.children);

    if (sortBy === "default") {
      originalOrder.forEach((crayon) => crayonList.appendChild(crayon));
      return;
    }

    if (sortBy === "color") {
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
