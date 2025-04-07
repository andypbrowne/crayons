document.addEventListener("DOMContentLoaded", () => {
  const buttons = document.querySelectorAll(".copy-btn");
  console.log(`Found ${buttons.length} copy buttons`);

  buttons.forEach((button) => {
    button.addEventListener("click", () => {
      const snippetId = button.getAttribute("data-snippet-id");
      const snippet = document.getElementById(snippetId);
      if (snippet) {
        const textToCopy = snippet.textContent;
        navigator.clipboard.writeText(textToCopy).then(() => {
          const tooltip = document.createElement("div");
          tooltip.textContent = "Copied!";
          tooltip.style.position = "absolute";
          tooltip.style.top = "-30px";
          tooltip.style.left = "50%";
          tooltip.style.transform = "translateX(-50%)";
          tooltip.style.backgroundColor = "black";
          tooltip.style.color = "white";
          tooltip.style.padding = "5px 10px";
          tooltip.style.borderRadius = "4px";
          tooltip.style.fontSize = "0.8rem";
          tooltip.style.boxShadow = "0 2px 4px rgba(0, 0, 0, 0.2)";
          tooltip.style.zIndex = "1000";
          tooltip.style.pointerEvents = "none";

          button.style.position = "relative";
          button.appendChild(tooltip);

          setTimeout(() => {
            tooltip.remove();
          }, 2000);
        }).catch((err) => {
          console.error("Failed to copy text: ", err);
        });
      } else {
        console.error(`Snippet with ID ${snippetId} not found`);
      }
    });
  });

  // Sorting functionality
  const sortOptions = document.getElementById("sort-options");
  const crayonList = document.getElementById("crayon-list");
  const originalOrder = Array.from(crayonList.children); // Save the original order
  const paletteFilters = document.querySelectorAll('input[name="palette-filter"]');

  const palettes = {
    palette1: ["#1A4876", "#7442C8", "#A2ADD0", "#1F75FE", "#FFCFAB"], 
    palette2: ["#FFA474", "#CEFF1D", "#FF1DCE", "#FEFE22", "#1FCECB"], 
    palette3: ["#FFBCD9", "#FDDDE6", "#EF98AA", "#FC89AC", "#FFBD88"],
    palette4: ["#71BC78", "#87A96B", "#FFFF99", "#EFCDB8", "#FFCFAB"],
    palette5: ["#EA7E5D", "#FCD975", "#E6A8D7", "#1CA9C9", "#C364C5"],
    palette6: ["#FF5349", "#E7C697", "#93DFB8", "#80DAEB", "#D68A59"],
    palette7: ["#1A4876", "#9D81BA", "#8A795D", "#C0448F", "#CDA4DE"],
  };

  sortOptions.addEventListener("change", (event) => {
    console.log(`Sort option selected: ${event.target.value}`);

    const sortBy = event.target.value;
    const crayons = Array.from(crayonList.children);

    if (sortBy === "default") {
      // Restore the original order
      originalOrder.forEach((crayon) => crayonList.appendChild(crayon));
    } else if (sortBy === "color") {
      // Sort by color (alphabetical by name)
      crayons.sort((a, b) => {
        const colorA = a.querySelector("code").textContent.trim();
        const colorB = b.querySelector("code").textContent.trim();
        return colorA.localeCompare(colorB);
      });
      crayons.forEach((crayon) => crayonList.appendChild(crayon));
    } else if (sortBy === "brightness") {
      // Sort by brightness
      crayons.sort((a, b) => {
        const brightnessA = brightness(a.querySelector("code").textContent.trim());
        const brightnessB = brightness(b.querySelector("code").textContent.trim());
        return brightnessA - brightnessB;
      });
      crayons.forEach((crayon) => crayonList.appendChild(crayon));
    } else if (sortBy === "hue") {
      // Sort by hue
      crayons.sort((a, b) => {
        const hueA = hexToHSL(a.querySelector("code").textContent.trim()).h;
        const hueB = hexToHSL(b.querySelector("code").textContent.trim()).h;
        return hueA - hueB;
      });
      crayons.forEach((crayon) => crayonList.appendChild(crayon));
    } else if (sortBy === "saturation") {
      // Sort by saturation
      crayons.sort((a, b) => {
        const saturationA = hexToHSL(a.querySelector("code").textContent.trim()).s;
        const saturationB = hexToHSL(b.querySelector("code").textContent.trim()).s;
        return saturationA - saturationB;
      });
      crayons.forEach((crayon) => crayonList.appendChild(crayon));
    }
  });

  // Filtering functionality
  paletteFilters.forEach((filter) => {
    filter.addEventListener("change", (event) => {
      const selectedPalette = event.target.value;
      const crayons = Array.from(crayonList.children);

      if (selectedPalette === "all") {
        crayons.forEach((crayon) => (crayon.style.display = ""));
      } else {
        const paletteColors = palettes[selectedPalette];
        crayons.forEach((crayon) => {
          const crayonColor = crayon.querySelector("code").textContent.trim();
          if (paletteColors.includes(crayonColor)) {
            crayon.style.display = "";
          } else {
            crayon.style.display = "none";
          }
        });
      }
    });
  });
});

// Helper function to calculate brightness from hex
function brightness(hex) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return Math.round((r * 299 + g * 587 + b * 114) / 1000);
}

// Helper function to convert hex to HSL
function hexToHSL(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0,
    s = 0,
    l = (max + min) / 2;

  if (max !== min) {
    const delta = max - min;
    s = l > 0.5 ? delta / (2 - max - min) : delta / (max + min);

    if (max === r) {
      h = (g - b) / delta + (g < b ? 6 : 0);
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else if (max === b) {
      h = (r - g) / delta + 4;
    }

    h /= 6;
  }

  return {
    h: Math.round(h * 360), // Hue in degrees
    s: Math.round(s * 100), // Saturation in percentage
    l: Math.round(l * 100), // Lightness in percentage
  };
}