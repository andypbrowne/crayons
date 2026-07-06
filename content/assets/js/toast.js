let toastElement = null;
let hideTimer = null;

function ensureToastElement() {
  if (toastElement) return toastElement;

  toastElement = document.createElement("div");
  toastElement.className = "app-toast";
  toastElement.setAttribute("role", "status");
  toastElement.setAttribute("aria-live", "polite");
  toastElement.hidden = true;
  document.body.appendChild(toastElement);
  return toastElement;
}

export function showToast(message, duration = 2400) {
  const toast = ensureToastElement();
  toast.textContent = message;
  toast.hidden = false;

  clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toast.hidden = true;
  }, duration);
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
