/*
 * The execution field: one fixed canvas behind the whole page, rendered
 * with raw WebGL. Five passes — pointer flow buffer, daylight background,
 * transmissive monogram tube, sparkle glints, particle stream — all driven
 * by four real signals: time, pointer, scroll, and the theme toggle.
 *
 * Reduced motion renders discrete frames with no continuous animation.
 * Without WebGL the CSS sky gradient and opaque section backgrounds keep
 * the composition intact.
 */

import {
  composeModelMatrix,
  createCanvasTexture,
  createDynamicBuffer,
  createIndexBuffer,
  createStaticBuffer,
  linkProgram,
  transformPoint,
} from "./field/gl";
import {
  BACKGROUND_FRAGMENT,
  BACKGROUND_VERTEX,
  GLINT_FRAGMENT,
  GLINT_VERTEX,
  PARTICLE_FRAGMENT,
  PARTICLE_VERTEX,
  TUBE_FRAGMENT,
  TUBE_VERTEX,
  WARP_FRAGMENT,
  WARP_VERTEX,
} from "./field/shaders";
import { createFlowField } from "./field/flow";
import { ParticleSystem, type PointerState } from "./field/particles";
import { ScrollMap } from "./field/scroll-map";
import { buildMonogramTube, paintMatcap } from "./field/tube";

const PARTICLE_COUNT = 300;
const GLINT_COUNT = 4;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const damp = (current: number, target: number, lambda: number, delta: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * delta));
const clamp = (value: number, low: number, high: number) =>
  Math.min(high, Math.max(low, value));

const canvas = document.querySelector<HTMLCanvasElement>("#execution-field");

