/*
 * Real telemetry only: local clock with true UTC offset, live pointer
 * coordinates, scroll progress, current section, and the scroll-driven
 * statement fill. Nothing here is invented.
 */

export const initTelemetry = (reduceMotion: boolean): void => {
  const clock = document.getElementById("clock");
  const tz = document.getElementById("tz");
  const coords = document.getElementById("coords");
  const scrollPct = document.getElementById("scroll-pct");
  const sectionLabel = document.getElementById("section-label");
  const statement = document.getElementById("statement");
  const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));

  /* Clock. */
  const offsetMinutes = -new Date().getTimezoneOffset();
  const sign = offsetMinutes >= 0 ? "+" : "-";
  const offsetHours = Math.abs(offsetMinutes) / 60;
  if (tz) {
    tz.textContent = `GMT${sign}${Number.isInteger(offsetHours) ? offsetHours : offsetHours.toFixed(1)}`;
  }
  const formatTime = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const tick = () => {
    if (clock) clock.textContent = formatTime.format(new Date());
  };
  tick();
  window.setInterval(tick, 1000);

  /* Pointer coordinates. */
  const pad = (value: number) => String(Math.max(0, Math.round(value))).padStart(4, "0");
  window.addEventListener(
    "pointermove",
    (event) => {
      if (coords) coords.textContent = `${pad(event.clientX)} X ${pad(event.clientY)} Y`;
    },
    { passive: true },
  );

  /* Scroll progress, section label, statement fill. */
  let queued = false;
  const onScroll = () => {
    queued = false;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const progress = max > 0 ? window.scrollY / max : 0;
    if (scrollPct) {
      scrollPct.textContent = `${String(Math.round(progress * 100)).padStart(3, "0")}%`;
    }

    const middle = window.scrollY + window.innerHeight * 0.5;
    let current = sections[0];
    for (const section of sections) {
      if (section.offsetTop <= middle) current = section;
    }
    const label = current?.dataset.section ?? "00 INTRO";
    if (sectionLabel && sectionLabel.textContent !== label) sectionLabel.textContent = label;

    if (statement && !reduceMotion) {
      const rect = statement.getBoundingClientRect();
      const fill = 1 - Math.min(1, Math.max(0, (rect.top + rect.height * 0.6) / window.innerHeight));
      statement.style.setProperty("--fill", `${Math.min(100, fill * 165)}%`);
    }
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!queued) {
        queued = true;
        requestAnimationFrame(onScroll);
      }
    },
    { passive: true },
  );
  if (reduceMotion) statement?.style.setProperty("--fill", "100%");
  onScroll();
};
