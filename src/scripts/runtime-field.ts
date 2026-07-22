{
const canvas = document.querySelector<HTMLCanvasElement>("#runtime-field");

if (canvas) {
  const context = canvas.getContext("2d", { alpha: true });
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const colors = [
    "#28e4ff", "#368fff", "#a8f5ff", "#2175ff", "#5bb8ff", "#78eaff",
    "#318bff", "#a8f5ff", "#2071ee", "#48d5ff", "#ffbd48", "#54ed9a",
  ];
  type Streak = {
    angle: number;
    progress: number;
    speed: number;
    length: number;
    color: string;
    width: number;
    lane: number;
    dotted: boolean;
  };
  let width = 1;
  let height = 1;
  let ratio = 1;
  let active = document.querySelector<HTMLElement>(".stage")?.dataset.view === "runtime";
  let frame = 0;
  let lastFrame = performance.now();
  let pointerX = 0;
  let pointerY = 0;
  let streaks: Streak[] = [];

  const makeStreak = (index: number): Streak => ({
    angle: (index * 2.3999632297 + Math.sin(index * 1.71) * 0.15) % (Math.PI * 2),
    progress: ((index * 0.61803398875) % 1 + 0.04) % 1,
    speed: 0.055 + (index % 9) * 0.009,
    length: 0.025 + (index % 7) * 0.006,
    color: colors[index % colors.length],
    width: index % 11 === 0 ? 2.05 : index % 4 === 0 ? 1.42 : 0.92,
    lane: 0.72 + (index % 13) * 0.028,
    dotted: index % 3 === 0 || index % 11 === 0,
  });

  const rebuild = () => {
    const count = width < 720 ? 280 : width < 1100 ? 540 : 920;
    streaks = Array.from({ length: count }, (_, index) => makeStreak(index));
  };

  const resize = () => {
    width = Math.max(1, canvas.clientWidth);
    height = Math.max(1, canvas.clientHeight);
    ratio = Math.min(window.devicePixelRatio || 1, width < 720 ? 1.25 : 1.6);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context?.setTransform(ratio, 0, 0, ratio, 0, 0);
    rebuild();
    render(performance.now(), true);
  };

  const project = (streak: Streak, progress: number) => {
    const eased = Math.pow(Math.max(0, progress), 1.72);
    const maxRadius = Math.hypot(width, height) * 0.76 * streak.lane;
    const centerX = width * 0.55 + pointerX * width * 0.022;
    const centerY = height * 0.43 - pointerY * height * 0.018;
    const horizontal = Math.cos(streak.angle) * maxRadius * eased;
    const vertical = Math.sin(streak.angle) * maxRadius * eased * 0.76;
    const bend = (pointerX * Math.sin(streak.angle) - pointerY * Math.cos(streak.angle)) * eased * 20;
    return {
      x: centerX + horizontal - Math.sin(streak.angle) * bend,
      y: centerY + vertical + Math.cos(streak.angle) * bend,
    };
  };

  const render = (now: number, still = false) => {
    if (!context) return;
    const delta = Math.min(0.04, Math.max(0, (now - lastFrame) / 1000));
    lastFrame = now;
    context.clearRect(0, 0, width, height);
    context.save();
    context.globalCompositeOperation = "lighter";
    context.lineCap = "round";

    streaks.forEach((streak, index) => {
      if (!still && !reduceMotion.matches) {
        streak.progress += streak.speed * delta * (active ? 1 : 0.18);
        if (streak.progress > 1.04) streak.progress = 0.035 + (index % 8) * 0.004;
      }
      const head = project(streak, streak.progress);
      const tail = project(streak, Math.max(0, streak.progress - streak.length));
      const alpha = Math.min(1, 0.3 + Math.pow(streak.progress, 1.08) * 0.94);
      const gradient = context.createLinearGradient(tail.x, tail.y, head.x, head.y);
      gradient.addColorStop(0, "transparent");
      gradient.addColorStop(0.38, `${streak.color}55`);
      gradient.addColorStop(1, streak.color);
      context.strokeStyle = gradient;
      context.globalAlpha = alpha;
      context.lineWidth = streak.width * (0.62 + streak.progress * 1.42);
      context.setLineDash(streak.dotted ? [1.4 + (index % 4) * 0.45, 4 + (index % 6) * 1.3] : []);
      context.lineDashOffset = -streak.progress * 34;
      context.beginPath();
      context.moveTo(tail.x, tail.y);
      context.lineTo(head.x, head.y);
      context.stroke();

      if (index % 7 === 0) {
        context.fillStyle = streak.color;
        context.globalAlpha = alpha * 0.9;
        context.beginPath();
        context.arc(head.x, head.y, 0.8 + streak.progress * 1.35, 0, Math.PI * 2);
        context.fill();
      }
    });
    context.setLineDash([]);
    context.restore();
    context.globalAlpha = 1;

    if (!reduceMotion.matches) frame = requestAnimationFrame(render);
  };

  window.addEventListener("maka:pointer", ((event: CustomEvent<{ normalizedX: number; normalizedY: number }>) => {
    pointerX = event.detail.normalizedX;
    pointerY = event.detail.normalizedY;
    if (reduceMotion.matches) render(performance.now(), true);
  }) as EventListener);

  window.addEventListener("maka:viewchange", ((event: CustomEvent<{ view: string }>) => {
    active = event.detail.view === "runtime";
    canvas.dataset.active = String(active);
  }) as EventListener);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      return;
    }
    lastFrame = performance.now();
    if (!reduceMotion.matches && !frame) frame = requestAnimationFrame(render);
  });

  new ResizeObserver(resize).observe(canvas);
  resize();
  if (!reduceMotion.matches) frame = requestAnimationFrame(render);
}
}