const start = (surface: HTMLCanvasElement): void => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const contextAttributes: WebGLContextAttributes = {
    alpha: false,
    depth: true,
    stencil: false,
    antialias: true,
    powerPreference: "high-performance",
  };
  const gl = (surface.getContext("webgl2", contextAttributes)
    ?? surface.getContext("webgl", contextAttributes)) as WebGLRenderingContext | null;
  if (!gl) throw new Error("WebGL unavailable");

  /* ————— Programs and geometry ————— */

  const backgroundProgram = linkProgram(gl, BACKGROUND_VERTEX, BACKGROUND_FRAGMENT);
  const particleProgram = linkProgram(gl, PARTICLE_VERTEX, PARTICLE_FRAGMENT);
  const tubeProgram = linkProgram(gl, TUBE_VERTEX, TUBE_FRAGMENT);
  const glintProgram = linkProgram(gl, GLINT_VERTEX, GLINT_FRAGMENT);
  const warpProgram = linkProgram(gl, WARP_VERTEX, WARP_FRAGMENT);

  const uniforms = {
    background: {
      time: gl.getUniformLocation(backgroundProgram, "uTime"),
      aspect: gl.getUniformLocation(backgroundProgram, "uAspect"),
      theme: gl.getUniformLocation(backgroundProgram, "uTheme"),
      night: gl.getUniformLocation(backgroundProgram, "uNight"),
      pointer: gl.getUniformLocation(backgroundProgram, "uPointer"),
      flow: gl.getUniformLocation(backgroundProgram, "uFlow"),
    },
    particle: {
      aspect: gl.getUniformLocation(particleProgram, "uAspect"),
      dpr: gl.getUniformLocation(particleProgram, "uDpr"),
      theme: gl.getUniformLocation(particleProgram, "uTheme"),
      night: gl.getUniformLocation(particleProgram, "uNight"),
      warpFade: gl.getUniformLocation(particleProgram, "uWarpFade"),
    },
    warp: {
      aspect: gl.getUniformLocation(warpProgram, "uAspect"),
      strength: gl.getUniformLocation(warpProgram, "uStrength"),
    },
    tube: {
      model: gl.getUniformLocation(tubeProgram, "uModel"),
      aspect: gl.getUniformLocation(tubeProgram, "uAspect"),
      matcap: gl.getUniformLocation(tubeProgram, "uMatcap"),
      flow: gl.getUniformLocation(tubeProgram, "uFlow"),
      resolution: gl.getUniformLocation(tubeProgram, "uResolution"),
      time: gl.getUniformLocation(tubeProgram, "uTime"),
      theme: gl.getUniformLocation(tubeProgram, "uTheme"),
      night: gl.getUniformLocation(tubeProgram, "uNight"),
      opacity: gl.getUniformLocation(tubeProgram, "uOpacity"),
    },
    glint: {
      aspect: gl.getUniformLocation(glintProgram, "uAspect"),
      dpr: gl.getUniformLocation(glintProgram, "uDpr"),
      opacity: gl.getUniformLocation(glintProgram, "uOpacity"),
    },
  };

  const attribute = {
    backgroundPosition: gl.getAttribLocation(backgroundProgram, "aPosition"),
    particlePosition: gl.getAttribLocation(particleProgram, "aPosition"),
    particleSize: gl.getAttribLocation(particleProgram, "aSize"),
    particleShade: gl.getAttribLocation(particleProgram, "aShade"),
    tubePosition: gl.getAttribLocation(tubeProgram, "aPosition"),
    tubeNormal: gl.getAttribLocation(tubeProgram, "aNormal"),
    glintPosition: gl.getAttribLocation(glintProgram, "aPosition"),
    glintSize: gl.getAttribLocation(glintProgram, "aSize"),
    glintPulse: gl.getAttribLocation(glintProgram, "aPulse"),
    warpPosition: gl.getAttribLocation(warpProgram, "aPosition"),
    warpShade: gl.getAttribLocation(warpProgram, "aShade"),
  };

  const quadBuffer = createStaticBuffer(gl, new Float32Array([-1, -1, 3, -1, -1, 3]));
  const flow = createFlowField(gl, quadBuffer);

  const particles = new ParticleSystem(PARTICLE_COUNT);
  const particlePositionBuffer = createDynamicBuffer(gl, particles.positions);
  const particleSizeBuffer = createStaticBuffer(gl, particles.sizes);
  const particleShadeBuffer = createStaticBuffer(gl, particles.shades);
  const warpPositionBuffer = createDynamicBuffer(gl, particles.linePositions);
  const warpShadeBuffer = createStaticBuffer(gl, particles.lineShades);

  const tube = buildMonogramTube();
  const tubePositionBuffer = createStaticBuffer(gl, tube.positions);
  const tubeNormalBuffer = createStaticBuffer(gl, tube.normals);
  const tubeIndexBuffer = createIndexBuffer(gl, tube.indices);
  const matcapTexture = createCanvasTexture(gl, paintMatcap());

  const glintData = new Float32Array(GLINT_COUNT * 2);
  const glintSizes = new Float32Array(GLINT_COUNT);
  const glintPulses = new Float32Array(GLINT_COUNT);
  const glintPositionBuffer = createDynamicBuffer(gl, glintData);
  const glintSizeBuffer = createDynamicBuffer(gl, glintSizes);
  const glintPulseBuffer = createDynamicBuffer(gl, glintPulses);

  /* ————— Signals ————— */

  const scrollMap = new ScrollMap();
  const pointer: PointerState = { x: 0, y: 0, velocityX: 0, velocityY: 0, active: false };
  const pointerTarget = { x: 0, y: 0 };
  const previousPointer = { x: 0, y: 0 };
  let aspect = 1;
  let dpr = 1;
  let compact = false;
  let nightMode = document.documentElement.dataset.theme === "dark" ? 1 : 0;
  let nightTarget = nightMode;

  new MutationObserver(() => {
    nightTarget = document.documentElement.dataset.theme === "dark" ? 1 : 0;
    if (reduceMotion) renderStill();
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  window.addEventListener(
    "pointermove",
    (event) => {
      pointer.active = true;
      pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = -(event.clientY / window.innerHeight) * 2 + 1;
    },
    { passive: true },
  );

  const resize = () => {
    const width = Math.max(1, surface.clientWidth);
    const height = Math.max(1, surface.clientHeight);
    compact = width < 768;
    dpr = Math.min(window.devicePixelRatio || 1, compact ? 1.4 : 1.75);
    surface.width = Math.round(width * dpr);
    surface.height = Math.round(height * dpr);
    gl.viewport(0, 0, surface.width, surface.height);
    aspect = width / height;
    flow.resize(surface.width, surface.height);
    scrollMap.measure();
  };

  /* ————— Frame ————— */

  const startedAt = performance.now();
  let lastFrameAt = startedAt;
  let frame = 0;
  let visible = !document.hidden;

  const update = (elapsed: number, delta: number, settle: boolean) => {
    const { theme, stage } = scrollMap.sample();

    pointer.velocityX = clamp((pointerTarget.x - previousPointer.x) / Math.max(delta, 1e-4), -6, 6);
    pointer.velocityY = clamp((pointerTarget.y - previousPointer.y) / Math.max(delta, 1e-4), -6, 6);
    previousPointer.x = pointerTarget.x;
    previousPointer.y = pointerTarget.y;
    pointer.x = damp(pointer.x, pointerTarget.x, 7, delta);
    pointer.y = damp(pointer.y, pointerTarget.y, 7, delta);
    nightMode = settle ? nightTarget : damp(nightMode, nightTarget, 5, delta);

    particles.update(stage, elapsed, delta, aspect, pointer, settle);
    particles.updateWarp(stage, elapsed, aspect);

    /* Pass 1 — pointer flow buffer (skipped in settle frames). */
    if (!settle && pointer.active) {
      flow.update(
        pointer.x * 0.5 + 0.5,
        pointer.y * 0.5 + 0.5,
        clamp(pointer.velocityX * 0.5, -3, 3),
        clamp(pointer.velocityY * 0.5, -3, 3),
        delta,
        aspect,
      );
    }

    /* Pass 2 — background. */
    gl.disable(gl.BLEND);
    gl.disable(gl.DEPTH_TEST);
    gl.useProgram(backgroundProgram);
    gl.uniform1f(uniforms.background.time, elapsed);
    gl.uniform1f(uniforms.background.aspect, aspect);
    gl.uniform1f(uniforms.background.theme, theme);
    gl.uniform1f(uniforms.background.night, nightMode);
    gl.uniform2f(uniforms.background.pointer, pointer.x, pointer.y);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, flow.texture);
    gl.uniform1i(uniforms.background.flow, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.enableVertexAttribArray(attribute.backgroundPosition);
    gl.vertexAttribPointer(attribute.backgroundPosition, 2, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    /* Pass 2.5 — Runtime warp streaks (additive, dark band only). */
    if (particles.warpStrength > 0.01) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(warpProgram);
      gl.uniform1f(uniforms.warp.aspect, aspect);
      gl.uniform1f(uniforms.warp.strength, particles.warpStrength);
      gl.bindBuffer(gl.ARRAY_BUFFER, warpPositionBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, particles.linePositions);
      gl.enableVertexAttribArray(attribute.warpPosition);
      gl.vertexAttribPointer(attribute.warpPosition, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, warpShadeBuffer);
      gl.enableVertexAttribArray(attribute.warpShade);
      gl.vertexAttribPointer(attribute.warpShade, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.LINES, 0, particles.count * 2);
    }

    /* Pass 3 — monogram tube; it rises away as the reader scrolls. */
    const tubeOpacity = clamp(1 - stage * 1.5, 0, 1);
    let model: Float32Array | null = null;
    if (tubeOpacity > 0.01) {
      const breatheX = Math.sin(elapsed * 0.31) * 0.02;
      const breatheY = Math.sin(elapsed * 0.24 + 2.1) * 0.028;
      const scale = compact ? 0.225 : 0.305;
      const tx = (compact ? 0.02 : 0.20) + pointer.x * 0.035;
      const ty = (compact ? 0.36 : 0.10)
        + pointer.y * 0.028
        + Math.sin(elapsed * 0.5) * 0.012
        + stage * 0.55;
      model = composeModelMatrix(
        tx, ty, 0,
        -0.06 + pointer.y * 0.10 + breatheY,
        0.04 + pointer.x * 0.16 + breatheX,
        -0.05,
        scale,
      );

      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(tubeProgram);
      gl.uniformMatrix4fv(uniforms.tube.model, false, model);
      gl.uniform1f(uniforms.tube.aspect, aspect);
      gl.uniform1f(uniforms.tube.time, elapsed);
      gl.uniform1f(uniforms.tube.theme, theme);
      gl.uniform1f(uniforms.tube.night, nightMode);
      gl.uniform1f(uniforms.tube.opacity, tubeOpacity);
      gl.uniform2f(uniforms.tube.resolution, surface.width, surface.height);
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, matcapTexture);
      gl.uniform1i(uniforms.tube.matcap, 0);
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, flow.texture);
      gl.uniform1i(uniforms.tube.flow, 1);
      gl.bindBuffer(gl.ARRAY_BUFFER, tubePositionBuffer);
      gl.enableVertexAttribArray(attribute.tubePosition);
      gl.vertexAttribPointer(attribute.tubePosition, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, tubeNormalBuffer);
      gl.enableVertexAttribArray(attribute.tubeNormal);
      gl.vertexAttribPointer(attribute.tubeNormal, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, tubeIndexBuffer);
      gl.drawElements(gl.TRIANGLES, tube.indices.length, gl.UNSIGNED_SHORT, 0);
      gl.disable(gl.DEPTH_TEST);
      gl.activeTexture(gl.TEXTURE0);
    }

    /* Pass 4 — sparkle glints riding the tube. */
    if (model && tubeOpacity > 0.01) {
      for (let i = 0; i < GLINT_COUNT; i += 1) {
        const world = transformPoint(model, tube.glintAnchors[i]);
        glintData[i * 2] = world[0];
        glintData[i * 2 + 1] = world[1];
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.35 + i * 1.8);
        glintSizes[i] = (26 + i * 5) * (0.7 + pulse * 0.5);
        glintPulses[i] = 0.25 + pulse * 0.75;
      }
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
      gl.useProgram(glintProgram);
      gl.uniform1f(uniforms.glint.aspect, aspect);
      gl.uniform1f(uniforms.glint.dpr, dpr);
      gl.uniform1f(uniforms.glint.opacity, tubeOpacity);
      gl.bindBuffer(gl.ARRAY_BUFFER, glintPositionBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, glintData);
      gl.enableVertexAttribArray(attribute.glintPosition);
      gl.vertexAttribPointer(attribute.glintPosition, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, glintSizeBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, glintSizes);
      gl.enableVertexAttribArray(attribute.glintSize);
      gl.vertexAttribPointer(attribute.glintSize, 1, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, glintPulseBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, glintPulses);
      gl.enableVertexAttribArray(attribute.glintPulse);
      gl.vertexAttribPointer(attribute.glintPulse, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, GLINT_COUNT);
    }

    /* Pass 5 — particle stream. */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(particleProgram);
    gl.uniform1f(uniforms.particle.aspect, aspect);
    gl.uniform1f(uniforms.particle.dpr, dpr);
    gl.uniform1f(uniforms.particle.theme, theme);
    gl.uniform1f(uniforms.particle.night, nightMode);
    gl.uniform1f(uniforms.particle.warpFade, 1 - particles.warpStrength * 0.8);
    gl.bindBuffer(gl.ARRAY_BUFFER, particlePositionBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, particles.positions);
    gl.enableVertexAttribArray(attribute.particlePosition);
    gl.vertexAttribPointer(attribute.particlePosition, 2, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, particleSizeBuffer);
    gl.enableVertexAttribArray(attribute.particleSize);
    gl.vertexAttribPointer(attribute.particleSize, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, particleShadeBuffer);
    gl.enableVertexAttribArray(attribute.particleShade);
    gl.vertexAttribPointer(attribute.particleShade, 1, gl.FLOAT, false, 0, 0);
    gl.drawArrays(gl.POINTS, 0, particles.count);
  };

  const animate = (now = performance.now()) => {
    if (!visible) {
      frame = 0;
      lastFrameAt = now;
      return;
    }
    frame = requestAnimationFrame(animate);
    const elapsed = (now - startedAt) / 1000;
    const delta = Math.min(1 / 30, Math.max(1 / 240, (now - lastFrameAt) / 1000));
    lastFrameAt = now;
    update(elapsed, delta, false);
  };

  /* Reduced motion: discrete frames on load, scroll, and resize only. */
  let stillQueued = false;
  const renderStill = () => {
    if (stillQueued) return;
    stillQueued = true;
    requestAnimationFrame(() => {
      stillQueued = false;
      update(0, 1 / 60, true);
    });
  };

  document.addEventListener("visibilitychange", () => {
    visible = !document.hidden;
    if (visible && !reduceMotion && !frame) animate();
  });

  new ResizeObserver(() => {
    resize();
    if (reduceMotion) renderStill();
  }).observe(surface);

  /* Late layout shifts (fonts, images) move section offsets. */
  window.addEventListener("load", () => scrollMap.measure());

  if (reduceMotion) {
    window.addEventListener("scroll", renderStill, { passive: true });
  }

  resize();
  update(0, 1 / 60, true);
  document.documentElement.dataset.field = "ready";
  if (reduceMotion) renderStill();
  else animate();
};

if (canvas) {
  try {
    start(canvas);
  } catch (error) {
    console.warn("Maka execution field unavailable", error);
    document.documentElement.dataset.field = "unavailable";
  }
} else {
  document.documentElement.dataset.field = "unavailable";
}
