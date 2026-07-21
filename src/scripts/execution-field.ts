/*
 * The execution field is one fixed canvas behind the whole page,
 * rendered with raw WebGL — two draw calls, no runtime dependency.
 *
 *   1. A daylight shader — soft blue light in the hero, settling to paper
 *      through the proof sections, and dimming to near-black behind Runtime.
 *   2. A particle stream — loose cloud in the hero, receding to the margins
 *      during proof, and aligning into one flowing band behind the Event Log.
 *
 * Everything is driven by three real signals: time, pointer, and scroll.
 * Reduced motion renders discrete frames with no continuous animation.
 */

const canvas = document.querySelector<HTMLCanvasElement>("#execution-field");

const PARTICLES = 300;

const BACKGROUND_VERTEX = `
attribute vec2 aPosition;
varying vec2 vUv;
void main() {
  vUv = aPosition * 0.5 + 0.5;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`;

const BACKGROUND_FRAGMENT = `
precision highp float;
uniform float uTime;
uniform float uAspect;
uniform float uTheme;
uniform vec2 uPointer;
uniform vec2 uVelocity;
varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(41.31, 289.17))) * 43758.5453);
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float sum = 0.0;
  float amp = 0.55;
  for (int i = 0; i < 4; i++) {
    sum += valueNoise(p) * amp;
    p = p * 2.03 + vec2(17.7, 9.2);
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec2 p = vUv - 0.5;
  p.x *= uAspect;

  /* Daylight patches: two drifting fbm fields multiplied so the
     bright areas read as light falling through, not fog. */
  float lightA = fbm(p * 1.35 + vec2(uTime * 0.016, uTime * 0.008));
  float lightB = fbm(p * 2.4 - vec2(uTime * 0.011, uTime * 0.02) + 4.7);
  float patches = smoothstep(0.42, 0.98, lightA * 0.65 + lightB * 0.45);

  /* Pointer: a soft local brightening plus a short velocity streak. */
  vec2 toPointer = p - uPointer * vec2(uAspect, 1.0) * 0.5;
  float pointerGlow = exp(-dot(toPointer, toPointer) * 7.0);
  float speed = min(1.0, length(uVelocity) * 0.6);
  vec2 dir = normalize(uVelocity + vec2(0.0001));
  float along = dot(toPointer, dir);
  float across = dot(toPointer, vec2(-dir.y, dir.x));
  float streak = exp(-across * across * 60.0) * exp(-abs(along + 0.18) * 4.5) * speed;

  /* Sky state */
  vec3 skyTop = vec3(0.795, 0.869, 0.945);
  vec3 skyBottom = vec3(0.845, 0.906, 0.960);
  vec3 sky = mix(skyTop, skyBottom, vUv.y * 0.9);
  sky += vec3(0.155, 0.118, 0.075) * patches * 0.72;
  sky += vec3(0.10, 0.08, 0.05) * pointerGlow;
  sky += vec3(0.09, 0.10, 0.11) * streak;

  /* Paper state */
  vec3 paper = vec3(0.980, 0.984, 0.992);
  paper += vec3(0.012, 0.010, 0.004) * patches;

  /* Night state */
  vec3 night = vec3(0.055, 0.063, 0.078);
  night += vec3(0.020, 0.032, 0.058) * patches * 0.8;
  night += vec3(0.05, 0.07, 0.11) * pointerGlow * 0.7;
  float vignette = smoothstep(1.45, 0.35, length(p));
  night *= mix(0.82, 1.0, vignette);

  float toPaper = clamp(uTheme, 0.0, 1.0);
  float toNight = clamp(uTheme - 1.0, 0.0, 1.0);
  vec3 color = mix(mix(sky, paper, toPaper), night, toNight);

  /* Fine grain to avoid banding. */
  color += (hash(vUv * vec2(1920.0, 1080.0) + fract(uTime)) - 0.5) * 0.012;

  gl_FragColor = vec4(color, 1.0);
}
`;

const PARTICLE_VERTEX = `
attribute vec2 aPosition;
attribute float aSize;
attribute float aShade;
uniform float uAspect;
uniform float uDpr;
varying float vShade;
void main() {
  vShade = aShade;
  gl_Position = vec4(aPosition.x / uAspect, aPosition.y, 0.0, 1.0);
  gl_PointSize = aSize * uDpr;
}
`;

