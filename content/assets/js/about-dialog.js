document.addEventListener("DOMContentLoaded", () => {
  const openButtons = document.querySelectorAll(".nav-about-btn");
  const dialog = document.getElementById("about-dialog");
  const closeBtn = dialog?.querySelector(".about-dialog-close");

  if (!openButtons.length || !dialog || !closeBtn) return;

  openButtons.forEach((openBtn) => {
    openBtn.addEventListener("click", () => {
      dialog.showModal();
    });
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
