const canvas = document.querySelector<HTMLCanvasElement>("#execution-field");

if (canvas) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance",
  });

  if (!gl) {
    document.documentElement.dataset.field = "unavailable";
  } else {
    const vertexSource = `#version 300 es
      precision highp float;

      const vec2 POSITIONS[3] = vec2[3](
        vec2(-1.0, -1.0),
        vec2( 3.0, -1.0),
        vec2(-1.0,  3.0)
      );

      void main() {
        gl_Position = vec4(POSITIONS[gl_VertexID], 0.0, 1.0);
      }
    `;

    const fragmentSource = `#version 300 es
      precision highp float;

      uniform vec2 uResolution;
      uniform vec2 uPointer;
      uniform float uTime;
      uniform float uScroll;
      uniform float uSection;
      uniform float uMotion;

      out vec4 outColor;

      float segmentDistance(vec2 p, vec2 a, vec2 b) {
        vec2 pa = p - a;
        vec2 ba = b - a;
        float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
        return length(pa - ba * h);
      }

      float lineMask(float distanceToLine, float width, float feather) {
        return 1.0 - smoothstep(width, width + feather, distanceToLine);
      }

      float ringMask(vec2 p, vec2 center, float radius, float width, float feather) {
        return lineMask(abs(length(p - center) - radius), width, feather);
      }

      vec2 routePoint(float index, float state) {
        float bend = sin(state * 1.13 + index * 1.7) * 0.055;
        if (index < 0.5) return vec2(0.085, 0.70 - bend);
        if (index < 1.5) return vec2(0.29, 0.42 + bend);
        if (index < 2.5) return vec2(0.49, 0.57 - bend * 0.6);
        if (index < 3.5) return vec2(0.70, 0.27 + bend);
        return vec2(0.91, 0.39 - bend * 0.8);
      }

      void main() {
        vec2 uv = vec2(gl_FragCoord.x / uResolution.x, 1.0 - gl_FragCoord.y / uResolution.y);
        float aspect = uResolution.x / uResolution.y;
        vec2 p = vec2(uv.x * aspect, uv.y);
        vec2 pointer = vec2(uPointer.x * aspect, uPointer.y);
        float px = 1.0 / uResolution.y;

        vec3 ink = vec3(0.09, 0.09, 0.102);
        vec3 blue = vec3(0.3394, 0.6401, 0.9360);
        float inkAlpha = 0.0;
        float blueAlpha = 0.0;

        for (int i = 1; i < 12; i++) {
          float x = (float(i) / 12.0) * aspect;
          float emphasized = (i == 1 || i == 3 || i == 6 || i == 9 || i == 11) ? 1.0 : 0.35;
          inkAlpha = max(inkAlpha, lineMask(abs(p.x - x), px * 0.42, px * 0.75) * 0.075 * emphasized);
        }

        float horizontalA = lineMask(abs(p.y - 0.12), px * 0.42, px * 0.75);
        float horizontalB = lineMask(abs(p.y - 0.50), px * 0.42, px * 0.75);
        float horizontalC = lineMask(abs(p.y - 0.88), px * 0.42, px * 0.75);
        inkAlpha = max(inkAlpha, max(horizontalA, max(horizontalB, horizontalC)) * 0.055);

        vec2 r0 = routePoint(0.0, uSection);
        vec2 r1 = routePoint(1.0, uSection);
        vec2 r2 = routePoint(2.0, uSection);
        vec2 r3 = routePoint(3.0, uSection);
        vec2 r4 = routePoint(4.0, uSection);
        r0.x *= aspect; r1.x *= aspect; r2.x *= aspect; r3.x *= aspect; r4.x *= aspect;

        float route = min(
          min(segmentDistance(p, r0, r1), segmentDistance(p, r1, r2)),
          min(segmentDistance(p, r2, r3), segmentDistance(p, r3, r4))
        );
        inkAlpha = max(inkAlpha, lineMask(route, px * 0.55, px * 1.2) * 0.24);

        float activeRoute = min(segmentDistance(p, r1, r2), segmentDistance(p, r2, r3));
        blueAlpha = max(blueAlpha, lineMask(activeRoute, px * 0.85, px * 1.15) * 0.72);

        vec2 nodes[5] = vec2[5](r0, r1, r2, r3, r4);
        for (int i = 0; i < 5; i++) {
          float node = ringMask(p, nodes[i], px * 5.0, px * 0.8, px * 1.0);
          inkAlpha = max(inkAlpha, node * 0.56);
        }

        float travel = fract((uTime * 0.055 + uScroll * 0.82) * max(uMotion, 0.001));
        float scaled = travel * 4.0;
        vec2 traveler;
        if (scaled < 1.0) traveler = mix(r0, r1, scaled);
        else if (scaled < 2.0) traveler = mix(r1, r2, scaled - 1.0);
        else if (scaled < 3.0) traveler = mix(r2, r3, scaled - 2.0);
        else traveler = mix(r3, r4, scaled - 3.0);
        float travelerCore = 1.0 - smoothstep(px * 2.5, px * 5.5, length(p - traveler));
        float travelerRing = ringMask(p, traveler, px * 10.0, px * 0.7, px * 1.0);
        blueAlpha = max(blueAlpha, travelerCore);
        blueAlpha = max(blueAlpha, travelerRing * 0.42);

        if (uPointer.x >= 0.0) {
          float pointerRing = ringMask(p, pointer, px * 17.0, px * 0.65, px * 1.0);
          float crossX = lineMask(abs(p.x - pointer.x), px * 0.55, px * 0.8) * step(abs(p.y - pointer.y), px * 24.0);
          float crossY = lineMask(abs(p.y - pointer.y), px * 0.55, px * 0.8) * step(abs(p.x - pointer.x), px * 24.0);
          blueAlpha = max(blueAlpha, max(pointerRing, max(crossX, crossY)) * 0.46);
        }

        float alpha = clamp(max(inkAlpha, blueAlpha), 0.0, 0.86);
        vec3 color = mix(ink, blue, smoothstep(0.06, 0.22, blueAlpha));
        outColor = vec4(color * alpha, alpha);
      }
    `;

    const compile = (type: number, source: string): WebGLShader => {
      const shader = gl.createShader(type);
      if (!shader) throw new Error("Unable to create WebGL shader");
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      return shader;
    };

    const parallelCompile = gl.getExtension("KHR_parallel_shader_compile") as {
      COMPLETION_STATUS_KHR: number;
    } | null;
    const nextFrame = (): Promise<void> =>
      new Promise((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

    void (async () => {
      try {
        const program = gl.createProgram();
        if (!program) throw new Error("Unable to create WebGL program");
        const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
        await nextFrame();
        const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (parallelCompile) {
          while (
            !gl.getProgramParameter(
              program,
              parallelCompile.COMPLETION_STATUS_KHR,
            )
          ) {
            await nextFrame();
          }
        } else {
          await nextFrame();
        }

        for (const shader of [vertexShader, fragmentShader]) {
          if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const message =
              gl.getShaderInfoLog(shader) || "WebGL shader compilation failed";
            gl.deleteShader(vertexShader);
            gl.deleteShader(fragmentShader);
            gl.deleteProgram(program);
            throw new Error(message);
          }
        }

        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          throw new Error(
            gl.getProgramInfoLog(program) || "WebGL program linking failed",
          );
        }

        const uniform = (name: string): WebGLUniformLocation => {
          const location = gl.getUniformLocation(program, name);
          if (!location) throw new Error(`Missing WebGL uniform: ${name}`);
          return location;
        };

        const resolutionLocation = uniform("uResolution");
        const pointerLocation = uniform("uPointer");
        const timeLocation = uniform("uTime");
        const scrollLocation = uniform("uScroll");
        const sectionLocation = uniform("uSection");
        const motionLocation = uniform("uMotion");

        const reducedMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)",
        );
        const coarsePointer = window.matchMedia("(pointer: coarse)");
        let pointer = coarsePointer.matches
          ? { x: -1, y: -1 }
          : { x: 0.68, y: 0.28 };
        let targetSection = 0;
        let currentSection = 0;
        let scrollProgress = 0;
        let frame = 0;
        let lastFrameAt = 0;
        let startedAt = performance.now();
        let running = false;
        const frameInterval = 1000 / 30;

        const telemetryX = document.querySelector<HTMLElement>("#telemetry-x");
        const telemetryY = document.querySelector<HTMLElement>("#telemetry-y");
        const telemetrySection =
          document.querySelector<HTMLElement>("#telemetry-section");

        const resize = (): void => {
          const maxDpr = window.innerWidth < 768 ? 1.5 : 2;
          const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
          const width = Math.max(1, Math.round(window.innerWidth * dpr));
          const height = Math.max(1, Math.round(window.innerHeight * dpr));
          if (canvas.width !== width || canvas.height !== height) {
            canvas.width = width;
            canvas.height = height;
            gl.viewport(0, 0, width, height);
          }
        };

        const updateScroll = (): void => {
          const range = Math.max(
            1,
            document.documentElement.scrollHeight - window.innerHeight,
          );
          scrollProgress = Math.min(1, Math.max(0, window.scrollY / range));
        };

        const draw = (now: number): void => {
          currentSection +=
            (targetSection - currentSection) *
            (reducedMotion.matches ? 1 : 0.055);
          gl.disable(gl.BLEND);
          gl.disable(gl.DEPTH_TEST);
          gl.disable(gl.CULL_FACE);
          gl.useProgram(program);
          gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
          gl.uniform2f(pointerLocation, pointer.x, pointer.y);
          gl.uniform1f(timeLocation, (now - startedAt) / 1000);
          gl.uniform1f(scrollLocation, scrollProgress);
          gl.uniform1f(sectionLocation, currentSection);
          gl.uniform1f(motionLocation, reducedMotion.matches ? 0 : 1);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        };

        const loop = (now: number): void => {
          if (!running) return;
          if (now - lastFrameAt >= frameInterval) {
            draw(now);
            lastFrameAt = now;
          }
          frame = window.requestAnimationFrame(loop);
        };

        const start = (): void => {
          if (running || document.hidden) return;
          running = true;
          startedAt = performance.now();
          lastFrameAt = 0;
          if (reducedMotion.matches) draw(startedAt);
          else frame = window.requestAnimationFrame(loop);
        };

        const stop = (): void => {
          running = false;
          window.cancelAnimationFrame(frame);
        };

        const redrawStatic = (): void => {
          if (reducedMotion.matches) draw(performance.now());
        };

        window.addEventListener(
          "pointermove",
          (event) => {
            if (coarsePointer.matches) return;
            pointer = {
              x: event.clientX / window.innerWidth,
              y: event.clientY / window.innerHeight,
            };
            if (telemetryX)
              telemetryX.textContent = String(
                Math.round(event.clientX),
              ).padStart(4, "0");
            if (telemetryY)
              telemetryY.textContent = String(
                Math.round(event.clientY),
              ).padStart(4, "0");
            redrawStatic();
          },
          { passive: true },
        );

        window.addEventListener(
          "scroll",
          () => {
            updateScroll();
            redrawStatic();
          },
          { passive: true },
        );

        window.addEventListener(
          "resize",
          () => {
            resize();
            redrawStatic();
          },
          { passive: true },
        );

        document.addEventListener("visibilitychange", () => {
          if (document.hidden) stop();
          else start();
        });

        reducedMotion.addEventListener("change", () => {
          stop();
          start();
        });

        const sections = [
          ...document.querySelectorAll<HTMLElement>("[data-field-state]"),
        ];
        const observer = new IntersectionObserver(
          (entries) => {
            const visible = entries
              .filter((entry) => entry.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
            if (!visible) return;
            const element = visible.target as HTMLElement;
            targetSection = Number(element.dataset.fieldState || 0);
            if (telemetrySection)
              telemetrySection.textContent =
                element.dataset.fieldLabel || "OVERVIEW";
            redrawStatic();
          },
          { rootMargin: "-18% 0px -42%", threshold: [0.08, 0.25, 0.5, 0.75] },
        );
        sections.forEach((section) => observer.observe(section));

        canvas.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          stop();
          document.documentElement.dataset.field = "unavailable";
        });

        updateScroll();
        resize();
        draw(performance.now());
        document.documentElement.dataset.field = "ready";
        start();
      } catch (error) {
        console.error("Execution field unavailable", error);
        document.documentElement.dataset.field = "unavailable";
      }
    })();
  }
}