const PARTICLE_FRAGMENT = `
precision mediump float;
uniform float uTheme;
varying float vShade;
void main() {
  vec2 offset = gl_PointCoord - 0.5;
  float disc = smoothstep(0.5, 0.18, length(offset));
  if (disc < 0.01) discard;

  float toPaper = clamp(uTheme, 0.0, 1.0);
  float toNight = clamp(uTheme - 1.0, 0.0, 1.0);

  vec3 dayColor = mix(vec3(0.22, 0.42, 0.76), vec3(0.44, 0.62, 0.88), vShade);
  vec3 nightColor = mix(vec3(0.52, 0.68, 0.96), vec3(0.86, 0.92, 1.0), vShade);
  vec3 color = mix(dayColor, nightColor, toNight);

  float dayAlpha = mix(0.20, 0.10, toPaper);
  float alpha = mix(dayAlpha, 0.55, toNight) * disc;
  gl_FragColor = vec4(color, alpha);
}
`;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const damp = (current: number, target: number, lambda: number, delta: number) =>
  lerp(current, target, 1 - Math.exp(-lambda * delta));
const smoothstep = (value: number) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};

const compile = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader => {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("shader allocation failed");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "shader compile failed");
  }
  return shader;
};

const link = (gl: WebGLRenderingContext, vertex: string, fragment: string): WebGLProgram => {
  const program = gl.createProgram();
  if (!program) throw new Error("program allocation failed");
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertex));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragment));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program) ?? "program link failed");
  }
  return program;
};

