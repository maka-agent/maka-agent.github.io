const canvas = document.querySelector<HTMLCanvasElement>("#product-hover-field");
const surface = canvas?.closest<HTMLElement>("[data-product-inspector]");
const sourceImage = surface?.querySelector<HTMLImageElement>("img");

if (canvas && surface && sourceImage) {
  const coarsePointer = window.matchMedia("(pointer: coarse)");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (coarsePointer.matches) {
    canvas.dataset.hoverState = "disabled";
  } else {
    const gl = canvas.getContext("webgl2", {
      alpha: true,
      antialias: false,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
      powerPreference: "high-performance",
    });

    if (!gl) {
      canvas.dataset.hoverState = "unavailable";
    } else {
      const vertexSource = `#version 300 es
        in vec2 aPosition;
        in vec2 aUv;
        out vec2 vUv;

        void main() {
          vUv = aUv;
          gl_Position = vec4(aPosition, 0.0, 1.0);
        }
      `;

      const fragmentSource = `#version 300 es
        precision highp float;

        uniform sampler2D uTexture;
        uniform vec2 uResolution;
        uniform vec2 uPointer;
        uniform vec2 uUvScale;
        uniform vec2 uUvOffset;
        uniform float uProgress;
        uniform float uDpr;
        uniform float uCellPx;

        in vec2 vUv;
        out vec4 outColor;

        float squareCoverage(vec2 pixel, float progress) {
          if (progress <= 0.0) return 0.0;

          float revealBand = max(uCellPx * 11.0, 24.0);
          float maxRadius = length(uResolution);
          float revealRadius = progress * (maxRadius + revealBand);
          float grow = clamp((revealRadius - distance(pixel, uPointer)) / revealBand, 0.0, 1.0);
          grow = smoothstep(0.0, 1.0, grow);

          vec2 cellUv = fract(pixel / uCellPx);
          vec2 cellFromCenter = abs(cellUv - vec2(0.5));
          float squareExtent = mix(0.0, 0.5, grow);
          float squareDistance = max(cellFromCenter.x, cellFromCenter.y);
          float aa = max(fwidth(squareDistance), 0.001) * 1.5;
          if (squareExtent <= aa) return 0.0;
          if (grow >= 0.999) return 1.0;
          return 1.0 - smoothstep(squareExtent - aa, squareExtent + aa, squareDistance);
        }

        void main() {
          vec2 pixel = gl_FragCoord.xy / max(uDpr, 1.0);
          float coverage = squareCoverage(pixel, uProgress);
          if (coverage < 0.001) discard;

          vec2 imageUv = uUvOffset + vUv * uUvScale;
          vec4 source = texture(uTexture, imageUv);
          vec3 contrast = clamp((source.rgb - 0.5) * 1.14 + 0.5, 0.0, 1.0);
          vec3 inspected = mix(contrast, contrast * vec3(0.93, 1.0, 1.08), 0.34);
          float detail = dot(abs(dFdx(source.rgb)) + abs(dFdy(source.rgb)), vec3(0.333));
          inspected += vec3(0.02, 0.055, 0.095) * smoothstep(0.025, 0.15, detail);
          outColor = vec4(inspected, source.a * coverage * 0.96);
        }
      `;

      const compileShader = (type: number, source: string) => {
        const shader = gl.createShader(type);
        if (!shader) throw new Error("Unable to allocate Product inspection shader");
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
          const error = gl.getShaderInfoLog(shader) ?? "Unknown shader compile error";
          gl.deleteShader(shader);
          throw new Error(error);
        }
        return shader;
      };

      try {
        const program = gl.createProgram();
        if (!program) throw new Error("Unable to allocate Product inspection program");
        const vertexShader = compileShader(gl.VERTEX_SHADER, vertexSource);
        const fragmentShader = compileShader(gl.FRAGMENT_SHADER, fragmentSource);
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);
        gl.deleteShader(vertexShader);
        gl.deleteShader(fragmentShader);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
          throw new Error(gl.getProgramInfoLog(program) ?? "Unknown Product inspection link error");
        }

        const vertexData = new Float32Array([
          -1, -1, 0, 0,
           1, -1, 1, 0,
          -1,  1, 0, 1,
          -1,  1, 0, 1,
           1, -1, 1, 0,
           1,  1, 1, 1,
        ]);
        const buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);

        const stride = 4 * Float32Array.BYTES_PER_ELEMENT;
        const positionLocation = gl.getAttribLocation(program, "aPosition");
        const uvLocation = gl.getAttribLocation(program, "aUv");
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, stride, 0);
        gl.enableVertexAttribArray(uvLocation);
        gl.vertexAttribPointer(uvLocation, 2, gl.FLOAT, false, stride, 2 * Float32Array.BYTES_PER_ELEMENT);

        const texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        const uniforms = {
          texture: gl.getUniformLocation(program, "uTexture"),
          resolution: gl.getUniformLocation(program, "uResolution"),
          pointer: gl.getUniformLocation(program, "uPointer"),
          uvScale: gl.getUniformLocation(program, "uUvScale"),
          uvOffset: gl.getUniformLocation(program, "uUvOffset"),
          progress: gl.getUniformLocation(program, "uProgress"),
          dpr: gl.getUniformLocation(program, "uDpr"),
          cellPx: gl.getUniformLocation(program, "uCellPx"),
        };

        let width = 1;
        let height = 1;
        let dpr = 1;
        let progress = 0;
        let targetProgress = 0;
        let pointerX = 0.5;
        let pointerY = 0.5;
        let frame = 0;
        let lastFrameAt = performance.now();

        const updateTexture = async () => {
          if (!sourceImage.complete || sourceImage.naturalWidth === 0) await sourceImage.decode();
          gl.bindTexture(gl.TEXTURE_2D, texture);
          gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, sourceImage);
        };

        const updateObjectFit = () => {
          const naturalWidth = Math.max(1, sourceImage.naturalWidth);
          const naturalHeight = Math.max(1, sourceImage.naturalHeight);
          const scale = Math.max(width / naturalWidth, height / naturalHeight);
          const visibleWidth = width / scale;
          const visibleHeight = height / scale;
          const uvScaleX = visibleWidth / naturalWidth;
          const uvScaleY = visibleHeight / naturalHeight;
          gl.uniform2f(uniforms.uvScale, uvScaleX, uvScaleY);
          gl.uniform2f(uniforms.uvOffset, (1 - uvScaleX) * 0.5, 1 - uvScaleY);
        };

        const resize = () => {
          width = Math.max(1, surface.clientWidth);
          height = Math.max(1, surface.clientHeight);
          dpr = Math.min(window.devicePixelRatio || 1, 1.5);
          const backingWidth = Math.max(1, Math.round(width * dpr));
          const backingHeight = Math.max(1, Math.round(height * dpr));
          if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
            canvas.width = backingWidth;
            canvas.height = backingHeight;
            gl.viewport(0, 0, backingWidth, backingHeight);
          }
          pointerX = Math.min(width, Math.max(0, pointerX));
          pointerY = Math.min(height, Math.max(0, pointerY));
          gl.useProgram(program);
          gl.uniform2f(uniforms.resolution, width, height);
          gl.uniform1f(uniforms.dpr, dpr);
          gl.uniform1f(uniforms.cellPx, width < 720 ? 10 : 13);
          updateObjectFit();
        };

        const render = (now: number) => {
          frame = 0;
          const delta = Math.min(0.1, Math.max(0, (now - lastFrameAt) / 1000));
          lastFrameAt = now;
          if (reduceMotion.matches) progress = targetProgress;
          else if (targetProgress > progress) progress = Math.min(targetProgress, progress + delta / 0.42);
          else if (targetProgress < progress) progress = Math.max(targetProgress, progress - delta / 0.42);

          const easedProgress = 0.5 - 0.5 * Math.cos(Math.PI * progress);
          gl.clearColor(0, 0, 0, 0);
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.useProgram(program);
          gl.uniform1i(uniforms.texture, 0);
          gl.uniform2f(uniforms.pointer, pointerX, pointerY);
          gl.uniform1f(uniforms.progress, easedProgress);
          gl.drawArrays(gl.TRIANGLES, 0, 6);

          canvas.dataset.progress = progress.toFixed(3);
          canvas.dataset.hoverState = progress <= 0.001
            ? "idle"
            : progress >= 0.999
              ? "active"
              : targetProgress > progress ? "entering" : "leaving";

          if (Math.abs(targetProgress - progress) > 0.001) frame = requestAnimationFrame(render);
        };

        const requestRender = () => {
          if (!frame) {
            lastFrameAt = performance.now();
            frame = requestAnimationFrame(render);
          }
        };

        const setPointer = (clientX: number, clientY: number) => {
          const rect = surface.getBoundingClientRect();
          pointerX = Math.min(width, Math.max(0, clientX - rect.left));
          pointerY = Math.min(height, Math.max(0, rect.bottom - clientY));
        };

        const enter = (clientX?: number, clientY?: number) => {
          if (typeof clientX === "number" && typeof clientY === "number") setPointer(clientX, clientY);
          else {
            pointerX = width * 0.5;
            pointerY = height * 0.5;
          }
          targetProgress = 1;
          requestRender();
        };

        const leave = () => {
          targetProgress = 0;
          requestRender();
        };

        surface.addEventListener("pointerenter", (event) => {
          if (event.pointerType === "mouse" || event.pointerType === "pen") enter(event.clientX, event.clientY);
        });
        surface.addEventListener("pointermove", (event) => {
          if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
          setPointer(event.clientX, event.clientY);
          requestRender();
        }, { passive: true });
        surface.addEventListener("pointerleave", leave);
        surface.addEventListener("focusin", () => enter());
        surface.addEventListener("focusout", leave);
        window.addEventListener("maka:viewchange", ((event: CustomEvent<{ index: number }>) => {
          if (event.detail.index !== 1) leave();
        }) as EventListener);

        canvas.addEventListener("webglcontextlost", (event) => {
          event.preventDefault();
          canvas.dataset.hoverState = "unavailable";
        });

        const observer = new ResizeObserver(() => {
          resize();
          requestRender();
        });
        observer.observe(surface);

        void updateTexture().then(() => {
          gl.useProgram(program);
          resize();
          pointerX = width * 0.5;
          pointerY = height * 0.5;
          canvas.dataset.renderer = "webgl2";
          canvas.dataset.hoverState = "idle";
          requestRender();
        }).catch(() => {
          canvas.dataset.hoverState = "unavailable";
        });
      } catch {
        canvas.dataset.hoverState = "unavailable";
      }
    }
  }
}
