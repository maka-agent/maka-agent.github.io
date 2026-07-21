/*
 * In-page navigation: Lenis-smoothed anchor travel plus the real keyboard
 * commands mirrored by the [key] hints in the nav. Reduced motion keeps
 * native instant jumps and no scroll smoothing.
 */

import Lenis from "lenis";

export const initNavigation = (reduceMotion: boolean): void => {
  let lenis: Lenis | null = null;
  if (!reduceMotion) {
    lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => 1 - Math.pow(1 - t, 3.2),
      autoRaf: true,
    });
  }

  const scrollToTarget = (hash: string) => {
    const target = document.querySelector<HTMLElement>(hash);
    if (!target) return;
    if (lenis) lenis.scrollTo(target, { offset: 0 });
    else target.scrollIntoView({ behavior: "auto", block: "start" });
  };

  document.querySelectorAll<HTMLAnchorElement>("[data-nav]").forEach((link) => {
    link.addEventListener("click", (event) => {
      const hash = link.getAttribute("href") ?? "";
      if (!hash.startsWith("#")) return;
      event.preventDefault();
      history.replaceState(null, "", hash === "#top" ? location.pathname : hash);
      scrollToTarget(hash);
    });
  });

  /* Keyboard commands come straight from the nav data. */
  const keyTargets = new Map<string, { href: string; external: boolean }>();
  document.querySelectorAll<HTMLAnchorElement>(".shell-nav a[data-key]").forEach((link) => {
    const key = link.dataset.key?.toLowerCase();
    if (key) keyTargets.set(key, { href: link.href, external: !link.getAttribute("href")?.startsWith("#") });
  });

  window.addEventListener("keydown", (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
    const entry = keyTargets.get(event.key.toLowerCase());
    if (!entry) return;
    if (entry.external) window.open(entry.href, "_blank", "noreferrer");
    else scrollToTarget(new URL(entry.href).hash);
  });
};
