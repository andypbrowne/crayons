let dialogEl = null;

function ensureDialog() {
  if (dialogEl) return dialogEl;

  dialogEl = document.createElement("dialog");
  dialogEl.className = "app-dialog";
  dialogEl.innerHTML = `
    <button type="button" class="dialog-close-btn app-dialog-dismiss" aria-label="Close">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
        <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    </button>
    <form method="dialog" class="app-dialog-form">
      <p class="app-dialog-message"></p>
      <label class="app-dialog-field">
        <span class="visually-hidden app-dialog-label"></span>
        <input type="text" class="app-dialog-input" autocomplete="off" maxlength="64" />
      </label>
      <div class="app-dialog-actions">
        <button type="button" class="app-dialog-btn app-dialog-cancel">Cancel</button>
        <button type="submit" class="app-dialog-btn app-dialog-submit">OK</button>
      </div>
    </form>
  `;
  document.body.appendChild(dialogEl);

  dialogEl.querySelector(".app-dialog-dismiss").addEventListener("click", () => {
    dialogEl.close("cancel");
  });

  dialogEl.addEventListener("click", (event) => {
    if (event.target === dialogEl) {
      dialogEl.close("cancel");
    }
  });

  return dialogEl;
}

function openDialog({
  message,
  defaultValue = "",
  submitLabel = "OK",
  cancelLabel = "Cancel",
  mode = "prompt",
  destructive = false,
}) {
  return new Promise((resolve) => {
    const dialog = ensureDialog();
    const form = dialog.querySelector(".app-dialog-form");
    const messageEl = dialog.querySelector(".app-dialog-message");
    const field = dialog.querySelector(".app-dialog-field");
    const input = dialog.querySelector(".app-dialog-input");
    const label = dialog.querySelector(".app-dialog-label");
    const cancelBtn = dialog.querySelector(".app-dialog-cancel");
    const submitBtn = dialog.querySelector(".app-dialog-submit");

    messageEl.textContent = message;
    label.textContent = message;
    input.value = defaultValue;
    field.hidden = mode === "confirm";
    submitBtn.textContent = submitLabel;
    cancelBtn.textContent = cancelLabel;
    submitBtn.classList.toggle("is-destructive", destructive);
    dialog.classList.toggle("is-confirm", mode === "confirm");

    const cleanup = () => {
      dialog.removeEventListener("close", onClose);
      cancelBtn.removeEventListener("click", onCancel);
      form.removeEventListener("submit", onSubmit);
    };

    const onCancel = (event) => {
      event.preventDefault();
      dialog.close("cancel");
    };

    const onSubmit = (event) => {
      event.preventDefault();
      dialog.close("submit");
    };

    const onClose = () => {
      cleanup();
      if (mode === "confirm") {
        resolve(dialog.returnValue === "submit");
        return;
      }
      resolve(dialog.returnValue === "submit" ? input.value : null);
    };

    cancelBtn.addEventListener("click", onCancel);
    form.addEventListener("submit", onSubmit);
    dialog.addEventListener("close", onClose, { once: true });

    dialog.showModal();

    if (mode === "prompt") {
      input.focus();
      input.select();
    } else {
      submitBtn.focus();
    }
  });
}

export function showPrompt({
  message,
  defaultValue = "",
  submitLabel = "OK",
  cancelLabel = "Cancel",
} = {}) {
  return openDialog({
    message,
    defaultValue,
    submitLabel,
    cancelLabel,
    mode: "prompt",
  });
}

export function showConfirm({
  message,
  confirmLabel = "OK",
  cancelLabel = "Cancel",
  destructive = false,
} = {}) {
  return openDialog({
    message,
    submitLabel: confirmLabel,
    cancelLabel,
    mode: "confirm",
    destructive,
  });
}
