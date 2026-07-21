/*
 * The loading sequence: a thin progress bar that tracks real readiness
 * signals (fonts, the WebGL field, window load), then hands off to the
 * hero rise choreography by stamping `is-loaded` on <html>.
 *
 * Hard cap of 2.8s so a slow or failed signal can never trap the reader.
 * Reduced motion resolves immediately.
 */

export const initLoader = (reduceMotion: boolean): void => {
  const loader = document.getElementById("loader");
  const bar = loader?.querySelector<HTMLElement>(".loader-bar b") ?? null;
  const root = document.documentElement;

  const finish = () => {
    if (root.classList.contains("is-loaded")) return;
    if (bar) bar.style.transform = "scaleX(1)";
    root.classList.add("is-loaded");
    window.setTimeout(() => loader?.remove(), 700);
  };

  if (!loader || reduceMotion) {
    root.classList.add("is-loaded");
    loader?.remove();
    return;
  }

  const startedAt = performance.now();
  const signals = { fonts: false, field: false, load: false };

  const progressTarget = () => {
    const signalShare =
      (signals.fonts ? 0.3 : 0) + (signals.field ? 0.4 : 0) + (signals.load ? 0.3 : 0);
    const timeShare = Math.min(1, (performance.now() - startedAt) / 2400);
    return Math.max(signalShare, timeShare * 0.9);
  };

  let raf = 0;
  let shown = 0;
  const render = () => {
    shown += (progressTarget() - shown) * 0.12;
    if (bar) bar.style.transform = `scaleX(${Math.min(1, shown).toFixed(4)})`;
    if (shown > 0.995 || performance.now() - startedAt > 2800) {
      cancelAnimationFrame(raf);
      finish();
      return;
    }
    raf = requestAnimationFrame(render);
  };
  raf = requestAnimationFrame(render);

  document.fonts?.ready.then(() => {
    signals.fonts = true;
  });
  const fieldObserver = new MutationObserver(() => {
    if (root.dataset.field) {
      signals.field = true;
      fieldObserver.disconnect();
    }
  });
  if (root.dataset.field) signals.field = true;
  else fieldObserver.observe(root, { attributes: true, attributeFilter: ["data-field"] });
  if (document.readyState === "complete") signals.load = true;
  else window.addEventListener("load", () => {
    signals.load = true;
  });
};
