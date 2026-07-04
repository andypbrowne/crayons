import { brightness, hexToHSL } from "./color-utils.js";

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
      crayons.sort((a, b) => hexToHSL(getHex(a)).h - hexToHSL(getHex(b)).h);
    } else if (sortBy === "saturation") {
      crayons.sort(
        (a, b) => hexToHSL(getHex(a)).s - hexToHSL(getHex(b)).s,
      );
    }

    crayons.forEach((crayon) => crayonList.appendChild(crayon));
  };
}
