export function initHeaderLayout(headerEl) {
  if (!headerEl) {
    return { sync() {} };
  }

  const sync = () => {
    const height = headerEl.getBoundingClientRect().height;
    if (height > 0) {
      document.documentElement.style.setProperty(
        "--header-height",
        `${Math.ceil(height)}px`,
      );
    }
  };

  sync();

  if (typeof ResizeObserver !== "undefined") {
    const observer = new ResizeObserver(sync);
    observer.observe(headerEl);
  } else {
    window.addEventListener("resize", sync);
  }

  return { sync };
}
