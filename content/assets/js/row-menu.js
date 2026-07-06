import { MAX_COLORS_PER_PALETTE, MAX_PALETTES } from "./user-palettes.js";
import { getState } from "./app-state.js";
import { copyText, showToast } from "./toast.js";
import { showPrompt } from "./prompt-dialog.js";

export function initRowMenus({ crayonList, paletteManager }) {
  if (!crayonList) return;

  crayonList.addEventListener("click", async (event) => {
    const actionButton = event.target.closest("[data-action]");
    if (!actionButton) return;

    const menu = actionButton.closest(".row-actions-menu");
    const hex = menu?.dataset.hex;
    const colorName = menu?.dataset.colorName;
    const action = actionButton.dataset.action;

    if (action === "copy-hex" && hex) {
      await copyText(hex, "Hex copied!");
      menu?.hidePopover?.();
      return;
    }

    if (action === "copy-name" && colorName) {
      await copyText(colorName, "Name copied!");
      menu?.hidePopover?.();
      return;
    }

    if (action === "add-to-palette") {
      const paletteId = actionButton.dataset.paletteId;
      if (!paletteId) return;

      if (paletteId === "__new__") {
        const name = await showPrompt({ message: "Name your new palette" });
        if (name === null) return;
        const result = paletteManager.createPaletteWithColor(name, hex);
        if (!result.ok) {
          showToast(result.error);
          return;
        }
        showToast(`Added to "${result.palette.name}".`);
        menu?.hidePopover?.();
        return;
      }

      const result = paletteManager.addColorToPalette(paletteId, hex);
      if (!result.ok) {
        showToast(result.error);
        return;
      }

      const palette = getState().userPalettes.find((entry) => entry.id === paletteId);
      showToast(`Added to "${palette?.name ?? "palette"}".`);
      menu?.hidePopover?.();
      return;
    }

    if (action === "remove-from-palette") {
      const paletteId = actionButton.dataset.paletteId;
      if (!paletteId) return;

      paletteManager.removeColorFromPalette(paletteId, hex);
      menu?.hidePopover?.();
    }
  });

  return {
    updateMenus(state) {
      crayonList.querySelectorAll(".row-actions-menu").forEach((menu) => {
        const submenu = menu.querySelector(".row-actions-submenu");
        if (!submenu) return;

        submenu.innerHTML = "";
        const hex = menu.dataset.hex;

        state.userPalettes.forEach((palette) => {
          const alreadyAdded = palette.colors.includes(hex);
          const isFull = palette.colors.length >= MAX_COLORS_PER_PALETTE;
          const button = document.createElement("button");
          button.type = "button";
          button.className = "row-actions-submenu-item";

          if (alreadyAdded) {
            button.dataset.action = "remove-from-palette";
            button.dataset.paletteId = palette.id;
            button.textContent = `Remove from ${palette.name}`;
          } else {
            button.dataset.action = "add-to-palette";
            button.dataset.paletteId = palette.id;
            button.disabled = isFull;
            button.textContent = isFull
              ? `${palette.name} (full)`
              : palette.name;
          }

          submenu.appendChild(button);
        });

        const createButton = document.createElement("button");
        createButton.type = "button";
        createButton.className = "row-actions-submenu-item";
        createButton.dataset.action = "add-to-palette";
        createButton.dataset.paletteId = "__new__";
        createButton.textContent = "Add to new palette";
        createButton.disabled = state.userPalettes.length >= MAX_PALETTES;
        submenu.appendChild(createButton);
      });
    },
  };
}

export function closeOpenRowMenus() {
  document.querySelectorAll(".row-actions-menu:popover-open").forEach((menu) => {
    menu.hidePopover();
  });
}
