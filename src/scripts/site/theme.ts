/*
 * The THEME[A] toggle: a real light/dark theme, flipped from the nav
 * button or the A key, persisted in localStorage. The canvas watches
 * html[data-theme] and cross-fades its palettes; CSS tokens flip here.
 * An inline head script applies the stored theme before first paint.
 */

const STORAGE_KEY = "maka-theme";

export const initTheme = (): void => {
  const root = document.documentElement;
  const button = document.getElementById("theme-toggle");

  const apply = (theme: "light" | "dark") => {
    if (theme === "dark") root.dataset.theme = "dark";
    else delete root.dataset.theme;
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* Private mode: theme simply won't persist. */
    }
    button?.setAttribute("aria-pressed", String(theme === "dark"));
  };

  const toggle = () => {
    apply(root.dataset.theme === "dark" ? "light" : "dark");
  };

  button?.addEventListener("click", toggle);
  button?.setAttribute("aria-pressed", String(root.dataset.theme === "dark"));

  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    if (event.key.toLowerCase() === "a") toggle();
  });
};
