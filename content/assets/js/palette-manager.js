import {
  MAX_PALETTES,
  addColorToPalette,
  createPalette,
  deletePalette,
  removeColorFromPalette,
  renamePalette,
  saveUserPalettes,
} from "./user-palettes.js";
import { getState, setState } from "./app-state.js";
import { showToast, copyText } from "./toast.js";
import { buildShareUrl } from "./url-sync.js";

function createColorTag(colors) {
  const tag = document.createElement("span");
  tag.className = "palette-color-tag";
  colors.forEach((hex) => {
    const swatch = document.createElement("span");
    swatch.className = "palette-color-tag-swatch";
    swatch.style.backgroundColor = hex;
    tag.appendChild(swatch);
  });
  return tag;
}

function createKebabMenu(palette, { onRename, onDelete }) {
  const menuId = `palette-menu-${palette.id}`;
  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "palette-kebab-btn kebab-btn";
  trigger.setAttribute("popovertarget", menuId);
  trigger.setAttribute("aria-label", `Actions for ${palette.name}`);
  trigger.addEventListener("click", (event) => event.stopPropagation());
  trigger.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="34" viewBox="0 0 20 34" aria-hidden="true"><circle cx="10" cy="8" r="2" fill="currentColor"/><circle cx="10" cy="17" r="2" fill="currentColor"/><circle cx="10" cy="26" r="2" fill="currentColor"/></svg>`;

  const menu = document.createElement("div");
  menu.className = "palette-kebab-menu";
  menu.popover = "auto";
  menu.id = menuId;
  menu.role = "menu";
  menu.innerHTML = `
    <button type="button" class="palette-kebab-item" data-action="rename" role="menuitem">Rename</button>
    <hr class="palette-kebab-divider">
    <button type="button" class="palette-kebab-item palette-kebab-item-danger" data-action="delete" role="menuitem">Delete</button>
  `;

  menu.addEventListener("click", (event) => {
    const action = event.target.closest("[data-action]")?.dataset.action;
    if (!action) return;
    menu.hidePopover?.();
    if (action === "rename") onRename();
    if (action === "delete") onDelete();
  });

  return { trigger, menu };
}

export function initPaletteManager({
  container,
  newPaletteButton,
  clearButton,
  copyLinkButton,
  saveSharedButton,
  validHexSet,
  onFilterChange,
  onPalettesChange,
}) {
  if (!container) return { update() {} };

  function persistPalettes(palettes, { nextFilter, selectedPaletteId } = {}) {
    saveUserPalettes(palettes);
    const updates = { userPalettes: palettes };
    if (nextFilter) {
      updates.activeFilter = nextFilter;
      updates.sharedColors = null;
    }
    if (selectedPaletteId !== undefined) {
      updates.selectedPaletteId = selectedPaletteId;
    }
    setState(updates);
    onPalettesChange();
  }

  function removeColor(paletteId, hex) {
    const state = getState();
    const result = removeColorFromPalette(state.userPalettes, paletteId, hex);
    if (!result.ok) {
      showToast(result.error);
      return;
    }

    const palette = result.palettes.find((entry) => entry.id === paletteId);
    const isActiveFilter = state.activeFilter === `user:${paletteId}`;
    const nextFilter =
      isActiveFilter && !palette?.colors?.length ? "all" : undefined;

    persistPalettes(result.palettes, {
      nextFilter,
      selectedPaletteId: palette?.colors?.length ? paletteId : null,
    });
    showToast("Color removed.");
  }

  function handleRename(palette) {
    const nextName = window.prompt("Rename palette", palette.name);
    if (nextName === null) return;
    const state = getState();
    const result = renamePalette(state.userPalettes, palette.id, nextName);
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    persistPalettes(result.palettes);
    showToast("Palette renamed.");
  }

  function handleDelete(palette) {
    const confirmed = window.confirm(`Delete "${palette.name}"?`);
    if (!confirmed) return;
    const state = getState();
    const result = deletePalette(state.userPalettes, palette.id);
    const nextFilter = state.activeFilter === `user:${palette.id}` ? "all" : state.activeFilter;
    const nextSelected =
      state.selectedPaletteId === palette.id ? null : state.selectedPaletteId;
    persistPalettes(result.palettes, { nextFilter, selectedPaletteId: nextSelected });
    showToast("Palette deleted.");
  }

  if (newPaletteButton) {
    newPaletteButton.addEventListener("click", () => {
      const state = getState();
      if (state.userPalettes.length >= MAX_PALETTES) {
        showToast("You can save up to 10 palettes.");
        return;
      }
      const name = window.prompt("Name your new palette");
      if (name === null) return;
      const result = createPalette(state.userPalettes, name);
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      persistPalettes(result.palettes, {
        selectedPaletteId: result.palette.id,
      });
      showToast("Choose your colors from the list.");
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      setState({ activeFilter: "all", sharedColors: null, selectedPaletteId: null });
      onPalettesChange();
    });
  }

  if (copyLinkButton) {
    copyLinkButton.addEventListener("click", () => {
      copyText(buildShareUrl(getState()), "Link copied!");
    });
  }

  if (saveSharedButton) {
    saveSharedButton.addEventListener("click", () => {
      const state = getState();
      if (!state.sharedColors?.length) return;

      const suggestedName = `Shared palette (${state.sharedColors.length})`;
      const name = window.prompt("Name this palette", suggestedName);
      if (name === null) return;

      const result = createPalette(state.userPalettes, name, state.sharedColors);
      if (!result.ok) {
        showToast(result.error);
        return;
      }

      persistPalettes(result.palettes, {
        nextFilter: `user:${result.palette.id}`,
        selectedPaletteId: result.palette.id,
      });
      showToast(`Saved "${result.palette.name}".`);
    });
  }

  function renderUserPalettes(state) {
    container.innerHTML = "";

    if (saveSharedButton) {
      saveSharedButton.hidden = !(state.activeFilter === "shared" && state.sharedColors?.length);
    }

    if (newPaletteButton) {
      newPaletteButton.disabled = state.userPalettes.length >= MAX_PALETTES;
    }

    state.userPalettes.forEach((palette) => {
      const isActive = state.activeFilter === `user:${palette.id}`;
      const isSelected = state.selectedPaletteId === palette.id;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "user-palette-row";
      if (isActive) row.classList.add("is-active");
      if (isSelected) row.classList.add("is-selected");

      const colorTag = createColorTag(palette.colors);
      const name = document.createElement("span");
      name.className = "user-palette-name";
      name.textContent = `${palette.name} (${palette.colors.length})`;

      const actions = document.createElement("span");
      actions.className = "user-palette-actions";
      const { trigger, menu } = createKebabMenu(palette, {
        onRename: () => handleRename(palette),
        onDelete: () => handleDelete(palette),
      });

      actions.appendChild(trigger);
      actions.appendChild(menu);

      row.addEventListener("click", (event) => {
        if (event.target.closest(".palette-kebab-btn, .palette-kebab-menu")) return;

        if (palette.colors.length === 0) {
          setState({ selectedPaletteId: palette.id });
          return;
        }

        onFilterChange(`user:${palette.id}`);
        setState({ selectedPaletteId: palette.id });
      });

      row.appendChild(colorTag);
      row.appendChild(name);
      row.appendChild(actions);
      container.appendChild(row);
    });
  }

  return {
    update(state) {
      renderUserPalettes(state);
    },
    addColorToPalette(paletteId, hex) {
      const state = getState();
      const result = addColorToPalette(
        state.userPalettes,
        paletteId,
        hex,
        validHexSet,
      );
      if (!result.ok) return result;

      persistPalettes(result.palettes);
      return { ok: true };
    },
    removeColorFromPalette(paletteId, hex) {
      removeColor(paletteId, hex);
      return { ok: true };
    },
    createPaletteWithColor(name, hex) {
      const state = getState();
      const result = createPalette(state.userPalettes, name, hex ? [hex] : []);
      if (!result.ok) return result;
      persistPalettes(result.palettes, {
        nextFilter: hex ? `user:${result.palette.id}` : undefined,
        selectedPaletteId: result.palette.id,
      });
      return result;
    },
  };
}
