import {
  MAX_COLORS_PER_PALETTE,
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

export function initPaletteManager({
  container,
  validHexSet,
  onPalettesChange,
}) {
  if (!container) return { update() {} };

  const createForm = document.createElement("div");
  createForm.className = "palette-create-form";
  createForm.innerHTML = `
    <label class="visually-hidden" for="new-palette-name">New palette name</label>
    <input type="text" id="new-palette-name" maxlength="64" placeholder="New palette name">
    <button type="button" class="palette-create-btn">Create palette</button>
  `;

  const manager = document.createElement("div");
  manager.className = "palette-manager";
  manager.hidden = true;

  const shareBar = document.createElement("div");
  shareBar.className = "share-bar";
  shareBar.innerHTML = `
    <button type="button" class="copy-link-btn">Copy link</button>
    <button type="button" class="save-shared-btn" hidden>Save as palette</button>
  `;

  container.appendChild(shareBar);
  container.appendChild(createForm);
  container.appendChild(manager);

  const nameInput = createForm.querySelector("#new-palette-name");
  const createBtn = createForm.querySelector(".palette-create-btn");
  const copyLinkBtn = shareBar.querySelector(".copy-link-btn");
  const saveSharedBtn = shareBar.querySelector(".save-shared-btn");

  createBtn.addEventListener("click", () => {
    const state = getState();
    const result = createPalette(state.userPalettes, nameInput.value);
    if (!result.ok) {
      showToast(result.error);
      return;
    }
    nameInput.value = "";
    persistPalettes(result.palettes, `user:${result.palette.id}`);
    showToast(`Created "${result.palette.name}".`);
  });

  copyLinkBtn.addEventListener("click", () => {
    copyText(buildShareUrl(getState()), "Link copied!");
  });

  saveSharedBtn.addEventListener("click", () => {
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

    persistPalettes(result.palettes, `user:${result.palette.id}`);
    setState({
      activeFilter: `user:${result.palette.id}`,
      sharedColors: null,
    });
    onPalettesChange();
    showToast(`Saved "${result.palette.name}".`);
  });

  function persistPalettes(palettes, nextFilter) {
    saveUserPalettes(palettes);
    const updates = { userPalettes: palettes };
    if (nextFilter) {
      updates.activeFilter = nextFilter;
      if (!nextFilter.startsWith("user:")) {
        updates.sharedColors = null;
      } else {
        updates.sharedColors = null;
      }
    }
    setState(updates);
    onPalettesChange();
  }

  function renderManager(state) {
    const activeUserId = state.activeFilter.startsWith("user:")
      ? state.activeFilter.slice(5)
      : null;
    const activePalette = activeUserId
      ? state.userPalettes.find((palette) => palette.id === activeUserId)
      : null;

    saveSharedBtn.hidden = !(state.activeFilter === "shared" && state.sharedColors?.length);
    createBtn.disabled = state.userPalettes.length >= MAX_PALETTES;
    nameInput.disabled = state.userPalettes.length >= MAX_PALETTES;

    if (!activePalette) {
      manager.hidden = true;
      manager.innerHTML = "";
      return;
    }

    manager.hidden = false;
    manager.innerHTML = `
      <div class="palette-manager-header">
        <strong>${activePalette.name}</strong>
        <span class="palette-count">${activePalette.colors.length}/${MAX_COLORS_PER_PALETTE}</span>
      </div>
      <div class="palette-manager-actions">
        <button type="button" class="palette-rename-btn">Rename</button>
        <button type="button" class="palette-delete-btn">Delete</button>
      </div>
      <div class="palette-swatch-strip" aria-label="Palette colors"></div>
    `;

    const swatchStrip = manager.querySelector(".palette-swatch-strip");
    if (!activePalette.colors.length) {
      const empty = document.createElement("p");
      empty.className = "palette-empty-note";
      empty.textContent = "No colors yet. Use the row menu to add crayons.";
      swatchStrip.appendChild(empty);
    } else {
      activePalette.colors.forEach((hex) => {
        const swatch = document.createElement("button");
        swatch.type = "button";
        swatch.className = "palette-swatch";
        swatch.style.setProperty("--swatch-color", hex);
        swatch.title = `Remove ${hex}`;
        swatch.setAttribute("aria-label", `Remove ${hex}`);
        swatch.innerHTML = `<span class="palette-swatch-color"></span><span class="palette-swatch-label">${hex}</span><span aria-hidden="true">×</span>`;
        swatch.addEventListener("click", () => {
          const result = removeColorFromPalette(state.userPalettes, activePalette.id, hex);
          if (!result.ok) {
            showToast(result.error);
            return;
          }
          persistPalettes(result.palettes, state.activeFilter);
          showToast(`Removed ${hex}.`);
        });
        swatchStrip.appendChild(swatch);
      });
    }

    manager.querySelector(".palette-rename-btn").addEventListener("click", () => {
      const nextName = window.prompt("Rename palette", activePalette.name);
      if (nextName === null) return;
      const result = renamePalette(state.userPalettes, activePalette.id, nextName);
      if (!result.ok) {
        showToast(result.error);
        return;
      }
      persistPalettes(result.palettes);
      showToast("Palette renamed.");
    });

    manager.querySelector(".palette-delete-btn").addEventListener("click", () => {
      const confirmed = window.confirm(`Delete "${activePalette.name}"?`);
      if (!confirmed) return;
      const result = deletePalette(state.userPalettes, activePalette.id);
      persistPalettes(result.palettes, "all");
      showToast("Palette deleted.");
    });
  }

  return {
    update(state) {
      renderManager(state);
    },
    addColorToActivePalette(hex) {
      const state = getState();
      const activeUserId = state.activeFilter.startsWith("user:")
        ? state.activeFilter.slice(5)
        : null;
      if (!activeUserId) return { ok: false, error: "Select one of your palettes first." };

      const result = addColorToPalette(
        state.userPalettes,
        activeUserId,
        hex,
        validHexSet,
      );
      if (!result.ok) return result;

      persistPalettes(result.palettes, state.activeFilter);
      return { ok: true };
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
    createPaletteWithColor(name, hex) {
      const state = getState();
      const result = createPalette(state.userPalettes, name, hex ? [hex] : []);
      if (!result.ok) return result;
      persistPalettes(result.palettes, `user:${result.palette.id}`);
      return result;
    },
  };
}
