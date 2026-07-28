const MOBILE_QUERY = "(max-width: 999px)";

export function initMobileDrawer({
  drawerEl,
  openButton,
  closeButton,
  backdropEl,
  tabButtons,
  tabPanels,
  filtersPanel,
  palettesPanel,
  filtersSlot,
  palettesSlot,
  filtersHost,
  palettesHost,
  contextualEl,
  contextualHost,
  contextualDrawerSlot,
  clearButton,
  copyLinkButton,
} = {}) {
  if (!drawerEl || !filtersPanel || !palettesPanel) {
    return { open() {}, close() {}, isOpen: () => false };
  }

  const mobileMedia = window.matchMedia(MOBILE_QUERY);
  let activeTab = "filters";
  let isOpen = false;
  let mountedInDrawer = false;

  function isMobile() {
    return mobileMedia.matches;
  }

  function mountPanelsInDrawer() {
    if (mountedInDrawer) return;
    filtersSlot?.appendChild(filtersPanel);
    palettesSlot?.appendChild(palettesPanel);
    filtersPanel.classList.add("is-mobile-drawer-panel");
    palettesPanel.classList.add("is-mobile-drawer-panel");
    mountedInDrawer = true;
  }

  function mountPanelsInHosts() {
    if (!mountedInDrawer) return;
    filtersHost?.appendChild(filtersPanel);
    palettesHost?.appendChild(palettesPanel);
    filtersPanel.classList.remove("is-mobile-drawer-panel");
    palettesPanel.classList.remove("is-mobile-drawer-panel");
    mountedInDrawer = false;
  }

  function syncPanelMount() {
    if (isMobile()) {
      mountPanelsInDrawer();
      mountContextualInDrawer();
      return;
    }
    close({ restoreFocus: false });
    mountPanelsInHosts();
    mountContextualInHeader();
  }

  function setTab(tabId) {
    activeTab = tabId;
    tabButtons?.forEach((button) => {
      const selected = button.dataset.tab === tabId;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    tabPanels?.forEach((panel) => {
      const show = panel.dataset.tabPanel === tabId;
      panel.hidden = !show;
    });
  }

  function mountContextualInDrawer() {
    contextualDrawerSlot?.appendChild(contextualEl);
  }

  function mountContextualInHeader() {
    contextualHost?.prepend(contextualEl);
  }

  function syncContextualActions(state, { hasFilters, canShare }) {
    if (!contextualEl) return;
    const showActions = hasFilters || canShare;
    if (contextualDrawerSlot) {
      contextualDrawerSlot.hidden = !showActions;
    }
    if (clearButton) {
      clearButton.hidden = !hasFilters;
    }
    if (copyLinkButton) {
      copyLinkButton.hidden = !canShare;
    }
  }

  function setOpenUi(nextOpen) {
    openButton?.setAttribute("aria-expanded", String(nextOpen));
  }

  function open({ tab = activeTab } = {}) {
    if (!isMobile()) return;
    mountPanelsInDrawer();
    setTab(tab);
    isOpen = true;
    drawerEl.hidden = false;
    setOpenUi(true);
    requestAnimationFrame(() => {
      drawerEl.classList.add("is-open");
    });
    document.body.classList.add("mobile-drawer-open");
    closeButton?.focus();
  }

  function close({ restoreFocus = true } = {}) {
    if (!isOpen) return;
    isOpen = false;
    drawerEl.classList.remove("is-open");
    setOpenUi(false);
    document.body.classList.remove("mobile-drawer-open");
    window.setTimeout(() => {
      if (!isOpen) {
        drawerEl.hidden = true;
      }
    }, 220);
    if (restoreFocus) {
      openButton?.focus();
    }
  }

  tabButtons?.forEach((button) => {
    button.addEventListener("click", () => {
      setTab(button.dataset.tab);
    });
  });

  openButton?.addEventListener("click", () => {
    if (isOpen) {
      close();
      return;
    }
    open();
  });

  closeButton?.addEventListener("click", () => close());
  backdropEl?.addEventListener("click", () => close());

  drawerEl.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
    }
  });

  mobileMedia.addEventListener("change", syncPanelMount);
  syncPanelMount();

  return {
    open,
    close,
    isOpen: () => isOpen,
    setTab,
    syncContextualActions,
  };
}
