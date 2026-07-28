import {
  buildFilterSummary,
  canShareFilterState,
  hasActiveFilters,
} from "./filter-summary.js";

export function initHeaderChrome({
  pillEl,
  clearButton,
  copyLinkButton,
  mobileDrawer,
  totalCount = 0,
} = {}) {
  function update(state) {
    const filtersActive = hasActiveFilters(state);
    const shareable = canShareFilterState(state);

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
    });

    const contextualEl = document.getElementById("filter-actions-contextual");
    if (contextualEl && contextualEl.closest(".filter-actions-bar")) {
      contextualEl.hidden = !(filtersActive || shareable);
    }

    if (clearButton) {
      clearButton.hidden = !filtersActive;
    }
    if (copyLinkButton) {
      copyLinkButton.hidden = !shareable;
    }
  }

  return { update };
}
