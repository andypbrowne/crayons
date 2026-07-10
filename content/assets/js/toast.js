let toastElement = null;
let messageElement = null;
let dismissButton = null;
let hideTimer = null;

function ensureToastElement() {
  if (toastElement) return toastElement;

  toastElement = document.createElement("div");
  toastElement.className = "app-toast";
  toastElement.setAttribute("role", "status");
  toastElement.setAttribute("aria-live", "polite");
  toastElement.hidden = true;

  messageElement = document.createElement("span");
  messageElement.className = "app-toast-message";

  dismissButton = document.createElement("button");
  dismissButton.type = "button";
  dismissButton.className = "app-toast-dismiss";
  dismissButton.setAttribute("aria-label", "Dismiss");
  dismissButton.hidden = true;
  dismissButton.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`;
  dismissButton.addEventListener("click", () => {
    hideToast();
  });

  toastElement.appendChild(messageElement);
  toastElement.appendChild(dismissButton);
  document.body.appendChild(toastElement);
  return toastElement;
}

export function hideToast() {
  const toast = ensureToastElement();
  clearTimeout(hideTimer);
  hideTimer = null;
  toast.hidden = true;
  toast.classList.remove("is-persistent");
  dismissButton.hidden = true;
}

/**
 * @param {string} message
 * @param {number | { duration?: number, persistent?: boolean }} [options]
 */
export function showToast(message, options = {}) {
  const toast = ensureToastElement();
  const config = typeof options === "number" ? { duration: options } : options;
  const persistent = Boolean(config.persistent);
  const duration = config.duration ?? 2400;

  clearTimeout(hideTimer);
  hideTimer = null;

  messageElement.textContent = message;
  toast.classList.toggle("is-persistent", persistent);
  dismissButton.hidden = !persistent;
  toast.hidden = false;

  if (!persistent) {
    hideTimer = setTimeout(() => {
      hideToast();
    }, duration);
  }
}

export async function copyText(text, successMessage = "Copied!") {
  try {
    await navigator.clipboard.writeText(text);
    showToast(successMessage);
    return true;
  } catch (error) {
    console.error("Failed to copy text:", error);
    showToast("Could not copy to clipboard.");
    return false;
  }
}
