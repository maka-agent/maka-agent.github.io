/*
 * The glossy arrow that trails the pointer — a DOM element with damped
 * follow and velocity tilt, so it stays cheap and never blocks a click.
 * Touch devices and reduced motion never see it.
 */

export const initCursor = (reduceMotion: boolean): void => {
  const cursor = document.getElementById("cursor");
  if (!cursor) return;

  const finePointer = window.matchMedia("(pointer: fine)").matches;
  if (reduceMotion || !finePointer) {
    cursor.remove();
    return;
  }

  let targetX = -100;
  let targetY = -100;
  let x = -100;
  let y = -100;
  let velocityX = 0;
  let velocityY = 0;
  let engaged = false;
  let lastAt = performance.now();
  let grow = 1;
  const statement = document.getElementById("statement");

  window.addEventListener(
    "pointermove",
    (event) => {
      if (event.pointerType === "touch") return;
      targetX = event.clientX;
      targetY = event.clientY;
      if (!engaged) {
        engaged = true;
        x = targetX;
        y = targetY;
        cursor.classList.add("is-active");
      }
    },
    { passive: true },
  );

  const damp = (current: number, target: number, lambda: number, delta: number) =>
    current + (target - current) * (1 - Math.exp(-lambda * delta));

  const frame = (now: number) => {
    const delta = Math.min(1 / 30, Math.max(1 / 240, (now - lastAt) / 1000));
    lastAt = now;

    const nextX = damp(x, targetX, 11, delta);
    const nextY = damp(y, targetY, 11, delta);
    velocityX = damp(velocityX, (nextX - x) / delta, 9, delta);
    velocityY = damp(velocityY, (nextY - y) / delta, 9, delta);
    x = nextX;
    y = nextY;

    const speed = Math.min(1, Math.hypot(velocityX, velocityY) / 2200);
    const angle = speed > 0.02 ? Math.atan2(velocityY, velocityX) * (180 / Math.PI) : 0;
    const stretch = 1 + speed * 0.24;

    /* The arrow swells while the statement section holds the viewport,
       like the reference's outsize cursor over its manifesto. */
    let growTarget = 1;
    if (statement) {
      const rect = statement.getBoundingClientRect();
      const middle = window.innerHeight * 0.5;
      if (rect.top < middle && rect.bottom > middle) growTarget = 2.6;
    }
    grow = damp(grow, growTarget, 6, delta);

    cursor.style.transform =
      `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      + ` rotate(${(angle * 0.08).toFixed(2)}deg)`
      + ` scale(${(stretch * grow).toFixed(3)}, ${((2 - stretch) * grow).toFixed(3)})`;

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
};
