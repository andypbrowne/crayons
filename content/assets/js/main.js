import {
  getState,
  setState,
  subscribe,
  getActiveColors,
} from "./app-state.js";
import { buildValidHexSet, buildHexNameMap } from "./color-utils.js";
import { applyFilter } from "./filter.js";
import { initFilterUI } from "./filter-ui.js";
import { initPaletteManager } from "./palette-manager.js";
import { initRowMenus } from "./row-menu.js";
import { createSorter } from "./sort.js";
import { loadUserPalettes } from "./user-palettes.js";
import { readUrlState, writeUrlState } from "./url-sync.js";
import { isPresetId } from "./presets.js";
import { showToast } from "./toast.js";
import { updateShareMetaFromState } from "./share-meta.js";

function resolveInitialFilter(urlState, userPalettes) {
  if (urlState.sharedColors?.length) {
    return {
      sort: urlState.sort,
      activeFilter: "shared",
      sharedColors: urlState.sharedColors,
      userPalettes,
    };
  }

  if (urlState.activeFilter.startsWith("user:")) {
    const id = urlState.activeFilter.slice(5);
    const exists = userPalettes.some((palette) => palette.id === id);
    if (!exists) {
      showToast("Saved palette not found on this device.");
      return {
        sort: urlState.sort,
        activeFilter: "all",
        sharedColors: null,
        userPalettes,
      };
    }
  } else if (
    urlState.activeFilter !== "all" &&
    !isPresetId(urlState.activeFilter)
  ) {
    return {
      sort: urlState.sort,
      activeFilter: "all",
      sharedColors: null,
      userPalettes,
    };
  }

  return {
    sort: urlState.sort,
    activeFilter: urlState.activeFilter,
    sharedColors: null,
    userPalettes,
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const crayonList = document.getElementById("crayon-list");
  const sortOptions = document.getElementById("sort-options");
  const filterGroup = document.getElementById("palette-filter-group");
  const paletteTools = document.getElementById("palette-tools");
  const starterToggle = document.getElementById("starter-palettes-toggle");
  const newPaletteButton = document.getElementById("new-palette-btn");
  const clearButton = document.getElementById("filter-clear-btn");
  const copyLinkButton = document.getElementById("filter-copy-link-btn");
  const saveSharedButton = document.getElementById("save-shared-btn");

  if (!crayonList) return;

  const validHexSet = buildValidHexSet(crayonList);
  const colorNameMap = buildHexNameMap(crayonList);
  const userPalettes = loadUserPalettes();
  const urlState = readUrlState(validHexSet);
  const initialState = resolveInitialFilter(urlState, userPalettes);

  if (
    urlState.sharedColors?.length === 0 &&
    new URLSearchParams(window.location.search).has("colors")
  ) {
    showToast("Shared link had no valid colors.");
  }

  setState(initialState);

  const applySort = createSorter(crayonList);

  function syncPage(state) {
    applySort(state.sort);
    applyFilter(crayonList, getActiveColors(state));
    writeUrlState(state);
    updateShareMetaFromState(state, colorNameMap);
  }

  const filterUi = initFilterUI({
    filterGroup,
    toggleButton: starterToggle,
    sortOptions,
    onSortChange(sort) {
      setState({ sort });
    },
    onFilterChange(value) {
      if (value === "shared") {
        setState({ activeFilter: "shared" });
        return;
      }
      setState({
        activeFilter: value,
        sharedColors: null,
      });
    },
  });

  const paletteManager = initPaletteManager({
    container: paletteTools,
    newPaletteButton,
    clearButton,
    copyLinkButton,
    saveSharedButton,
    validHexSet,
    onFilterChange(value) {
      setState({
        activeFilter: value,
        sharedColors: null,
      });
    },
    onPalettesChange() {},
  });

  const rowMenus = initRowMenus({ crayonList, paletteManager });

  const state = getState();
  filterUi.update(state);
  paletteManager.update(state);
  rowMenus.updateMenus(state);

  subscribe((state) => {
    syncPage(state);
    filterUi.update(state);
    paletteManager.update(state);
    rowMenus.updateMenus(state);
  });

  syncPage(state);
});
