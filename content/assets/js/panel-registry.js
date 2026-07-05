const DESKTOP_QUERY = "(min-width: 1000px)";

function remPx() {
  return parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
}

export function initPanelRegistry() {
  const panels = new Map();
  const listeners = new Set();
  const desktopMedia = window.matchMedia(DESKTOP_QUERY);

  function isDesktop() {
    return desktopMedia.matches;
  }

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function register(id, { hostEl, panelEl, order = 0, controller }) {
    panels.set(id, { id, hostEl, panelEl, order, controller });
  }

  function getPanel(id) {
    return panels.get(id)?.controller ?? null;
  }

  function getAllPanels() {
    return [...panels.values()]
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.controller)
      .filter(Boolean);
  }

  function updateLayout() {
    const sorted = [...panels.values()].sort((a, b) => a.order - b.order);

    for (const entry of sorted) {
      const { hostEl, controller } = entry;
      if (!hostEl || !controller) continue;

      const visible = controller.isVisible();
      hostEl.classList.toggle("is-dismissed", !visible);
      hostEl.hidden = !visible;
      hostEl.setAttribute("aria-hidden", String(!visible));
    }

    if (!isDesktop()) {
      document.body.classList.remove("has-panel-docked-open");
      document.body.style.removeProperty("--panel-dock-width");
      notify();
      return;
    }

    let maxWidth = 0;
    let anyDockedOpen = false;

    for (const entry of sorted) {
      const { controller } = entry;
      if (!controller?.isVisible()) continue;

      if (controller.isDockedOpen()) {
        anyDockedOpen = true;
        maxWidth = Math.max(maxWidth, controller.getPanelEl().offsetWidth);
      }
    }

    document.body.classList.toggle("has-panel-docked-open", anyDockedOpen);
    if (anyDockedOpen) {
      document.body.style.setProperty(
        "--panel-dock-width",
        `${maxWidth + remPx() * 2}px`,
      );
    } else {
      document.body.style.removeProperty("--panel-dock-width");
    }

    notify();
  }

  function subscribe(listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  window.addEventListener("resize", updateLayout);

  desktopMedia.addEventListener("change", updateLayout);

  return {
    register,
    getPanel,
    getAllPanels,
    updateLayout,
    subscribe,
  };
}
