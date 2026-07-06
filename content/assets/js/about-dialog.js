document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("about-open");
  const dialog = document.getElementById("about-dialog");
  const closeBtn = dialog?.querySelector(".about-dialog-close");

  if (!openBtn || !dialog || !closeBtn) return;

  openBtn.addEventListener("click", () => {
    dialog.showModal();
  });

  closeBtn.addEventListener("click", () => {
    dialog.close();
  });

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });
});
