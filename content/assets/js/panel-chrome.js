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

export function initPanelChrome(panelEl, { id, title } = {}) {
  if (!panelEl || !id) return;

  const dragHandle = panelEl.querySelector(".panel-drag-handle");
  const collapseBtn = panelEl.querySelector(".panel-collapse-btn");
  const titleEl = panelEl.querySelector(".panel-title");
  const desktopMedia = window.matchMedia(DESKTOP_QUERY);

  if (titleEl && title) {
    titleEl.textContent = title;
  }

  const saved = readState(id);
  let collapsed = Boolean(saved.collapsed);
  let position =
    saved.x != null && saved.y != null ? { x: saved.x, y: saved.y } : null;
  let isDragging = false;
  let dragOffset = { x: 0, y: 0 };

  function isDesktop() {
    return desktopMedia.matches;
  }

  function defaultDock() {
    return { x: remPx(), y: headerPx() };
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
    const dock = defaultDock();
    return (
      Math.abs(pos.x - dock.x) <= DOCK_THRESHOLD &&
      Math.abs(pos.y - dock.y) <= DOCK_THRESHOLD
    );
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

  function updateDockedState() {
    if (!isDesktop()) {
      document.body.classList.remove("has-panel-docked-open");
      panelEl.classList.remove("is-docked");
      return;
    }

    const floating = panelEl.classList.contains("is-floating");
    let dockedOpen = false;

    if (!collapsed) {
      if (!floating) {
        dockedOpen = true;
      } else {
        dockedOpen = isNearDock(getCurrentPosition());
      }
    }

    panelEl.classList.toggle("is-docked", dockedOpen && !floating);
    document.body.classList.toggle("has-panel-docked-open", dockedOpen);
  }

  function syncCollapseUi() {
    panelEl.classList.toggle("is-collapsed", collapsed);
    if (!collapseBtn) return;
    collapseBtn.setAttribute("aria-expanded", String(!collapsed));
    collapseBtn.setAttribute(
      "aria-label",
      collapsed ? "Expand panel" : "Collapse panel",
    );
  }

  function persist() {
    const state = { collapsed };
    if (panelEl.classList.contains("is-floating")) {
      const pos = getCurrentPosition();
      state.x = pos.x;
      state.y = pos.y;
    }
    writeState(id, state);
  }

  function restoreDesktopLayout() {
    syncCollapseUi();

    if (position) {
      setFloating(true);
      position = applyFloatingPosition(position.x, position.y);
    } else {
      setFloating(false);
    }

    updateDockedState();
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
    } else if (panelEl.classList.contains("is-floating")) {
      position = getCurrentPosition();
    }

    updateDockedState();
    persist();
  }

  if (collapseBtn) {
    collapseBtn.addEventListener("click", () => {
      if (!isDesktop()) return;
      collapsed = !collapsed;
      syncCollapseUi();
      updateDockedState();
      persist();
    });
  }

  if (dragHandle) {
    dragHandle.addEventListener("pointerdown", (event) => {
      if (!isDesktop()) return;
      event.preventDefault();

      if (!panelEl.classList.contains("is-floating")) {
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
      updateDockedState();
    });

    dragHandle.addEventListener("pointermove", (event) => {
      if (!isDragging) return;
      position = applyFloatingPosition(
        event.clientX - dragOffset.x,
        event.clientY - dragOffset.y,
      );
      updateDockedState();
    });

    dragHandle.addEventListener("pointerup", (event) => {
      endDrag(event.pointerId);
    });

    dragHandle.addEventListener("pointercancel", (event) => {
      endDrag(event.pointerId);
    });
  }

  window.addEventListener("resize", () => {
    if (!isDesktop() || !panelEl.classList.contains("is-floating")) return;
    const pos = getCurrentPosition();
    position = applyFloatingPosition(pos.x, pos.y);
    updateDockedState();
  });

  desktopMedia.addEventListener("change", () => {
    if (!isDesktop()) {
      setFloating(false);
      panelEl.classList.remove("is-collapsed", "is-dragging", "is-docked");
      document.body.classList.remove("has-panel-docked-open");
      return;
    }
    restoreDesktopLayout();
  });

  if (isDesktop()) {
    restoreDesktopLayout();
  }
}
