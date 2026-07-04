import { PRESETS } from "./presets.js";
import { getState } from "./app-state.js";

export function initFilterUI({
  filterGroup,
  sortOptions,
  onFilterChange,
  onSortChange,
}) {
  if (!filterGroup) {
    return { update() {} };
  }

  let sortListenerBound = false;

  filterGroup.addEventListener("change", (event) => {
    const input = event.target;
    if (input.name !== "palette-filter" || !input.checked) return;
    onFilterChange(input.value);
  });

  function render(state) {
    filterGroup.innerHTML = "";

    const heading = document.createElement("p");
    heading.className = "filter-group-heading";
    heading.textContent = "Filter by palette:";
    filterGroup.appendChild(heading);

    const options = [
      { value: "all", label: "All" },
      ...PRESETS.map((preset) => ({
        value: preset.id,
        label: `${preset.emoji} ${preset.label}`,
      })),
    ];

    if (state.userPalettes.length) {
      const divider = document.createElement("p");
      divider.className = "filter-group-divider";
      divider.textContent = "My palettes";
      filterGroup.appendChild(divider);

      state.userPalettes.forEach((palette) => {
        options.push({
          value: `user:${palette.id}`,
          label: `${palette.name} (${palette.colors.length})`,
        });
      });
    }

    if (state.sharedColors?.length) {
      options.push({
        value: "shared",
        label: `Shared selection (${state.sharedColors.length})`,
      });
    }

    options.forEach((option) => {
      const label = document.createElement("label");
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "palette-filter";
      input.value = option.value;
      input.checked = state.activeFilter === option.value;
      label.appendChild(input);
      label.appendChild(document.createTextNode(option.label));
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
