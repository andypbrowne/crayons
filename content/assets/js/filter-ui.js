import { PRESETS } from "./presets.js";
import { getState } from "./app-state.js";

const COLLAPSED_PRESET_COUNT = 3;

export function initFilterUI({
  filterGroup,
  toggleButton,
  sortOptions,
  onFilterChange,
  onSortChange,
}) {
  if (!filterGroup) {
    return { update() {} };
  }

  let collapsed = false;
  let sortListenerBound = false;

  filterGroup.addEventListener("change", (event) => {
    const input = event.target;
    if (input.name !== "palette-filter" || !input.checked) return;
    onFilterChange(input.value);
  });

  if (toggleButton) {
    toggleButton.addEventListener("click", () => {
      collapsed = !collapsed;
      toggleButton.textContent = collapsed ? "Show more" : "Show less";
      toggleButton.setAttribute("aria-expanded", String(!collapsed));
      render(getState());
    });
  }

  function buildOptions(state) {
    const options = [
      { value: "all", label: "All colors", alwaysVisible: true },
      ...PRESETS.map((preset, index) => ({
        value: preset.id,
        label: `${preset.emoji} ${preset.label} (${preset.colors.length})`,
        alwaysVisible: index < COLLAPSED_PRESET_COUNT,
      })),
    ];

    if (state.sharedColors?.length) {
      options.push({
        value: "shared",
        label: `Shared selection (${state.sharedColors.length})`,
        alwaysVisible: true,
      });
    }

    return options;
  }

  function render(state) {
    filterGroup.innerHTML = "";
    const activeFilter = state.sharedColors?.length ? "shared" : state.activeFilter;

    buildOptions(state).forEach((option) => {
      const hidden = collapsed && !option.alwaysVisible;
      const label = document.createElement("label");
      label.className = "starter-palette-option";
      if (hidden) label.hidden = true;

      const input = document.createElement("input");
      input.type = "radio";
      input.name = "palette-filter";
      input.value = option.value;
      input.checked = activeFilter === option.value;

      const text = document.createElement("span");
      text.className = "starter-palette-label";
      text.textContent = option.label;
      if (input.checked) {
        text.classList.add("is-active");
      }

      label.appendChild(input);
      label.appendChild(text);
      filterGroup.appendChild(label);
    });

    if (sortOptions && sortOptions.value !== state.sort) {
      sortOptions.value = state.sort;
    }
  }

  render(getState());

  if (sortOptions && !sortListenerBound) {
    sortOptions.addEventListener("change", (event) => {
      onSortChange(event.target.value);
    });
    sortListenerBound = true;
  }

  return {
    update(state) {
      render(state);
    },
  };
}
