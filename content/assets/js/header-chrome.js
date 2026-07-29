import {
  buildFilterSummary,
  canShareFilterState,
  canExportPalette,
  hasActiveFilters,
} from "./filter-summary.js";

export function initHeaderChrome({
  pillEl,
  clearButton,
  copyLinkButton,
  exportButton,
  mobileDrawer,
  totalCount = 0,
} = {}) {
  function update(state) {
    const filtersActive = hasActiveFilters(state);
    const shareable = canShareFilterState(state);
    const exportable = canExportPalette(state);

    if (pillEl) {
      if (filtersActive) {
        pillEl.hidden = false;
        pillEl.textContent = buildFilterSummary(state, { totalCount });
      } else {
        pillEl.hidden = true;
        pillEl.textContent = "";
      }
    }

    mobileDrawer?.syncContextualActions(state, {
      hasFilters: filtersActive,
      canShare: shareable,
      canExport: exportable,
    });

    const contextualEl = document.getElementById("filter-actions-contextual");
    if (contextualEl && contextualEl.closest(".filter-actions-bar")) {
      contextualEl.hidden = !(filtersActive || shareable || exportable);
    }

    if (clearButton) {
      clearButton.hidden = !filtersActive;
    }
    if (copyLinkButton) {
      copyLinkButton.hidden = !shareable;
    }
    if (exportButton) {
      exportButton.hidden = !exportable;
    }
  }

  return { update };
}
