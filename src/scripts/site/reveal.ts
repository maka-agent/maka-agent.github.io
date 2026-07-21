/*
 * Entrance choreography: reveal-on-intersect, the mono character scramble,
 * and a light scroll parallax on proof frames. All of it disappears under
 * prefers-reduced-motion.
 */

const GLYPHS = "MAKA/#><+=·0123456789";

export const scramble = (element: HTMLElement): void => {
  const original = element.dataset.text ?? element.textContent ?? "";
  element.dataset.text = original;
  let frame = 0;
  const total = Math.max(10, original.length * 2);
  const run = () => {
    frame += 1;
    const revealCount = Math.floor((frame / total) * original.length);
    element.textContent = original
      .split("")
      .map((char, index) => {
        if (char.trim() === "" || index < revealCount) return char;
        return GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      })
      .join("");
    if (frame < total) requestAnimationFrame(run);
    else element.textContent = original;
  };
  run();
};

const REVEAL_SELECTOR =
  ".entry, .band-head, .runtime-lede, .ledger li, .surface-list li, .cta-link, .cta-note";

export const initReveal = (reduceMotion: boolean): void => {
  const revealables = document.querySelectorAll<HTMLElement>(REVEAL_SELECTOR);

  if (reduceMotion) {
    revealables.forEach((element) => element.classList.add("is-in"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const item of entries) {
        if (!item.isIntersecting) continue;
        const element = item.target as HTMLElement;
        element.classList.add("is-in");
        if (element.matches(".band-head")) {
          const title = element.querySelector<HTMLElement>("[data-scramble]");
          if (title) scramble(title);
        }
        if (element.matches(".cta-link")) {
          element.querySelectorAll<HTMLElement>("[data-scramble-text]").forEach(scramble);
        }
        observer.unobserve(element);
      }
    },
    { threshold: 0.2 },
  );
  revealables.forEach((element) => observer.observe(element));

  /* Nav labels scramble once on first hover. */
  document.querySelectorAll<HTMLElement>(".shell-nav a").forEach((link) => {
    const label = link.querySelector<HTMLElement>("[data-scramble-label]");
    if (!label) return;
    link.addEventListener("mouseenter", () => scramble(label), { once: true });
  });

  /* Proof frames drift a few pixels against the scroll. */
  const frames = Array.from(document.querySelectorAll<HTMLElement>(".frame"));
  if (frames.length > 0) {
    let queued = false;
    const applyParallax = () => {
      queued = false;
      const viewportHeight = window.innerHeight;
      for (const frameElement of frames) {
        const rect = frameElement.getBoundingClientRect();
        if (rect.bottom < 0 || rect.top > viewportHeight) continue;
        const centered = (rect.top + rect.height * 0.5 - viewportHeight * 0.5) / viewportHeight;
        frameElement.style.transform = `translate3d(0, ${(centered * -22).toFixed(2)}px, 0)`;
      }
    };
    window.addEventListener(
      "scroll",
      () => {
        if (!queued) {
          queued = true;
          requestAnimationFrame(applyParallax);
        }
      },
      { passive: true },
    );
    applyParallax();
  }
};
