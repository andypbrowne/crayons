import {
  getState,
  setState,
  subscribe,
  getVisibleColors,
  initVisibleColorsContext,
} from "./app-state.js";
import { buildValidHexSet, buildHexNameMap, buildNameHexMap } from "./color-utils.js";
import { applyFilter } from "./filter.js";
import { initFilterUI } from "./filter-ui.js";
import { initBrowseFiltersUI } from "./browse-filters-ui.js";
import { initThemeFilterUI } from "./theme-filter-ui.js";
import { buildFamilyIndex } from "./color-family.js";
import { buildThemeIndex } from "./color-theme.js";
import { initPaletteManager } from "./palette-manager.js";
import { initRowMenus } from "./row-menu.js";
import { createSorter } from "./sort.js";
import { loadUserPalettes } from "./user-palettes.js";
import { readUrlState, writeUrlState } from "./url-sync.js";
import { isPresetId } from "./presets.js";
import { showToast } from "./toast.js";
import { updateShareMetaFromState } from "./share-meta.js";
import { initPanelChrome } from "./panel-chrome.js";
import { initPanelRegistry } from "./panel-registry.js";
import { initPanelMenu } from "./panel-menu.js";
import { initLayoutUI, loadSavedLayout } from "./layout-ui.js";

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

  const registry = initPanelRegistry();

  initPanelChrome(document.getElementById("filters-panel"), {
    id: "filters",
    title: "Explore",
    hostEl: document.getElementById("filters-host"),
    mobileToggle: document.getElementById("filters-panel-toggle"),
    registry,
  });

  initPanelChrome(document.getElementById("palettes-panel"), {
    id: "palettes",
    title: "Palettes",
    hostEl: document.getElementById("palettes-host"),
    mobileToggle: document.getElementById("palettes-panel-toggle"),
    registry,
  });

  initPanelMenu({
    registry,
    menuEl: document.getElementById("panels-menu"),
    triggerEl: document.getElementById("panels-menu-trigger"),
  });

  const validHexSet = buildValidHexSet(crayonList);
  const colorNameMap = buildHexNameMap(crayonList);
  const nameHexMap = buildNameHexMap(crayonList);
  buildFamilyIndex(crayonList);
  buildThemeIndex(crayonList);
  initVisibleColorsContext(validHexSet);
  const userPalettes = loadUserPalettes();
  const urlState = readUrlState(validHexSet, nameHexMap);
  const initialState = {
    ...resolveInitialFilter(urlState, userPalettes),
    layout: loadSavedLayout(),
  };

  if (
    urlState.sharedColors?.length === 0 &&
    new URLSearchParams(window.location.search).has("colors")
  ) {
    showToast("Shared link had no valid colors.");
  }

  setState(initialState);

  const applySort = createSorter(crayonList);

  function syncPage(state) {
    applySort(state.sort, state.shuffleSeed);
    applyFilter(crayonList, getVisibleColors(state));
    writeUrlState(state, colorNameMap);
    updateShareMetaFromState(state, colorNameMap);
  }

  const layoutUi = initLayoutUI({
    crayonList,
    select: document.getElementById("layout-options"),
  });

  const browseFiltersUi = initBrowseFiltersUI({
    container: document.getElementById("color-family-filters"),
    onFamilyChange(colorFamily) {
      setState({ colorFamily });
    },
  });

  const themeFilterUi = initThemeFilterUI({
    select: document.getElementById("theme-options"),
    onThemeChange(theme) {
      setState({ theme });
    },
  });

  const filterUi = initFilterUI({
    filterGroup,
    toggleButton: starterToggle,
    sortOptions,
    onSortChange(sort) {
      if (sort === "random") {
        setState({ sort: "random", shuffleSeed: getState().shuffleSeed + 1 });
        return;
      }
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
    colorNameMap,
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
  browseFiltersUi.update(state);
  themeFilterUi.update(state);
  paletteManager.update(state);
  rowMenus.updateMenus(state);
  layoutUi.update(state);

  subscribe((state) => {
    syncPage(state);
    filterUi.update(state);
    browseFiltersUi.update(state);
    themeFilterUi.update(state);
    paletteManager.update(state);
    rowMenus.updateMenus(state);
    layoutUi.update(state);
  });

  syncPage(state);
  layoutUi.update(getState());
});
