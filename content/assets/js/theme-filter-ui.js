import { THEMES, getThemeCounts } from "./color-theme.js";

export function initThemeFilterUI({ select, onThemeChange }) {
  if (!select) {
    return { update() {} };
  }

  const counts = getThemeCounts();

  select.innerHTML = "";

  const allOption = document.createElement("option");
  allOption.value = "";
  allOption.textContent = "All themes";
  select.appendChild(allOption);

  THEMES.forEach((theme) => {
    const count = counts[theme.id] ?? 0;
    const option = document.createElement("option");
    option.value = theme.id;
    option.textContent = `${theme.label} (${count})`;
    option.disabled = count === 0;
    select.appendChild(option);
  });

  select.addEventListener("change", (event) => {
    onThemeChange(event.target.value || null);
  });

  function update(state) {
    const value = state.theme ?? "";
    if (select.value !== value) {
      select.value = value;
    }
  }

  return { update };
}