if (canvas) {
  try {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const gl = (canvas.getContext("webgl2", { alpha: false, depth: false, stencil: false, antialias: false, powerPreference: "high-performance" })
      ?? canvas.getContext("webgl", { alpha: false, depth: false, stencil: false, antialias: false, powerPreference: "high-performance" })) as WebGLRenderingContext | null;
    if (!gl) throw new Error("WebGL unavailable");

    /* ————— Programs ————— */

    const backgroundProgram = link(gl, BACKGROUND_VERTEX, BACKGROUND_FRAGMENT);
    const particleProgram = link(gl, PARTICLE_VERTEX, PARTICLE_FRAGMENT);

    const backgroundUniform = {
      time: gl.getUniformLocation(backgroundProgram, "uTime"),
      aspect: gl.getUniformLocation(backgroundProgram, "uAspect"),
      theme: gl.getUniformLocation(backgroundProgram, "uTheme"),
      pointer: gl.getUniformLocation(backgroundProgram, "uPointer"),
      velocity: gl.getUniformLocation(backgroundProgram, "uVelocity"),
    };
    const particleUniform = {
      aspect: gl.getUniformLocation(particleProgram, "uAspect"),
      dpr: gl.getUniformLocation(particleProgram, "uDpr"),
      theme: gl.getUniformLocation(particleProgram, "uTheme"),
    };

    const quadBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const backgroundPosition = gl.getAttribLocation(backgroundProgram, "aPosition");

    /* ————— Particle state ————— */

    const seeded = (index: number, salt: number) => {
      const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
      return value - Math.floor(value);
    };

    const positions = new Float32Array(PARTICLES * 2);
    const velocities = new Float32Array(PARTICLES * 2);
    const sizes = new Float32Array(PARTICLES);
    const shades = new Float32Array(PARTICLES);
    const random1 = new Float32Array(PARTICLES);
    const random2 = new Float32Array(PARTICLES);
    const random3 = new Float32Array(PARTICLES);
    const gaussX = new Float32Array(PARTICLES);
    const gaussY = new Float32Array(PARTICLES);

    for (let i = 0; i < PARTICLES; i += 1) {
      random1[i] = seeded(i, 1);
      random2[i] = seeded(i, 2);
      random3[i] = seeded(i, 3);
      const radius = Math.sqrt(-2 * Math.log(Math.max(1e-6, seeded(i, 4))));
      const angle = seeded(i, 5) * Math.PI * 2;
      gaussX[i] = radius * Math.cos(angle) * 0.24;
      gaussY[i] = radius * Math.sin(angle) * 0.2;
      sizes[i] = 2.6 + seeded(i, 6) * 4.2 + (seeded(i, 7) > 0.93 ? 5.5 : 0);
      shades[i] = seeded(i, 8);
      positions[i * 2] = (random1[i] * 2 - 1) * 1.4;
      positions[i * 2 + 1] = (random2[i] * 2 - 1) * 1.1;
    }

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW);
    const sizeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW);
    const shadeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, shadeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, shades, gl.STATIC_DRAW);

    const particlePosition = gl.getAttribLocation(particleProgram, "aPosition");
    const particleSize = gl.getAttribLocation(particleProgram, "aSize");
    const particleShade = gl.getAttribLocation(particleProgram, "aShade");

    /* ————— Section sampling: theme + choreography from real scroll ————— */

    type SectionInfo = { top: number; theme: number; stage: number };
    let sections: SectionInfo[] = [];

    const themeValueFor = (name: string | undefined) =>
      name === "night" ? 2 : name === "paper" ? 1 : 0;

    const measureSections = () => {
      sections = Array.from(document.querySelectorAll<HTMLElement>("[data-theme]")).map(
        (element, index) => ({
          top: element.offsetTop,
          theme: themeValueFor(element.dataset.theme),
          stage: index,
        }),
      );
      sections.sort((a, b) => a.top - b.top);
    };

    const sampleScroll = () => {
      const viewportHeight = window.innerHeight;
      const middle = window.scrollY + viewportHeight * 0.5;
      let theme = 0;
      let stage = 0;
      if (sections.length > 0) {
        let index = 0;
        for (let i = 0; i < sections.length; i += 1) {
          if (sections[i].top <= middle) index = i;
        }
        theme = sections[index].theme;
        stage = sections[index].stage;
        const next = sections[index + 1];
        if (next) {
          const zone = viewportHeight * 0.9;
          const t = smoothstep((middle - (next.top - zone * 0.5)) / zone);
          theme = lerp(theme, next.theme, t);
          stage = lerp(stage, next.stage, t);
        }
      }
      return { theme, stage };
    };

    /* Particle homes per stage, in unit space (x scaled by aspect at eval). */
    const stageX = (stage: number, i: number, time: number): number => {
      switch (stage) {
        case 0: /* hero — loose cloud, upper right of center */
          return 0.34 + gaussX[i] * 1.6;
        case 1: /* work — clear the reading plane, hold the margins */
          return Math.sign(random1[i] - 0.5) * (0.84 + random2[i] * 0.14);
        case 2: /* statement — wide ring */
          return Math.cos(random1[i] * Math.PI * 2) * (0.62 + random2[i] * 0.2);
        case 3: { /* runtime — one flowing band */
          const flow = random1[i] * 2 + time * 0.028 * (0.4 + random3[i]);
          return ((flow % 2) + 2) % 2 - 1;
        }
        default: /* surfaces + cta — sparse field */
          return (random1[i] * 2 - 1) * 0.95;
      }
    };

    const stageY = (stage: number, i: number, time: number): number => {
      switch (stage) {
        case 0:
          return 0.16 + gaussY[i] * 1.7 + Math.sin(time * 0.4 + random3[i] * 9) * 0.02;
        case 1:
          return (random3[i] * 2 - 1) * 0.85;
        case 2:
          return Math.sin(random1[i] * Math.PI * 2) * (0.5 + random2[i] * 0.16);
        case 3:
          return (random2[i] * 2 - 1) * 0.14 + Math.sin(time * 0.6 + random1[i] * 12) * 0.015;
        case 4:
          return (random2[i] * 2 - 1) * 0.85;
        default:
          return (random2[i] * 2 - 1) * 0.85 + 0.05;
      }
    };

    const homeX = (stage: number, i: number, time: number): number => {
      const s0 = Math.min(5, Math.max(0, Math.floor(stage)));
      const s1 = Math.min(5, s0 + 1);
      return lerp(stageX(s0, i, time), stageX(s1, i, time), stage - s0);
    };
    const homeY = (stage: number, i: number, time: number): number => {
      const s0 = Math.min(5, Math.max(0, Math.floor(stage)));
      const s1 = Math.min(5, s0 + 1);
      return lerp(stageY(s0, i, time), stageY(s1, i, time), stage - s0);
    };

    /* ————— Signals ————— */

    const pointer = { x: 0, y: 0 };
    const pointerTarget = { x: 0, y: 0 };
    const pointerVelocity = { x: 0, y: 0 };
    const smoothedVelocity = { x: 0, y: 0 };
    const previousPointer = { x: 0, y: 0 };
    let aspect = 1;
    let dpr = 1;
    let pointerActive = false;

    window.addEventListener(
      "pointermove",
      (event) => {
        pointerActive = true;
        pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointerTarget.y = -(event.clientY / window.innerHeight) * 2 + 1;
      },
      { passive: true },
    );

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.4 : 1.75);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      aspect = width / height;
      measureSections();
    };

    /* ————— Frame update ————— */

    const startedAt = performance.now();
    let lastFrameAt = startedAt;
    let frame = 0;
    let visible = !document.hidden;

    const update = (elapsed: number, delta: number, settle: boolean) => {
      const { theme, stage } = sampleScroll();

      pointerVelocity.x = Math.max(-6, Math.min(6, (pointerTarget.x - previousPointer.x) / Math.max(delta, 1e-4)));
      pointerVelocity.y = Math.max(-6, Math.min(6, (pointerTarget.y - previousPointer.y) / Math.max(delta, 1e-4)));
      previousPointer.x = pointerTarget.x;
      previousPointer.y = pointerTarget.y;
      pointer.x = damp(pointer.x, pointerTarget.x, 7, delta);
      pointer.y = damp(pointer.y, pointerTarget.y, 7, delta);
      const velocityBlend = Math.min(1, delta * 8);
      smoothedVelocity.x = lerp(smoothedVelocity.x, pointerVelocity.x, velocityBlend);
      smoothedVelocity.y = lerp(smoothedVelocity.y, pointerVelocity.y, velocityBlend);

      const pointerWorldX = pointer.x * aspect;
      const pointerWorldY = pointer.y;
      const speed = Math.min(1, Math.hypot(smoothedVelocity.x, smoothedVelocity.y) * 0.35);

      for (let i = 0; i < PARTICLES; i += 1) {
        const targetX = homeX(stage, i, elapsed) * aspect;
        const targetY = homeY(stage, i, elapsed);

        if (settle) {
          positions[i * 2] = targetX;
          positions[i * 2 + 1] = targetY;
          continue;
        }

        const px = positions[i * 2];
        const py = positions[i * 2 + 1];
        let vx = velocities[i * 2];
        let vy = velocities[i * 2 + 1];

        /* Spring toward the section home. */
        vx += (targetX - px) * delta * 2.4;
        vy += (targetY - py) * delta * 2.4;

        /* Gentle organic drift. */
        vx += Math.sin(elapsed * (0.24 + random2[i] * 0.3) + random1[i] * 20) * delta * 0.05;
        vy += Math.cos(elapsed * (0.2 + random1[i] * 0.3) + random2[i] * 20) * delta * 0.05;

        /* Pointer wake: nearby particles are pushed along the motion. */
        if (pointerActive) {
          const dx = px - pointerWorldX;
          const dy = py - pointerWorldY;
          const fall = Math.exp(-(dx * dx + dy * dy) * 9);
          vx += (dx * 1.4 + smoothedVelocity.x * 0.16) * fall * delta * (0.6 + speed * 2.2);
          vy += (dy * 1.4 + smoothedVelocity.y * 0.16) * fall * delta * (0.6 + speed * 2.2);
        }

        const damping = Math.exp(-delta * 2.1);
        vx *= damping;
        vy *= damping;
        velocities[i * 2] = vx;
        velocities[i * 2 + 1] = vy;
        positions[i * 2] = px + vx * delta;
        positions[i * 2 + 1] = py + vy * delta;
      }

      /* Draw background. */
      gl.disable(gl.BLEND);
      gl.useProgram(backgroundProgram);
      gl.uniform1f(backgroundUniform.time, elapsed);
      gl.uniform1f(backgroundUniform.aspect, aspect);
      gl.uniform1f(backgroundUniform.theme, theme);
      gl.uniform2f(backgroundUniform.pointer, pointer.x, pointer.y);
      gl.uniform2f(backgroundUniform.velocity, smoothedVelocity.x, smoothedVelocity.y);
      gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
      gl.enableVertexAttribArray(backgroundPosition);
      gl.vertexAttribPointer(backgroundPosition, 2, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      /* Draw particles. */
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.useProgram(particleProgram);
      gl.uniform1f(particleUniform.aspect, aspect);
      gl.uniform1f(particleUniform.dpr, dpr);
      gl.uniform1f(particleUniform.theme, theme);
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, positions);
      gl.enableVertexAttribArray(particlePosition);
      gl.vertexAttribPointer(particlePosition, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, sizeBuffer);
      gl.enableVertexAttribArray(particleSize);
      gl.vertexAttribPointer(particleSize, 1, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, shadeBuffer);
      gl.enableVertexAttribArray(particleShade);
      gl.vertexAttribPointer(particleShade, 1, gl.FLOAT, false, 0, 0);
      gl.drawArrays(gl.POINTS, 0, PARTICLES);
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
    }).observe(canvas);

    if (reduceMotion) {
      window.addEventListener("scroll", renderStill, { passive: true });
    }

    resize();
    update(0, 1 / 60, true);
    document.documentElement.dataset.field = "ready";
    if (reduceMotion) renderStill();
    else animate();
  } catch (error) {
    console.warn("Maka execution field unavailable", error);
    document.documentElement.dataset.field = "unavailable";
  }
} else {
  document.documentElement.dataset.field = "unavailable";
}
