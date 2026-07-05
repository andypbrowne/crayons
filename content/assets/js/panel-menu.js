export function initPanelMenu({ registry, menuEl, triggerEl } = {}) {
  if (!registry || !menuEl) return;

  const items = menuEl.querySelectorAll("[data-panel-id]");

  function syncMenu() {
    items.forEach((item) => {
      const panelId = item.dataset.panelId;
      const controller = registry.getPanel(panelId);
      const checked = controller?.isVisible() ?? false;
      item.setAttribute("aria-checked", String(checked));
      item.classList.toggle("is-checked", checked);
    });
  }

  items.forEach((item) => {
    item.addEventListener("click", (event) => {
      event.preventDefault();
      const panelId = item.dataset.panelId;
      const controller = registry.getPanel(panelId);
      if (!controller) return;

      const nextVisible = !controller.isVisible();
      controller.setVisible(nextVisible, { expandMobile: nextVisible });
      syncMenu();
    });
  });

  registry.subscribe(syncMenu);
  syncMenu();
}
