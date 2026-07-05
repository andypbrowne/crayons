const DESKTOP_QUERY = "(min-width: 1000px)";

export function initPanelRegistry() {
  const panels = new Map();
  const listeners = new Set();
  const desktopMedia = window.matchMedia(DESKTOP_QUERY);

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
