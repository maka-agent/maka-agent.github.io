{
  const canvas = document.querySelector<HTMLCanvasElement>("#surface-field");

  if (canvas) {
    const context = canvas.getContext("2d", { alpha: true });
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = 1;
    let height = 1;
    let ratio = 1;
    let frame = 0;
    let active = document.querySelector<HTMLElement>(".stage")?.dataset.view === "surfaces";
    let pointerX = 0;
    let pointerY = 0;
    let lastFrame = performance.now();

    type Ray = {
      angle: number;
      radius: number;
      width: number;
      speed: number;
      phase: number;
      alpha: number;
    };

    let rays: Ray[] = [];

    const rebuild = () => {
      const count = width < 720 ? 54 : 128;
      rays = Array.from({ length: count }, (_, index) => ({
        angle: (index / count) * Math.PI * 2 + Math.sin(index * 1.73) * 0.12,
        radius: 0.23 + ((index * 0.61803398875) % 1) * 0.72,
        width: index % 13 === 0 ? 1.4 : index % 5 === 0 ? 0.9 : 0.55,
        speed: 0.08 + (index % 7) * 0.012,
        phase: (index * 0.38196601125) % 1,
        alpha: 0.12 + (index % 9) * 0.018,
      }));
    };

    const render = (now = performance.now(), still = false) => {
      if (!context) return;
      const delta = Math.min(0.04, Math.max(0, (now - lastFrame) / 1000));
      lastFrame = now;
      context.clearRect(0, 0, width, height);

      const centerX = width * 0.555 + pointerX * width * 0.012;
      const centerY = height * 0.68 - pointerY * height * 0.01;
      const maxRadius = Math.hypot(width, height) * 0.58;

      context.save();
      context.globalCompositeOperation = "multiply";
      context.lineCap = "round";
      rays.forEach((ray, index) => {
        if (!still && !reduceMotion.matches && active) ray.phase = (ray.phase + ray.speed * delta) % 1;
        const distance = maxRadius * ray.radius;
        const bend = Math.sin(ray.angle * 2.7 + pointerX * 0.8) * 18 * ray.radius;
        const endX = centerX + Math.cos(ray.angle) * distance - Math.sin(ray.angle) * bend;
        const endY = centerY + Math.sin(ray.angle) * distance * 0.56 + Math.cos(ray.angle) * bend * 0.42;
        const gradient = context.createLinearGradient(centerX, centerY, endX, endY);
        gradient.addColorStop(0, "rgba(45,125,235,0.02)");
        gradient.addColorStop(0.32, `rgba(49,137,245,${ray.alpha})`);
        gradient.addColorStop(1, "rgba(88,154,235,0)");
        context.strokeStyle = gradient;
        context.lineWidth = ray.width;
        context.beginPath();
        context.moveTo(centerX, centerY);
        context.quadraticCurveTo(
          centerX + (endX - centerX) * 0.52 - Math.sin(ray.angle) * bend,
          centerY + (endY - centerY) * 0.45 + Math.cos(ray.angle) * bend * 0.4,
          endX,
          endY,
        );
        context.stroke();

        if (index % 3 === 0) {
          const pulse = 0.12 + ray.phase * 0.82;
          const dotX = centerX + (endX - centerX) * pulse;
          const dotY = centerY + (endY - centerY) * pulse;
          context.fillStyle = `rgba(56,137,238,${0.15 + (1 - ray.phase) * 0.34})`;
          context.beginPath();
          context.arc(dotX, dotY, ray.width + 0.55, 0, Math.PI * 2);
          context.fill();
        }
      });
      context.restore();

      const halo = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, width < 720 ? 38 : 72);
      halo.addColorStop(0, "rgba(255,255,255,0.96)");
      halo.addColorStop(0.1, "rgba(72,151,245,0.55)");
      halo.addColorStop(0.35, "rgba(93,165,248,0.12)");
      halo.addColorStop(1, "rgba(93,165,248,0)");
      context.fillStyle = halo;
      context.beginPath();
      context.arc(centerX, centerY, width < 720 ? 38 : 72, 0, Math.PI * 2);
      context.fill();

      if (!reduceMotion.matches) frame = requestAnimationFrame(render);
    };

    const resize = () => {
      width = Math.max(1, canvas.clientWidth);
      height = Math.max(1, canvas.clientHeight);
      ratio = Math.min(window.devicePixelRatio || 1, width < 720 ? 1.2 : 1.5);
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      rebuild();
      render(performance.now(), true);
    };

    window.addEventListener("maka:pointer", ((event: CustomEvent<{ normalizedX: number; normalizedY: number }>) => {
      pointerX = event.detail.normalizedX;
      pointerY = event.detail.normalizedY;
      if (reduceMotion.matches) render(performance.now(), true);
    }) as EventListener);

    window.addEventListener("maka:viewchange", ((event: CustomEvent<{ view: string }>) => {
      active = event.detail.view === "surfaces";
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
