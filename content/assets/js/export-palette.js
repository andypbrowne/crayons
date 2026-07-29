import { getState, getActiveColors } from "./app-state.js";
import { getPaletteLabel } from "./palette-label.js";
import { EXPORT_FORMATS, exportPalette } from "./export-formats.js";
import { showToast } from "./toast.js";

const DEFAULT_FORMAT = "json";

export function initExportPalette({ button, dialog, colorNameMap } = {}) {
  if (!dialog) {
    return { open() {} };
  }

  const descriptionEl = dialog.querySelector("#export-dialog-description");
  const swatchesEl = dialog.querySelector("#export-dialog-swatches");
  const optionsEl = dialog.querySelector("#export-format-options");
  const previewEl = dialog.querySelector("#export-dialog-preview");
  const downloadBtn = dialog.querySelector(".export-dialog-download");
  const cancelBtn = dialog.querySelector(".export-dialog-cancel");
  const closeBtn = dialog.querySelector(".export-dialog-close");

  let snapshot = null;
  let selectedFormat = DEFAULT_FORMAT;

  EXPORT_FORMATS.forEach((format, index) => {
    const id = `export-format-${format.id}`;
    const option = document.createElement("label");
    option.className = "export-format-option";
    option.htmlFor = id;
    option.innerHTML = `
      <input
        type="radio"
        name="export-format"
        id="${id}"
        value="${format.id}"
        ${index === 0 ? "checked" : ""}
      />
      <span class="export-format-option-text">
        <span class="export-format-option-label">${format.label}</span>
        <span class="export-format-option-hint">${format.hint}</span>
      </span>
    `;
    optionsEl?.appendChild(option);
  });

  optionsEl?.addEventListener("change", (event) => {
    const input = event.target;
    if (input.name !== "export-format" || !input.checked) return;
    selectedFormat = input.value;
    updatePreview();
  });

  function buildSnapshot(state) {
    const colors = getActiveColors(state);
    const name = getPaletteLabel(state);
    if (!colors?.length || !name) return null;
    return { name, colors: [...colors] };
  }

  function renderSwatches(colors) {
    if (!swatchesEl) return;
    swatchesEl.innerHTML = "";
    colors.forEach((hex) => {
      const swatch = document.createElement("span");
      swatch.className = "export-dialog-swatch";
      swatch.style.backgroundColor = hex;
      swatchesEl.appendChild(swatch);
    });
  }

  function updateSummary() {
    if (!snapshot || !descriptionEl) return;
    const count = snapshot.colors.length;
    descriptionEl.textContent = `Exporting ${count} color${count === 1 ? "" : "s"} from ${snapshot.name}. Family and theme filters are not included.`;
    renderSwatches(snapshot.colors);
  }

  function updatePreview() {
    if (!previewEl || !snapshot) return;
    try {
      const { preview } = exportPalette(selectedFormat, {
        name: snapshot.name,
        colors: snapshot.colors,
        colorNameMap,
      });
      previewEl.textContent = preview;
    } catch {
      previewEl.textContent = "";
    }
  }

  function closeDialog() {
    if (!dialog.open) return;
    dialog.close();
  }

  function download() {
    if (!snapshot) return;
    try {
      const { blob, filename } = exportPalette(selectedFormat, {
        name: snapshot.name,
        colors: snapshot.colors,
        colorNameMap,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.rel = "noopener";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      showToast(`Downloaded ${filename}`);
      closeDialog();
    } catch (error) {
      showToast(error.message || "Export failed.");
    }
  }

  function openWithSnapshot(nextSnapshot) {
    if (!nextSnapshot?.colors?.length || !nextSnapshot.name) {
      showToast("No palette to export.");
      return;
    }

    snapshot = {
      name: nextSnapshot.name,
      colors: [...nextSnapshot.colors],
    };

    selectedFormat = DEFAULT_FORMAT;
    const defaultInput = optionsEl?.querySelector(`input[value="${DEFAULT_FORMAT}"]`);
    if (defaultInput) {
      defaultInput.checked = true;
    }

    updateSummary();
    updatePreview();
    dialog.showModal();
    downloadBtn?.focus();
  }

  function open() {
    openWithSnapshot(buildSnapshot(getState()));
  }

  function openWithPalette(palette) {
    if (!palette?.colors?.length) {
      showToast("This palette has no colors to export.");
      return;
    }
    openWithSnapshot({ name: palette.name, colors: palette.colors });
  }

  button?.addEventListener("click", open);
  downloadBtn?.addEventListener("click", download);
  cancelBtn?.addEventListener("click", closeDialog);
  closeBtn?.addEventListener("click", closeDialog);

  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      closeDialog();
    }
  });

  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeDialog();
  });

  return { open, openWithPalette };
}
