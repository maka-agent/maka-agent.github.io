import * as THREE from "three";

const canvas = document.querySelector<HTMLCanvasElement>("#runtime-field");

if (canvas) {
  try {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: false,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setClearColor(0x01030a, 1);

    const scene = new THREE.Scene();
    const camera = new THREE.Camera();
    const uniforms = {
      iResolution: { value: new THREE.Vector2(1, 1) },
      iTime: { value: 1.45 },
      uScrollDuration: { value: 2 },
      uStripeReveal: { value: 1 },
      uCenterShift: { value: new THREE.Vector2() },
      uAccentColor: { value: new THREE.Color("#009dff") },
      uStripeColorA: { value: new THREE.Color("#18dcff") },
      uStripeColorB: { value: new THREE.Color("#6baeff") },
      uPermissionColor: { value: new THREE.Color("#ffb340") },
      uArtifactColor: { value: new THREE.Color("#d8f7ff") },
      uRecoveryColor: { value: new THREE.Color("#55e69a") },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
      vertexShader: `
        void main() {
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        precision highp float;

        uniform vec2 iResolution;
        uniform float iTime;
        uniform float uScrollDuration;
        uniform float uStripeReveal;
        uniform vec2 uCenterShift;
        uniform vec3 uAccentColor;
        uniform vec3 uStripeColorA;
        uniform vec3 uStripeColorB;
        uniform vec3 uPermissionColor;
        uniform vec3 uArtifactColor;
        uniform vec3 uRecoveryColor;

        float hash21(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        vec3 rgb2hsv(vec3 c) {
          vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
          vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
          vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
          float d = q.x - min(q.w, q.y);
          float e = 1.0e-10;
          return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
        }

        vec3 hsv2rgb(vec3 c) {
          vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
          vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
          return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
        }

        vec3 sampleExecutionField(vec2 fragCoord) {
          vec2 R = iResolution.xy;
          float baseScale = max(1.0, min(R.x, R.y));
          vec2 u = (fragCoord * 2.0 - R) / baseScale;
          u -= uCenterShift;

          float dur = max(uScrollDuration, 1e-4);
          float time = clamp(iTime, 0.0, dur);
          float t = clamp(time / dur, 0.0, 1.0);

          const float cellDensity = 100.0;
          vec2 polar = vec2(atan(u.y, u.x) / 3.0, length(u));
          float angleCoord = (6.0 - polar.x) * cellDensity;
          float angleId = floor(angleCoord) + 0.5;
          float angleCell = abs(fract(angleCoord) - 0.5);
          float radialCoord = (6.0 - polar.y) * cellDensity;
          vec2 q = vec2(angleId, radialCoord);

          float travel = smoothstep(0.0, 1.0, t);
          float keepProbability = mix(0.18, 1.0, travel);
          float scrollSpeed = mix(0.7, 3.6, travel);
          float trailLength = mix(2.7, 0.975, travel);
          float raySeq = fract((angleId + 0.5) * 0.61803398875);
          float keepMask = 1.0 - smoothstep(keepProbability - 0.025, keepProbability + 0.025, raySeq);

          float phaseBase = (q.y * 0.02 + q.x * 0.4) * fract(q.x * 0.61);
          vec4 spark = max(
            1.0 - fract(vec4(7.0, 6.0, 4.0, 0.0) * 0.02 + phaseBase + time * scrollSpeed) * trailLength,
            0.0
          );

          float channelMix = max(max(spark.r, spark.g), spark.b);
          float edge = max(fwidth(channelMix) * 1.5, 2.0 / max(iResolution.y, 1.0));
          float star = smoothstep(0.12 - edge, 0.12 + edge, channelMix);
          float thinEdge = max(fwidth(angleCell) * 1.5, 0.002);
          float thinMask = 1.0 - smoothstep(0.13 - thinEdge, 0.13 + thinEdge, angleCell);
          star *= thinMask * keepMask;

          float radialBoost = pow(smoothstep(0.1, 1.0, polar.y), 1.25);
          float intensity = mix(0.0, 6.5, t * 1.2);

          float stripeBlend = hash21(vec2(angleId, 19.713));
          float category = hash21(vec2(angleId, 43.117));
          vec3 stripeRgb = mix(uStripeColorA, uStripeColorB, stripeBlend);
          float semantic = 0.0;
          if (category > 0.93) {
            stripeRgb = uPermissionColor;
            semantic = 1.0;
          } else if (category > 0.86) {
            stripeRgb = uRecoveryColor;
            semantic = 1.0;
          } else if (category > 0.78) {
            stripeRgb = uArtifactColor;
            semantic = 1.0;
          }

          vec3 hsvA = rgb2hsv(max(uStripeColorA, vec3(1e-5)));
          vec3 hsvB = rgb2hsv(max(uStripeColorB, vec3(1e-5)));
          float dh = abs(hsvA.x - hsvB.x);
          dh = min(dh, 1.0 - dh);
          float hueBand = clamp(dh * 1.25 + 0.04, 0.07, 0.24);
          vec3 hsv = rgb2hsv(max(stripeRgb, vec3(1e-5)));
          float idHash = hash21(vec2(angleId, 6.18));
          float idHash2 = hash21(vec2(angleId, 91.7));
          float scrollPhase = time * scrollSpeed;
          float hueAnim = sin(scrollPhase * 0.52 + angleId * 0.29 + idHash * 6.2831853) * (hueBand * 0.85);
          float hueStripe = (idHash - 0.5) * hueBand * 2.0;
          hsv.x = fract(hsv.x + (hueStripe + hueAnim) * mix(1.0, 0.08, semantic));
          hsv.y = clamp(hsv.y * mix(0.96, 1.06, idHash2), 0.0, 1.0);
          hsv.z = clamp(hsv.z * mix(0.97, 1.05, idHash), 0.0, 1.0);
          vec3 sparkColor = hsv2rgb(hsv);
          float pulse = mix(0.78, 1.0, smoothstep(0.14, 0.5, channelMix));

          return intensity * radialBoost * sparkColor * pulse * star;
        }

        void main() {
          vec3 stripes = sampleExecutionField(gl_FragCoord.xy);
          float reveal = clamp(uStripeReveal, 0.0, 1.0);
          float stripeLuma = dot(stripes, vec3(0.299, 0.587, 0.114));
          float darken = smoothstep(0.0, 0.88, reveal);
          vec3 darkBase = mix(uAccentColor, vec3(0.0), darken);
          float gapMask = (1.0 - smoothstep(0.035, 0.12, stripeLuma)) * reveal;
          float crackGuard = 1.0 - smoothstep(0.68, 0.94, reveal);
          vec3 rgb = darkBase + stripes * reveal + uAccentColor * gapMask * 0.07 * crackGuard;
          gl_FragColor = vec4(rgb, 1.0);
          #include <colorspace_fragment>
        }
      `,
    });

    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material));
    canvas.dataset.renderer = "webgl2-polar-shader";

    let active = document.querySelector<HTMLElement>(".stage")?.dataset.view === "runtime";
    let visible = !document.hidden;
    let frame = 0;
    let lastFrameAt = performance.now();
    const settledProgress = () => window.innerWidth < 768 ? 0.66 : 0.714;
    let progress = reduceMotion.matches ? settledProgress() : active ? 0.22 : 0.12;
    let targetProgress = active ? settledProgress() : 0.12;
    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      if (active) targetProgress = settledProgress();
      const dpr = Math.min(window.devicePixelRatio || 1, width < 768 ? 1.25 : 1.6);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      uniforms.iResolution.value.set(width * dpr, height * dpr);
      if (active || reduceMotion.matches) renderer.render(scene, camera);
    };

    const render = (now = performance.now()) => {
      if (!visible || (!active && !reduceMotion.matches)) {
        frame = 0;
        lastFrameAt = now;
        return;
      }
      const delta = Math.min(1 / 24, Math.max(1 / 240, (now - lastFrameAt) / 1000));
      lastFrameAt = now;
      progress = THREE.MathUtils.damp(progress, targetProgress, 2.65, delta);
      pointer.x = THREE.MathUtils.damp(pointer.x, pointerTarget.x, 5, delta);
      pointer.y = THREE.MathUtils.damp(pointer.y, pointerTarget.y, 5, delta);
      const liveProgress = reduceMotion.matches
        ? settledProgress()
        : Math.min(0.75, progress + Math.sin(now * 0.00034) * 0.01);
      uniforms.iTime.value = liveProgress * 2;
      uniforms.uStripeReveal.value = THREE.MathUtils.smoothstep(liveProgress, 0.08, 0.68);
      uniforms.uCenterShift.value.set(pointer.x * 0.036, pointer.y * 0.024);
      canvas.dataset.progress = liveProgress.toFixed(3);
      renderer.render(scene, camera);
      if (!reduceMotion.matches) frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (!visible || reduceMotion.matches || frame) return;
      lastFrameAt = performance.now();
      frame = requestAnimationFrame(render);
    };

    window.addEventListener("maka:pointer", ((event: CustomEvent<{ normalizedX: number; normalizedY: number }>) => {
      pointerTarget.set(event.detail.normalizedX, event.detail.normalizedY);
      if (reduceMotion.matches && active) render(performance.now());
    }) as EventListener);

    window.addEventListener("maka:viewchange", ((event: CustomEvent<{ view: string }>) => {
      active = event.detail.view === "runtime";
      canvas.dataset.active = String(active);
      targetProgress = active ? settledProgress() : 0.12;
      if (active && !reduceMotion.matches) {
        progress = Math.min(progress, 0.2);
        start();
      } else if (active) {
        render(performance.now());
      }
    }) as EventListener);

    document.addEventListener("visibilitychange", () => {
      visible = !document.hidden;
      if (!visible) {
        cancelAnimationFrame(frame);
        frame = 0;
      } else if (active) {
        start();
      }
    });

    new ResizeObserver(resize).observe(canvas);
    canvas.dataset.active = String(active);
    resize();
    if (reduceMotion.matches) render(performance.now());
    else if (active) start();
  } catch (error) {
    console.warn("Maka runtime field unavailable", error);
    canvas.dataset.renderer = "unavailable";
  }
}
