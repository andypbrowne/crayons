const DESKTOP_QUERY = "(min-width: 1000px)";
const DOCK_THRESHOLD = 16;

function storageKey(id) {
  return `crayons:panel:${id}`;
}

function readState(id) {
  try {
    const raw = localStorage.getItem(storageKey(id));
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeState(id, state) {
  localStorage.setItem(storageKey(id), JSON.stringify(state));
}

function remPx() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

function headerPx() {
  const val = getComputedStyle(document.documentElement)
    .getPropertyValue("--header-height")
    .trim();
  return parseFloat(val) || 64;
}

export function initPanelChrome(
  panelEl,
  { id, title, hostEl, mobileToggle, registry } = {},
) {
  if (!panelEl || !id) return null;

  const dragHandle = panelEl.querySelector(".panel-drag-handle");
  const collapseBtn = panelEl.querySelector(".panel-collapse-btn");
  const dismissBtn = panelEl.querySelector(".panel-dismiss-btn");
  const titleEl = panelEl.querySelector(".panel-title");
  const desktopMedia = window.matchMedia(DESKTOP_QUERY);

  if (titleEl && title) {
    titleEl.textContent = title;
  }

  const saved = readState(id);
  let visible = saved.visible !== false;
  let collapsed = Boolean(saved.collapsed);
  let position =
    saved.x != null && saved.y != null ? { x: saved.x, y: saved.y } : null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  function isDesktop() {
    return desktopMedia.matches;
  }

  function clampPosition(x, y) {
    const rect = panelEl.getBoundingClientRect();
    const maxX = Math.max(0, window.innerWidth - rect.width);
    const maxY = Math.max(headerPx(), window.innerHeight - rect.height);
    return {
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(headerPx(), Math.min(y, maxY)),
    };
  }

  function isNearDock(pos) {
    return pos.x <= remPx() + DOCK_THRESHOLD;
  }

  function getCurrentPosition() {
    const rect = panelEl.getBoundingClientRect();
    return { x: rect.left, y: rect.top };
  }

  function applyFloatingPosition(x, y) {
    const clamped = clampPosition(x, y);
    panelEl.style.left = `${clamped.x}px`;
    panelEl.style.top = `${clamped.y}px`;
    return clamped;
  }

  function setFloating(floating) {
    panelEl.classList.toggle("is-floating", floating);
    if (!floating) {
      panelEl.style.left = "";
      panelEl.style.top = "";
    }
  }

  function isFloating() {
    return panelEl.classList.contains("is-floating");
  }

  function isDockedOpen() {
    if (!isDesktop() || !visible || collapsed) return false;
    if (!isFloating()) return true;
    return isNearDock(getCurrentPosition());
  }

  function updateDockedClass() {
    if (!isDesktop()) {
      panelEl.classList.remove("is-docked");
      return;
    }

    panelEl.classList.toggle("is-docked", isDockedOpen() && !isFloating());
  }

  function syncVisibilityUi() {
    panelEl.classList.toggle("is-dismissed", !visible);

    if (mobileToggle && !visible) {
      mobileToggle.checked = false;
    }
  }

  function syncCollapseUi() {
    if (!isDesktop()) {
      panelEl.classList.remove("is-collapsed");
      return;
    }

    panelEl.classList.toggle("is-collapsed", collapsed);
    if (!collapseBtn) return;
    collapseBtn.setAttribute("aria-expanded", String(!collapsed));
    collapseBtn.setAttribute(
      "aria-label",
      collapsed ? "Expand panel" : "Collapse panel",
    );
  }

  function syncMobileToggleA11y() {
    if (isDesktop() || !mobileToggle) return;
    const toggleLabel = hostEl?.querySelector(".panel-toggle");
    if (!toggleLabel) return;
    toggleLabel.setAttribute("aria-expanded", String(mobileToggle.checked));
    toggleLabel.setAttribute("aria-controls", panelEl.id);
  }

  function persist() {
    const state = { visible, collapsed };
    if (isFloating()) {
      const pos = getCurrentPosition();
      state.x = pos.x;
      state.y = pos.y;
    }
    writeState(id, state);
  }

  function notifyChange() {
    updateDockedClass();
    registry?.updateLayout();
  }

  function setVisible(nextVisible, { expandMobile = false } = {}) {
    visible = nextVisible;
    syncVisibilityUi();

    if (visible && expandMobile && mobileToggle && !isDesktop()) {
      mobileToggle.checked = true;
    }

    syncMobileToggleA11y();

    if (!visible && isDesktop()) {
      setFloating(false);
      position = null;
    }

    persist();
    notifyChange();
  }

  function restoreDesktopLayout() {
    syncVisibilityUi();
    syncCollapseUi();

    if (!visible) {
      notifyChange();
      return;
    }

    if (position) {
      setFloating(true);
      position = applyFloatingPosition(position.x, position.y);
    } else {
      setFloating(false);
    }

    notifyChange();
  }

  function endDrag(pointerId) {
    if (!isDragging) return;
    isDragging = false;
    panelEl.classList.remove("is-dragging");

    if (dragHandle?.hasPointerCapture(pointerId)) {
      dragHandle.releasePointerCapture(pointerId);
    }

    if (position && isNearDock(position)) {
      setFloating(false);
      position = null;
    } else if (isFloating()) {
      position = getCurrentPosition();
    }

    persist();
    notifyChange();
  }

  const controller = {
    id,
    getPanelEl: () => panelEl,
    isVisible: () => visible,
    isCollapsed: () => collapsed,
    isFloating,
    isDockedOpen,
    setVisible,
  };

  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      if (!isDesktop()) return;
      collapsed = !collapsed;
      syncCollapseUi();
      persist();
      notifyChange();
    });
  }

  if (dismissBtn) {
    dismissBtn.addEventListener("click", () => {
      setVisible(false);
    });
  }

  if (dragHandle) {
    dragHandle.addEventListener("pointerdown", (event) => {
      if (!isDesktop() || !visible) return;
      event.preventDefault();

      if (!isFloating()) {
        const rect = panelEl.getBoundingClientRect();
        setFloating(true);
        position = applyFloatingPosition(rect.left, rect.top);
      }

      isDragging = true;
      panelEl.classList.add("is-dragging");
      const rect = panelEl.getBoundingClientRect();
      dragOffset = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      dragHandle.setPointerCapture(event.pointerId);
      notifyChange();
    });

    dragHandle.addEventListener("pointermove", (event) => {
      if (!isDragging) return;
      position = applyFloatingPosition(
        event.clientX - dragOffset.x,
        event.clientY - dragOffset.y,
      );
      notifyChange();
    });

    dragHandle.addEventListener("pointerup", (event) => {
      endDrag(event.pointerId);
    });

    dragHandle.addEventListener("pointercancel", (event) => {
      endDrag(event.pointerId);
    });
  }

  if (mobileToggle) {
    mobileToggle.addEventListener("change", () => {
      if (isDesktop()) return;
      if (mobileToggle.checked && !visible) {
        setVisible(true);
      }
      syncMobileToggleA11y();
    });
  }

  window.addEventListener("resize", () => {
    if (!isDesktop() || !isFloating()) return;
    const pos = getCurrentPosition();
    position = applyFloatingPosition(pos.x, pos.y);
    notifyChange();
  });

  desktopMedia.addEventListener("change", () => {
    if (!isDesktop()) {
      setFloating(false);
      panelEl.classList.remove("is-collapsed", "is-dragging", "is-docked");
      syncVisibilityUi();
      syncMobileToggleA11y();
      registry?.updateLayout();
      return;
    }
    restoreDesktopLayout();
  });

  if (registry && hostEl) {
    registry.register(id, {
      hostEl,
      panelEl,
      order: id === "filters" ? 0 : 1,
      controller,
    });
  }

  syncCollapseUi();

  if (isDesktop()) {
    restoreDesktopLayout();
  } else {
    syncVisibilityUi();
    syncMobileToggleA11y();
    registry?.updateLayout();
  }

  return controller;
}
