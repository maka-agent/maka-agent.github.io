import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { MAKA_TUBE_BRANCHES, MAKA_TUBE_RADIUS } from "./maka-wordmark-tube";

const canvas = document.querySelector<HTMLCanvasElement>("#execution-field");
const root = document.documentElement;
const clearBootFallback = () => {
  const timeout = Number.parseInt(root.dataset.bootTimeout ?? "", 10);
  if (Number.isFinite(timeout)) window.clearTimeout(timeout);
  delete root.dataset.bootTimeout;
};
const revealBoot = (reduceMotion: boolean) => {
  clearBootFallback();
  // The 2.4s fallback may already have revealed the page. Re-running the
  // staged sequence would blink settled content back out — never regress.
  if (reduceMotion || root.dataset.boot === "complete") {
    root.dataset.boot = "complete";
    return;
  }
  root.dataset.boot = "field";
  window.setTimeout(() => { root.dataset.boot = "shell"; }, 80);
  window.setTimeout(() => { root.dataset.boot = "ready"; }, 800);
  window.setTimeout(() => { root.dataset.boot = "complete"; }, 1780);
};

if (canvas) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      depth: true,
      powerPreference: "high-performance",
    });

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.46;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    camera.position.set(0, 0, 18);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    scene.environmentIntensity = 1.18;
    pmrem.dispose();

    const world = new THREE.Group();
    const organism = new THREE.Group();
    const satellites = new THREE.Group();
    world.add(organism, satellites);

    const atmosphereUniforms = {
      uMakaTime: { value: 0 },
      uMakaAspect: { value: 1 },
      uMakaPointer: { value: new THREE.Vector2() },
      uMakaVelocity: { value: new THREE.Vector2() },
      uMakaIntensity: { value: 1 },
    };
    const atmosphereMaterial = new THREE.ShaderMaterial({
      uniforms: atmosphereUniforms,
      vertexShader: `
        varying vec2 vMakaUv;
        void main() {
          vMakaUv = uv;
          gl_Position = vec4(position.xy, 0.999, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uMakaTime;
        uniform float uMakaAspect;
        uniform float uMakaIntensity;
        uniform vec2 uMakaPointer;
        uniform vec2 uMakaVelocity;
        varying vec2 vMakaUv;

        float makaBand(vec2 point, float slope, float offset, float width, float phase) {
          float wave = sin(point.x * 2.1 + phase + uMakaTime * 0.18) * 0.085;
          float distanceToBand = abs(point.y - (point.x * slope + offset + wave));
          return 1.0 - smoothstep(width, width + 0.34, distanceToBand);
        }

        void main() {
          vec2 point = vMakaUv - 0.5;
          point.x *= uMakaAspect;
          point += vec2(uMakaPointer.x * -0.34, uMakaPointer.y * -0.22);
          float velocity = min(1.0, length(uMakaVelocity) * 0.12);
          vec2 velocityDirection = normalize(uMakaVelocity + vec2(0.0001));
          vec2 velocityNormal = vec2(-velocityDirection.y, velocityDirection.x);
          float trailAcross = dot(point - vec2(0.12, 0.02), velocityNormal);
          float trailAlong = dot(point - vec2(0.12, 0.02), velocityDirection);
          float velocityTrail = exp(-trailAcross * trailAcross * 18.0)
            * exp(-abs(trailAlong) * 1.35)
            * smoothstep(-0.72, 0.18, trailAlong)
            * velocity;
          float lean = uMakaVelocity.x * 0.012;
          float whiteBand = makaBand(point, 0.42 + lean, 0.12, 0.10, 0.0);
          float pearlBand = makaBand(point, -0.54 + lean * 0.6, -0.18, 0.13, 2.4);
          float blueBand = makaBand(point, 0.12 - lean, -0.42, 0.2, 4.8);
          float centerBloom = exp(-dot(point - vec2(0.18, 0.02), point - vec2(0.18, 0.02)) * 1.7);
          vec3 whiteLight = vec3(1.0, 0.995, 0.96) * whiteBand;
          vec3 pearlLight = vec3(0.87, 0.95, 1.0) * pearlBand;
          vec3 blueLight = vec3(0.38, 0.68, 0.96) * blueBand;
          vec3 color = whiteLight * 0.78 + pearlLight * 0.54 + blueLight * 0.24;
          color += vec3(0.82, 0.93, 1.0) * centerBloom * (0.08 + velocity * 0.055);
          color += vec3(0.3, 0.64, 0.98) * velocityTrail * 0.2;
          float alpha = clamp((whiteBand * 0.22 + pearlBand * 0.15 + blueBand * 0.11 + centerBloom * 0.02 + velocityTrail * 0.08) * uMakaIntensity, 0.0, 0.3);
          gl_FragColor = vec4(color, alpha);
        }
      `,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const atmosphere = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), atmosphereMaterial);
    atmosphere.frustumCulled = false;
    atmosphere.renderOrder = -100;
    scene.add(atmosphere, world);

    const pearl = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#1f70b8"),
      metalness: 0.12,
      roughness: 0.36,
      clearcoat: 0.72,
      clearcoatRoughness: 0.09,
      transmission: 0,
      thickness: 1.35,
      iridescence: 0.36,
      iridescenceIOR: 1.34,
      sheen: 0.18,
      sheenColor: new THREE.Color("#ffffff"),
      anisotropy: 0.28,
    });

    // Keep the silhouette stable while letting pearl accents catch light like
    // a living material. This changes surface normals, not object geometry.
    let pearlShader: Parameters<typeof pearl.onBeforeCompile>[0] | null = null;
    pearl.onBeforeCompile = (shader) => {
      pearlShader = shader;
      shader.uniforms.uMakaTime = { value: 0 };
      shader.uniforms.uMakaDistortion = { value: 0.036 };
      shader.vertexShader = `varying vec3 vMakaLocalPosition;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        "#include <begin_vertex>\nvMakaLocalPosition = position;",
      );
      shader.fragmentShader = `
        uniform float uMakaTime;
        uniform float uMakaDistortion;
        varying vec3 vMakaLocalPosition;
        ${shader.fragmentShader}
      `;
      shader.fragmentShader = shader.fragmentShader.replace(
        "#include <normal_fragment_maps>",
        `#include <normal_fragment_maps>
        float makaWaveA = sin(vMakaLocalPosition.x * 3.4 + vMakaLocalPosition.z * 2.1 + uMakaTime * 0.42);
        float makaWaveB = sin(vMakaLocalPosition.y * 4.8 - vMakaLocalPosition.x * 1.7 - uMakaTime * 0.31);
        float makaWaveC = cos(vMakaLocalPosition.z * 5.2 + vMakaLocalPosition.y * 1.9 + uMakaTime * 0.24);
        vec3 makaSurface = vec3(makaWaveA, makaWaveB, makaWaveC) * uMakaDistortion;
        normal = normalize(normal + makaSurface);`,
      );
    };
    pearl.customProgramCacheKey = () => "maka-pearl-normal-v1";

    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#63b6f6"),
      metalness: 0,
      roughness: 0.12,
      transmission: 0.2,
      thickness: 1.1,
      ior: 1.43,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      opacity: 0.76,
      transparent: true,
    });

    const cobalt = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#176ed3"),
      metalness: 0.08,
      roughness: 0.16,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: new THREE.Color("#063d80"),
      emissiveIntensity: 0.14,
    });

    const ink = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#101522"),
      metalness: 0.46,
      roughness: 0.2,
      clearcoat: 0.68,
      clearcoatRoughness: 0.12,
    });

    let atmosphereNightScale = 1;

    const permissionAmber = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#ff9f1c"),
      metalness: 0.04,
      roughness: 0.2,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      emissive: new THREE.Color("#7d3900"),
      emissiveIntensity: 0.16,
    });

    const successGreen = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#47d58a"),
      metalness: 0.03,
      roughness: 0.18,
      clearcoat: 0.9,
      clearcoatRoughness: 0.09,
    });

    const wordmark = new THREE.Group();

    // Soft refractive glass in the reference's optical grammar: the tube
    // refracts a procedural copy of the page sky (per-channel offsets),
    // wears one pointer-driven pin-sharp Blinn-Phong highlight, a vertical
    // blue→white Beer-Lambert tint, and a directional fresnel rim. The
    // shader is original; the constants follow the documented reference
    // values in REFERENCE_STUDY.md.
    const wordGlassUniforms = {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uLight: { value: new THREE.Vector3(0.6, 0.9, 0.5) },
      uOpacity: { value: 1 },
      uTintTop: { value: new THREE.Color("#009dff") },
      uTintBottom: { value: new THREE.Color("#ffffff") },
      uTintYRange: { value: new THREE.Vector2(-2.2, 2.2) },
      uNight: { value: 0 },
    };
    const wordFaceMaterial = new THREE.ShaderMaterial({
      uniforms: wordGlassUniforms,
      transparent: true,
      toneMapped: false,
      vertexShader: `
        varying vec3 vWorldNormal;
        varying vec3 vEyeDir;
        varying float vLocalY;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
          vEyeDir = normalize(worldPos.xyz - cameraPosition);
          vLocalY = position.y;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec2 uResolution;
        uniform vec3 uLight;
        uniform float uOpacity;
        uniform vec3 uTintTop;
        uniform vec3 uTintBottom;
        uniform vec2 uTintYRange;
        uniform float uNight;
        varying vec3 vWorldNormal;
        varying vec3 vEyeDir;
        varying float vLocalY;

        const float REFRACT_POWER = 0.72;
        const float CHROMATIC = 0.14;
        const float SHININESS = 120.0;
        const float DIFFUSENESS = 0.1;
        const float SPECULAR_STRENGTH = 1.2;
        const float FRESNEL_POWER = 1.0;
        const float FRESNEL_STRENGTH = 0.24;
        const vec3 FRESNEL_SIDE = vec3(-0.577, 0.577, -0.577);

        // Procedural stand-in for the page sky: paper-blue gradient with
        // two warm diagonal light bands, matching the DOM backdrop.
        vec3 sky(vec2 p, float night) {
          vec3 top = mix(vec3(0.90, 0.945, 0.985), vec3(0.10, 0.12, 0.19), night);
          vec3 bottom = mix(vec3(0.62, 0.78, 0.92), vec3(0.05, 0.07, 0.12), night);
          vec3 c = mix(top, bottom, smoothstep(0.05, 0.95, 1.0 - p.y));
          float d = p.x * 0.62 + (1.0 - p.y) * 0.78;
          float band1 = exp(-pow((d - 0.5) * 5.2, 2.0));
          float band2 = exp(-pow((d - 1.02) * 6.4, 2.0));
          vec3 warm = mix(vec3(1.0, 0.985, 0.92), vec3(0.16, 0.2, 0.3), night);
          return mix(c, warm, clamp(band1 * 0.85 + band2 * 0.6, 0.0, 1.0));
        }

        float saturateLuma(float x) { return clamp(x, 0.0, 1.0); }

        void main() {
          vec2 uv = gl_FragCoord.xy / uResolution;
          vec3 normal = normalize(vWorldNormal);
          vec3 eyeDir = normalize(vEyeDir);

          vec3 refractR = refract(eyeDir, normal, 1.0 / 1.15);
          vec3 refractG = refract(eyeDir, normal, 1.0 / 1.18);
          vec3 refractB = refract(eyeDir, normal, 1.0 / 1.22);
          vec3 color = vec3(0.0);
          for (int i = 0; i < 3; i++) {
            float slide = float(i) / 3.0 * 0.1;
            float offset = (REFRACT_POWER + slide) * CHROMATIC;
            color.r += sky(uv + refractR.xy * offset, uNight).r;
            color.g += sky(uv + refractG.xy * offset, uNight).g;
            color.b += sky(uv + refractB.xy * offset, uNight).b;
          }
          color /= 3.0;

          // saturation 1.2, brightness, gentle contrast
          vec3 luma = vec3(dot(color, vec3(0.2125, 0.7154, 0.0721)));
          color = mix(luma, color, 1.2);
          color *= mix(0.94, 1.15, uNight);
          color = (color - 0.5) * 0.92 + 0.5;

          // vertical Beer-Lambert tint: blue crowns, white baseline
          float yT = clamp((vLocalY - uTintYRange.x) / max(uTintYRange.y - uTintYRange.x, 1e-4), 0.0, 1.0);
          vec3 tint = mix(uTintBottom, uTintTop, yT);
          float ndotv = abs(dot(normal, eyeDir));
          float thickness = clamp(1.0 - ndotv, 0.0, 1.0);
          float tintAlpha = mix(0.92, 1.0, thickness);
          color = mix(color, color * clamp(tint, 0.001, 1.0), tintAlpha);

          // pointer-driven pin highlight
          vec3 lightVector = normalize(-uLight);
          vec3 halfVector = normalize(eyeDir + lightVector);
          float kSpec = pow(abs(dot(normal, halfVector)), SHININESS);
          float kDiff = max(0.0, dot(normal, lightVector)) * DIFFUSENESS;
          color += (kSpec + kDiff) * SPECULAR_STRENGTH;

          // directional fresnel rim
          float f = pow(1.0 - abs(dot(eyeDir, normal)), FRESNEL_POWER);
          float sideMask = smoothstep(-0.5, 0.5, dot(normal, FRESNEL_SIDE));
          color += f * sideMask * FRESNEL_STRENGTH;

          gl_FragColor = vec4(color, uOpacity);
        }
      `,
    });

    // Glass tubes along the true Pacifico stroke skeleton: one tube per
    // skeleton branch, a sphere cap on every branch end so the joints read
    // as one continuous blown-glass word. Letterform quality comes from the
    // typeface itself, not hand-tuned control points.
    const WORD_WORLD_WIDTH = 10.6;
    const TUBE_RADIUS = Math.max(0.17, MAKA_TUBE_RADIUS * WORD_WORLD_WIDTH * 1.08);
    const wordYValues = MAKA_TUBE_BRANCHES.flatMap((branch) => branch.map(([, y]) => y * WORD_WORLD_WIDTH));
    wordGlassUniforms.uTintYRange.value.set(
      Math.min(...wordYValues) - TUBE_RADIUS,
      Math.max(...wordYValues) + TUBE_RADIUS,
    );
    // Slightly oversized caps swallow the open tube rims — same-radius
    // spheres z-fight with the tube ends and read as stitched seams.
    const capGeometry = new THREE.SphereGeometry(TUBE_RADIUS * 1.045, 22, 22);
    for (const branch of MAKA_TUBE_BRANCHES) {
      if (branch.length < 2) continue;
      const points = branch.map(([x, y]) => new THREE.Vector3(
        x * WORD_WORLD_WIDTH,
        y * WORD_WORLD_WIDTH,
        0,
      ));
      const curve = new THREE.CatmullRomCurve3(points, false, "centripetal");
      const segments = Math.max(16, points.length * 7);
      const tube = new THREE.Mesh(
        new THREE.TubeGeometry(curve, segments, TUBE_RADIUS, 22, false),
        wordFaceMaterial,
      );
      tube.castShadow = true;
      tube.receiveShadow = true;
      tube.renderOrder = 2;
      wordmark.add(tube);
      for (const t of [0, 1]) {
        // Bake the endpoint into the cap geometry: the tint gradient reads
        // vertex-local Y, so a translated mesh would tint every cap as if it
        // sat at the word's midline.
        const capAt = capGeometry.clone();
        const end = curve.getPoint(t);
        capAt.translate(end.x, end.y, end.z);
        const cap = new THREE.Mesh(capAt, wordFaceMaterial);
        cap.castShadow = true;
        cap.renderOrder = 2;
        wordmark.add(cap);
      }
    }

    const dustPositions = new Float32Array(84 * 3);
    for (let index = 0; index < 84; index += 1) {
      const ratio = (index * 0.61803398875) % 1;
      dustPositions[index * 3] = -5.1 + ratio * 10.3;
      dustPositions[index * 3 + 1] = -2.0 + ((index * 0.41421356237) % 1) * 3.9;
      dustPositions[index * 3 + 2] = 0.18 + ((index * 0.73205080757) % 1) * 0.38;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    const wordDustMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.026,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const wordDust = new THREE.Points(dustGeometry, wordDustMaterial);
    wordDust.renderOrder = 5;
    wordmark.add(wordDust);

    const glintCanvas = document.createElement("canvas");
    glintCanvas.width = 160;
    glintCanvas.height = 160;
    const glintContext = glintCanvas.getContext("2d");
    if (glintContext) {
      const glow = glintContext.createRadialGradient(80, 80, 0, 80, 80, 76);
      glow.addColorStop(0, "rgba(255,255,255,1)");
      glow.addColorStop(0.08, "rgba(255,255,255,0.98)");
      glow.addColorStop(0.28, "rgba(220,240,255,0.38)");
      glow.addColorStop(1, "rgba(190,225,255,0)");
      glintContext.fillStyle = glow;
      glintContext.fillRect(0, 0, 160, 160);
      const ray = glintContext.createLinearGradient(0, 80, 160, 80);
      ray.addColorStop(0, "rgba(255,255,255,0)");
      ray.addColorStop(0.48, "rgba(255,255,255,0.08)");
      ray.addColorStop(0.5, "rgba(255,255,255,0.9)");
      ray.addColorStop(0.52, "rgba(255,255,255,0.08)");
      ray.addColorStop(1, "rgba(255,255,255,0)");
      glintContext.fillStyle = ray;
      glintContext.fillRect(0, 77, 160, 6);
      glintContext.save();
      glintContext.translate(80, 80);
      glintContext.rotate(Math.PI / 2);
      glintContext.translate(-80, -80);
      glintContext.fillRect(0, 78, 160, 4);
      glintContext.restore();
    }
    const glintTexture = new THREE.CanvasTexture(glintCanvas);
    glintTexture.colorSpace = THREE.SRGBColorSpace;
    // Anchors ride the tube crests: M arches, bowls, the k loop, and the
    // closing swash — where real glass would flare.
    // One glint per horizontal band, sitting on the highest tube crest in
    // that band — recomputed from the skeleton so they always ride the word.
    const GLINT_BANDS = 7;
    const bandTops: Array<{ x: number; y: number } | null> = Array.from({ length: GLINT_BANDS }, () => null);
    for (const branch of MAKA_TUBE_BRANCHES) {
      for (const [x, y] of branch) {
        const band = Math.min(GLINT_BANDS - 1, Math.max(0, Math.floor((x + 0.5) * GLINT_BANDS)));
        const current = bandTops[band];
        if (!current || y > current.y) bandTops[band] = { x, y };
      }
    }
    const glintAnchors = bandTops.flatMap((top, index) => top
      ? [new THREE.Vector3(top.x * WORD_WORLD_WIDTH, top.y * WORD_WORLD_WIDTH - 0.06, index % 2 ? 0.44 : 0.42)]
      : []);
    const wordGlints = glintAnchors.map((anchor, index) => {
      const material = new THREE.SpriteMaterial({
        map: glintTexture,
        color: index === 1 ? 0xfff8dc : 0xffffff,
        transparent: true,
        opacity: 0.62,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glint = new THREE.Sprite(material);
      glint.position.copy(anchor);
      glint.scale.setScalar(index % 3 === 1 ? 0.86 : 0.62);
      glint.renderOrder = 6;
      material.depthTest = false;
      wordmark.add(glint);
      return { glint, material, anchor, phase: index * 1.71 };
    });

    // Light spilling through the glass: long diagonal caustic streaks painted
    // once and mounted behind the word, echoing sunlit glass on a wall.
    const causticCanvas = document.createElement("canvas");
    causticCanvas.width = 512;
    causticCanvas.height = 512;
    const causticContext = causticCanvas.getContext("2d");
    if (causticContext) {
      causticContext.translate(256, 256);
      causticContext.rotate(-0.62);
      for (const [offset, width, alpha] of [
        [-158, 34, 0.34], [-92, 20, 0.24], [-30, 44, 0.42],
        [38, 24, 0.26], [104, 52, 0.38], [178, 26, 0.2],
      ] as const) {
        const band = causticContext.createLinearGradient(offset - width, 0, offset + width, 0);
        band.addColorStop(0, "rgba(255,255,255,0)");
        band.addColorStop(0.5, `rgba(236,247,255,${alpha})`);
        band.addColorStop(1, "rgba(255,255,255,0)");
        causticContext.fillStyle = band;
        causticContext.fillRect(offset - width, -420, width * 2, 840);
      }
    }
    const causticTexture = new THREE.CanvasTexture(causticCanvas);
    causticTexture.colorSpace = THREE.SRGBColorSpace;
    const causticMaterial = new THREE.SpriteMaterial({
      map: causticTexture,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const caustics = new THREE.Sprite(causticMaterial);
    caustics.position.set(0.55, -0.85, -0.6);
    caustics.scale.set(11.5, 7.2, 1);
    caustics.renderOrder = 0;
    wordmark.add(caustics);

    wordmark.position.set(-0.35, 0.5, 0.48);
    wordmark.rotation.set(-0.018, 0.028, -0.012);
    wordmark.scale.set(1, 0.98, 1.02);
    wordmark.visible = true;
    organism.add(wordmark);

    const task = new THREE.Mesh(new RoundedBoxGeometry(1.12, 1.12, 0.54, 5, 0.24), cobalt);
    task.position.set(-5.6, 0.42, 0.92);
    task.rotation.set(0.42, -0.34, -0.3);
    task.scale.setScalar(0.58);
    task.castShadow = true;
    satellites.add(task);

    const tool = new THREE.Group();
    const toolRing = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.17, 14, 56), ink);
    const toolPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 2), cobalt);
    tool.add(toolRing, toolPin);
    tool.position.set(6.55, 3.15, -0.3);
    tool.rotation.set(0.25, 0.5, 0.25);
    tool.scale.setScalar(0.56);
    toolRing.castShadow = true;
    satellites.add(tool);

    const artifact = new THREE.Group();
    const artifactBody = new THREE.Mesh(new RoundedBoxGeometry(1.24, 1.58, 0.16, 4, 0.12), glass);
    const artifactLineA = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.07, 0.035, 2, 0.03), cobalt);
    const artifactLineB = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.07, 0.035, 2, 0.03), ink);
    artifactLineA.position.set(-0.12, 0.26, 0.1);
    artifactLineB.position.set(-0.23, 0.02, 0.1);
    artifact.add(artifactBody, artifactLineA, artifactLineB);
    artifact.position.set(5.82, -2.55, 0.72);
    artifact.rotation.set(-0.16, 0.38, 0.14);
    artifact.scale.setScalar(0.65);
    artifactBody.castShadow = true;
    satellites.add(artifact);

    const recovery = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.17, 14, 56, Math.PI * 1.72),
      pearl,
    );
    recovery.position.set(-5.72, -2.72, 0.38);
    recovery.rotation.set(0.36, 0.26, 0.6);
    recovery.scale.setScalar(0.7);
    recovery.castShadow = true;
    satellites.add(recovery);

    const permission = new THREE.Group();
    const permissionSeal = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 8), permissionAmber);
    const keyHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 14), ink);
    const keyStem = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.34, 0.09, 3, 0.045), ink);
    permissionSeal.rotation.x = Math.PI / 2;
    keyHead.position.set(0, 0.1, 0.15);
    keyStem.position.set(0, -0.14, 0.15);
    permission.add(permissionSeal, keyHead, keyStem);
    permission.position.set(-4.9, 3.3, 0.5);
    permission.rotation.set(-0.1, 0.24, -0.16);
    permission.scale.setScalar(0.5);
    permissionSeal.castShadow = true;
    satellites.add(permission);

    const success = new THREE.Group();
    const successSeal = new THREE.Mesh(new THREE.CylinderGeometry(0.57, 0.57, 0.17, 24), successGreen);
    const checkShort = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.42, 0.09, 3, 0.045), ink);
    const checkLong = new THREE.Mesh(new RoundedBoxGeometry(0.13, 0.7, 0.09, 3, 0.045), ink);
    successSeal.rotation.x = Math.PI / 2;
    checkShort.position.set(-0.16, -0.04, 0.14);
    checkShort.rotation.z = 0.72;
    checkLong.position.set(0.12, 0.03, 0.14);
    checkLong.rotation.z = -0.63;
    success.add(successSeal, checkShort, checkLong);
    success.position.set(3.28, -3.06, 0.8);
    success.rotation.set(0.08, -0.22, 0.13);
    success.scale.setScalar(0.65);
    successSeal.castShadow = true;
    satellites.add(success);

    // A clean rounded pointer triangle (no tail, no notches): the classic
    // cursor silhouette with softly bowed sides and round corners.
    const cursorShape = new THREE.Shape();
    const tip = { x: 0, y: 0.78 };
    const left = { x: -0.6, y: -0.52 };
    const right = { x: 0.6, y: -0.52 };
    const corner = 0.16;
    cursorShape.moveTo(tip.x - corner * 0.62, tip.y - corner * 1.1);
    cursorShape.quadraticCurveTo(tip.x, tip.y, tip.x + corner * 0.62, tip.y - corner * 1.1);
    cursorShape.quadraticCurveTo(0.42, 0.12, right.x - corner * 0.4, right.y + corner * 1.2);
    cursorShape.quadraticCurveTo(right.x, right.y, right.x - corner * 1.1, right.y - corner * 0.18);
    cursorShape.quadraticCurveTo(0, -0.4, left.x + corner * 1.1, left.y - corner * 0.18);
    cursorShape.quadraticCurveTo(left.x, left.y, left.x + corner * 0.4, left.y + corner * 1.2);
    cursorShape.quadraticCurveTo(-0.42, 0.12, tip.x - corner * 0.62, tip.y - corner * 1.1);
    cursorShape.closePath();
    const cursorGeometry = new THREE.ExtrudeGeometry(cursorShape, {
      depth: 0.22,
      curveSegments: 18,
      bevelEnabled: true,
      bevelSegments: 6,
      bevelSize: 0.09,
      bevelThickness: 0.08,
    });
    cursorGeometry.center();
    const cursorBlue = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#2e6bff"),
      metalness: 0.04,
      roughness: 0.22,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      emissive: new THREE.Color("#0a2f8a"),
      emissiveIntensity: 0.12,
    });
    const cursor = new THREE.Mesh(cursorGeometry, cursorBlue);
    cursor.scale.setScalar(0.55);
    cursor.rotation.set(0.12, -0.16, -0.5);
    cursor.position.set(4.72, -1.08, -0.72);
    cursor.visible = window.innerWidth >= 768;
    cursor.castShadow = true;
    scene.add(cursor);

    const makeStickerTexture = (kind: "seal" | "eyes" | "heart") => {
      const stickerCanvas = document.createElement("canvas");
      stickerCanvas.width = 384;
      stickerCanvas.height = 384;
      const context = stickerCanvas.getContext("2d");
      if (context) {
        context.translate(192, 192);
        if (kind === "seal") {
          context.fillStyle = "#fff4c9";
          context.strokeStyle = "#111722";
          context.lineWidth = 8;
          context.beginPath();
          context.arc(0, 0, 144, 0, Math.PI * 2);
          context.fill();
          context.stroke();
          context.lineWidth = 3;
          context.beginPath();
          context.arc(0, 0, 116, 0, Math.PI * 2);
          context.stroke();
          context.fillStyle = "#111722";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.font = "700 30px ui-monospace, monospace";
          context.fillText("LOCAL / FIRST", 0, -72);
          context.font = "900 72px system-ui, sans-serif";
          context.fillText("M", 0, -2);
          context.font = "700 28px ui-monospace, monospace";
          context.fillText("MAKA AGENT", 0, 76);
          context.beginPath();
          context.moveTo(-72, 42);
          context.lineTo(72, -42);
          context.stroke();
        } else if (kind === "eyes") {
          // Googly-eyes sticker: white die-cut blob, two side-glancing pupils.
          context.rotate(-0.14);
          context.fillStyle = "#fbfcf8";
          context.strokeStyle = "#141a24";
          context.lineWidth = 9;
          const blob = new Path2D();
          blob.ellipse(-62, 0, 78, 96, 0.16, 0, Math.PI * 2);
          blob.ellipse(62, 0, 78, 96, -0.16, 0, Math.PI * 2);
          context.fill(blob);
          context.stroke(blob);
          for (const side of [-1, 1] as const) {
            context.fillStyle = "#ffffff";
            context.strokeStyle = "#141a24";
            context.lineWidth = 7;
            context.beginPath();
            context.ellipse(side * 62, 0, 58, 76, side * -0.16, 0, Math.PI * 2);
            context.fill();
            context.stroke();
            context.fillStyle = "#141a24";
            context.beginPath();
            context.ellipse(side * 62 - 24, 14, 26, 34, side * -0.16, 0, Math.PI * 2);
            context.fill();
            context.fillStyle = "#ffffff";
            context.beginPath();
            context.ellipse(side * 62 - 34, -2, 8, 11, 0, 0, Math.PI * 2);
            context.fill();
          }
        } else if (kind === "heart") {
          // Puffy pink heart with a die-cut white edge and a soft top light.
          context.rotate(-0.2);
          const heart = new Path2D();
          heart.moveTo(0, 108);
          heart.bezierCurveTo(-132, 22, -108, -96, -6, -44);
          heart.bezierCurveTo(4, -50, 10, -50, 18, -44);
          heart.bezierCurveTo(120, -96, 132, 22, 0, 108);
          context.lineWidth = 26;
          context.strokeStyle = "#ffffff";
          context.stroke(heart);
          context.fillStyle = "#ff86a8";
          context.fill(heart);
          const sheen = context.createLinearGradient(0, -60, 0, 100);
          sheen.addColorStop(0, "rgba(255,255,255,0.55)");
          sheen.addColorStop(0.45, "rgba(255,255,255,0)");
          context.fillStyle = sheen;
          context.fill(heart);
        }
      }
      const texture = new THREE.CanvasTexture(stickerCanvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      return texture;
    };
    const sealStickerMaterial = new THREE.SpriteMaterial({
      map: makeStickerTexture("seal"),
      transparent: true,
      depthWrite: false,
    });
    // Perimeter placement: the seal may kiss the sculpture, never the copy.
    // The former "OPEN SOURCE" sticker is gone — it repeated the primary CTA.
    const sealSticker = new THREE.Sprite(sealStickerMaterial);
    sealSticker.position.set(-1.9, 3.05, -0.38);
    sealSticker.scale.set(1.3, 1.3, 1);
    sealSticker.renderOrder = 0;
    const eyesStickerMaterial = new THREE.SpriteMaterial({
      map: makeStickerTexture("eyes"),
      transparent: true,
      depthWrite: false,
    });
    const eyesSticker = new THREE.Sprite(eyesStickerMaterial);
    eyesSticker.position.set(-6.1, 1.1, -0.3);
    eyesSticker.scale.set(1.05, 1.05, 1);
    eyesSticker.renderOrder = 0;
    const heartStickerMaterial = new THREE.SpriteMaterial({
      map: makeStickerTexture("heart"),
      transparent: true,
      depthWrite: false,
    });
    const heartSticker = new THREE.Sprite(heartStickerMaterial);
    heartSticker.position.set(-6.55, -0.7, -0.2);
    heartSticker.scale.set(0.95, 0.95, 1);
    heartSticker.renderOrder = 0;
    satellites.add(sealSticker, eyesSticker, heartSticker);

    const nodeGeometry = new THREE.SphereGeometry(0.115, 14, 14);
    const nodes = Array.from({ length: 9 }, (_, index) => {
      const node = new THREE.Mesh(nodeGeometry, index % 3 === 0 ? cobalt : ink);
      const angle = (index / 9) * Math.PI * 2;
      node.position.set(Math.cos(angle) * (5.1 + (index % 2) * 0.55), Math.sin(angle) * 2.7, -0.6 + (index % 3) * 0.35);
      satellites.add(node);
      return node;
    });
    task.visible = false;
    recovery.visible = false;
    success.visible = false;
    // The mockup direction keeps the field light: flat stickers and one
    // pointer sculpture instead of heavy solid props.
    tool.visible = false;
    permission.visible = false;
    artifact.visible = false;
    nodes.forEach((node) => { node.visible = false; });

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 6.4),
      new THREE.ShadowMaterial({ color: "#2c6095", opacity: 0.038 }),
    );
    shadow.position.set(0, -3.25, -0.8);
    shadow.rotation.x = -Math.PI / 2;
    shadow.receiveShadow = true;
    organism.add(shadow);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x78a8d8, 0.5));

    const key = new THREE.DirectionalLight(0xffffff, 0.48);
    key.position.set(-4, 8, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x4b9eff, 0.62);
    rim.position.set(8, -1, 7);
    scene.add(rim);

    const warmFill = new THREE.PointLight(0xfff1cf, 0.46, 13, 1.7);
    warmFill.position.set(-5.5, 3.8, 5.5);
    scene.add(warmFill);

    const frontFill = new THREE.DirectionalLight(0xaedcff, 0.42);
    frontFill.position.set(-1, -4, 10);
    scene.add(frontFill);

    const pointerLight = new THREE.PointLight(0xd9efff, 0.86, 28, 1.45);
    pointerLight.position.set(0, 1, 7);
    scene.add(pointerLight);

    const sweepLight = new THREE.PointLight(0xf4fbff, 0.72, 8.5, 1.55);
    const returnLight = new THREE.PointLight(0x4b9fff, 0.46, 8, 1.7);
    sweepLight.position.set(-7, 0.8, 4.8);
    returnLight.position.set(7, -0.4, 3.8);
    scene.add(sweepLight, returnLight);

    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();
    const previousPointerTarget = new THREE.Vector2();
    const pointerVelocity = new THREE.Vector2();
    const pointerVelocityTarget = new THREE.Vector2();
    const worldPosition = new THREE.Vector3(0.75, 0.28, 0);
    const worldPositionTarget = worldPosition.clone();
    const worldScaleTarget = new THREE.Vector3(1, 1, 1);
    const cursorTarget = cursor.position.clone();
    const raycaster = new THREE.Raycaster();
    const pointerPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.2);
    const intersection = new THREE.Vector3();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startedAt = performance.now();
    let lastFrameAt = startedAt;
    let stateIndex = 0;
    let frame = 0;
    let visible = true;
    let pointerEngaged = false;
    let pointerInShell = false;

    const updateCursorVisibility = () => {
      cursor.visible = window.innerWidth >= 768 && stateIndex === 0 && pointerEngaged && !pointerInShell;
      canvas.dataset.cursorState = cursor.visible ? "active" : "suppressed";
    };

    const materialTargets = { pearl: 1, word: 1, glass: 0.76, cobalt: 0.94, ink: 0.88, amber: 0.9, green: 0.88, atmosphere: 1 };

    const parallaxObjects = [
      { object: task, depth: 1.08, x: 0.62, y: 0.38, drift: 0.10, phase: 0.2 },
      { object: tool, depth: 0.72, x: -0.46, y: 0.31, drift: 0.07, phase: 1.4 },
      { object: artifact, depth: 1.28, x: 0.82, y: -0.48, drift: 0.12, phase: 2.1 },
      { object: recovery, depth: 0.54, x: -0.34, y: -0.26, drift: 0.08, phase: 3.2 },
      { object: permission, depth: 1.5, x: -0.88, y: 0.56, drift: 0.13, phase: 4.1 },
      { object: success, depth: 0.92, x: 0.5, y: -0.4, drift: 0.09, phase: 5.3 },
      { object: sealSticker, depth: 0.82, x: -0.32, y: 0.26, drift: 0.05, phase: 2.8 },
      { object: eyesSticker, depth: 0.7, x: 0.3, y: 0.22, drift: 0.05, phase: 1.1 },
      { object: heartSticker, depth: 0.9, x: 0.36, y: -0.24, drift: 0.06, phase: 3.7 },
      ...nodes.map((object, index) => ({
        object,
        depth: 0.26 + (index % 3) * 0.2,
        x: (index % 2 ? -1 : 1) * (0.14 + (index % 3) * 0.05),
        y: (index % 2 ? 1 : -1) * 0.12,
        drift: 0.025,
        phase: index * 0.72,
      })),
    ].map((item) => ({ ...item, base: item.object.position.clone() }));

    const desiredObjectPosition = new THREE.Vector3();
    const desiredWorldRotation = new THREE.Vector2();
    const dampVector3 = (current: THREE.Vector3, target: THREE.Vector3, lambda: number, delta: number) => {
      current.x = THREE.MathUtils.damp(current.x, target.x, lambda, delta);
      current.y = THREE.MathUtils.damp(current.y, target.y, lambda, delta);
      current.z = THREE.MathUtils.damp(current.z, target.z, lambda, delta);
    };

    const applyState = (index: number) => {
      stateIndex = index;
      world.visible = index === 0;
      canvas.dataset.sceneState = index === 0 ? "wordmark" : "suppressed";
      recovery.visible = false;
      if (index === 0) {
        const compact = canvas.clientWidth < 768;
        const medium = canvas.clientWidth < 1100;
        const compactShort = compact && canvas.clientHeight < 700;
        worldPositionTarget.set(compact ? 0.65 : medium ? 1.3 : 0.75, compactShort ? 1.8 : compact ? 0.46 : 0.28, 0);
        worldScaleTarget.setScalar(1);
        materialTargets.pearl = 1;
        materialTargets.word = 1;
        materialTargets.glass = 0.76;
        materialTargets.cobalt = 0.94;
        materialTargets.ink = 0.88;
        materialTargets.amber = 0.9;
        materialTargets.green = 0.88;
        materialTargets.atmosphere = 1;
      } else if (index === 1) {
        worldPositionTarget.set(-13.2, 2.8, -4.4);
        worldScaleTarget.setScalar(0.34);
        materialTargets.pearl = 0;
        materialTargets.word = 0;
        materialTargets.glass = 0;
        materialTargets.cobalt = 0;
        materialTargets.ink = 0;
        materialTargets.amber = 0;
        materialTargets.green = 0;
        materialTargets.atmosphere = 0;
      } else {
        worldPositionTarget.set(1.8, 0.1, -1.3);
        worldScaleTarget.setScalar(0.78);
        materialTargets.pearl = 0;
        materialTargets.word = 0;
        materialTargets.glass = 0;
        materialTargets.cobalt = 0;
        materialTargets.ink = 0;
        materialTargets.amber = 0;
        materialTargets.green = 0;
        materialTargets.atmosphere = 0;
      }

      for (const material of [pearl, cobalt, ink, permissionAmber, successGreen]) material.transparent = index !== 0;
      updateCursorVisibility();
      if (reduceMotion) {
        world.position.copy(worldPositionTarget);
        world.scale.copy(worldScaleTarget);
        pearl.opacity = materialTargets.pearl;
        wordGlassUniforms.uOpacity.value = materialTargets.word;
        causticMaterial.opacity = materialTargets.word * 0.3;
        glass.opacity = materialTargets.glass;
        cobalt.opacity = materialTargets.cobalt;
        ink.opacity = materialTargets.ink;
        permissionAmber.opacity = materialTargets.amber;
        successGreen.opacity = materialTargets.green;
        atmosphereUniforms.uMakaIntensity.value = materialTargets.atmosphere * atmosphereNightScale;
        renderer.render(scene, camera);
      }
    };

    window.addEventListener("maka:viewchange", ((event: CustomEvent<{ index: number }>) => {
      applyState(event.detail.index);
    }) as EventListener);

    const inkDayColor = ink.color.clone();
    const inkNightColor = new THREE.Color("#8fa2c4");
    const applyTheme = (night: boolean) => {
      // Clear glass lives on reflections: keep the environment hot enough for
      // bright speculars in both themes.
      renderer.toneMappingExposure = night ? 0.5 : 0.62;
      scene.environmentIntensity = night ? 0.62 : 0.88;
      ink.color.copy(night ? inkNightColor : inkDayColor);
      wordGlassUniforms.uNight.value = night ? 1 : 0;
      atmosphereNightScale = night ? 0.55 : 1;
      if (reduceMotion) renderer.render(scene, camera);
    };
    window.addEventListener("maka:themechange", ((event: CustomEvent<{ night: boolean }>) => {
      applyTheme(event.detail.night);
    }) as EventListener);
    applyTheme(root.dataset.theme === "night");

    window.addEventListener("maka:pointer", ((event: CustomEvent<{
      x: number;
      y: number;
      normalizedX: number;
      normalizedY: number;
      pointerType: string;
    }>) => {
      const { x, y, normalizedX, normalizedY, pointerType } = event.detail;
      if (pointerType !== "touch") pointerEngaged = true;
      pointerInShell = y < 72 || y > window.innerHeight - 44;
      updateCursorVisibility();
      pointerTarget.set(normalizedX, normalizedY);
      canvas.dataset.pointerX = String(Math.round(x));
      canvas.dataset.pointerY = String(Math.round(y));
      if (reduceMotion) renderer.render(scene, camera);
    }) as EventListener);

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, width < 768 ? 1.35 : 1.7));
      renderer.setSize(width, height, false);
      renderer.getDrawingBufferSize(wordGlassUniforms.uResolution.value);
      camera.aspect = width / height;
      atmosphereUniforms.uMakaAspect.value = width / height;
      camera.fov = width < 768 ? 43 : width < 1100 ? 36 : 30;
      camera.position.z = width < 768 ? 20 : 18;
      camera.updateProjectionMatrix();
      const compact = width < 768;
      const medium = width < 1100;
      const compactShort = compact && height < 700;
      organism.scale.setScalar(compactShort ? 0.64 : compact ? 0.62 : medium ? 0.8 : 1);
      satellites.scale.setScalar(compactShort ? 0.58 : compact ? 0.64 : 1);
      if (stateIndex === 0) {
        worldPositionTarget.set(compact ? 0.65 : medium ? 1.3 : 0.75, compactShort ? 1.8 : compact ? 0.46 : 0.28, 0);
      }
      updateCursorVisibility();
      renderer.render(scene, camera);
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

      pointerVelocityTarget.copy(pointerTarget).sub(previousPointerTarget).multiplyScalar(1 / delta);
      pointerVelocityTarget.clampScalar(-7, 7);
      previousPointerTarget.copy(pointerTarget);
      pointerVelocity.x = THREE.MathUtils.damp(pointerVelocity.x, pointerVelocityTarget.x, 10, delta);
      pointerVelocity.y = THREE.MathUtils.damp(pointerVelocity.y, pointerVelocityTarget.y, 10, delta);
      pointer.x = THREE.MathUtils.damp(pointer.x, pointerTarget.x, 7, delta);
      pointer.y = THREE.MathUtils.damp(pointer.y, pointerTarget.y, 7, delta);
      dampVector3(world.position, worldPositionTarget, 6.4, delta);
      dampVector3(world.scale, worldScaleTarget, 6.4, delta);

      desiredWorldRotation.set(pointer.y * 0.075, pointer.x * 0.13);
      world.rotation.x = THREE.MathUtils.damp(world.rotation.x, desiredWorldRotation.x, 5.2, delta);
      world.rotation.y = THREE.MathUtils.damp(world.rotation.y, desiredWorldRotation.y, 5.2, delta);
      organism.position.x = THREE.MathUtils.damp(organism.position.x, pointer.x * 0.2, 5.5, delta);
      organism.position.y = THREE.MathUtils.damp(organism.position.y, pointer.y * 0.12 + Math.sin(elapsed * 0.55) * 0.07, 5.5, delta);
      const velocityDepth = Math.min(1, pointerVelocity.length() * 0.12);
      for (const item of parallaxObjects) {
        desiredObjectPosition.set(
          item.base.x + pointer.x * item.x,
          item.base.y + pointer.y * item.y + Math.sin(elapsed * (0.32 + item.depth * 0.035) + item.phase) * item.drift,
          item.base.z + pointer.x * pointer.y * item.depth * 0.08 + velocityDepth * item.depth * 0.15,
        );
        dampVector3(item.object.position, desiredObjectPosition, 4.1 + item.depth * 1.2, delta);
      }

      pointerLight.position.x = THREE.MathUtils.damp(pointerLight.position.x, pointer.x * 7, 9, delta);
      pointerLight.position.y = THREE.MathUtils.damp(pointerLight.position.y, pointer.y * 4.5, 9, delta);
      if (pointerEngaged) {
        raycaster.setFromCamera(pointer, camera);
        if (raycaster.ray.intersectPlane(pointerPlane, intersection)) {
          cursorTarget.copy(intersection);
          // Keep the pointer sculpture behind the word so it can participate
          // in the scene without masking the final "a" or any terminal.
          cursorTarget.z = -0.72;
        }
      }
      dampVector3(cursor.position, cursorTarget, 9.5, delta);
      cursor.rotation.x = THREE.MathUtils.damp(cursor.rotation.x, 0.12 + pointerVelocity.y * 0.018, 12, delta);
      cursor.rotation.y = THREE.MathUtils.damp(cursor.rotation.y, -0.16 - pointerVelocity.x * 0.025, 12, delta);
      cursor.rotation.z = THREE.MathUtils.damp(cursor.rotation.z, 0.05 - pointerVelocity.x * 0.045, 12, delta);
      const cursorSpeed = Math.min(1, pointerVelocity.length() * 0.18);
      // The pointer sculpture never crosses the glass word: seen through the
      // transparent tubes it reads as a glyph defect, so it shrinks away
      // whenever its target enters the word's bounding box.
      const overWord = Math.abs(cursorTarget.x + 0.35) < 6.2 && Math.abs(cursorTarget.y - 0.05) < 2.7;
      const cursorScale = overWord ? 0.001 : 0.6;
      cursor.scale.x = THREE.MathUtils.damp(cursor.scale.x, cursorScale * (1 + cursorSpeed * 0.13), 13, delta);
      cursor.scale.y = THREE.MathUtils.damp(cursor.scale.y, cursorScale * (1 - cursorSpeed * 0.09), 13, delta);
      cursor.scale.z = THREE.MathUtils.damp(cursor.scale.z, cursorScale, 13, delta);

      wordmark.rotation.x = THREE.MathUtils.damp(wordmark.rotation.x, -0.018 + pointer.y * 0.014, 4.8, delta);
      wordmark.rotation.y = THREE.MathUtils.damp(wordmark.rotation.y, 0.028 + pointer.x * 0.016, 4.8, delta);
      wordmark.rotation.z = -0.012;
      wordDust.rotation.z = Math.sin(elapsed * 0.18) * 0.004;
      wordGlints.forEach(({ glint, material, anchor, phase }, index) => {
        const pulse = Math.pow(0.5 + 0.5 * Math.sin(elapsed * 1.42 + phase), 5.0);
        glint.position.copy(anchor);
        glint.position.x += Math.sin(elapsed * 0.38 + phase) * 0.48 + pointer.x * 0.16;
        glint.position.y += Math.cos(elapsed * 0.31 + phase) * 0.12 + pointer.y * 0.08;
        glint.scale.setScalar((index % 3 === 1 ? 0.98 : 0.74) + pulse * 0.28);
        material.opacity = 0.85 + pulse * 0.15;
      });
      sweepLight.position.x = -7.1 + ((elapsed * 1.42 + pointer.x * 0.8 + 20) % 14.2);
      sweepLight.position.y = 0.5 + Math.sin(elapsed * 0.84) * 1.2 + pointer.y * 0.72;
      returnLight.position.x = 7.2 - ((elapsed * 0.58 + 12) % 14.4);
      returnLight.position.y = -0.35 + Math.cos(elapsed * 0.58) * 0.9;
      task.rotation.y = -0.34 + elapsed * 0.22;
      tool.rotation.y = 0.5 - elapsed * 0.2;
      artifact.rotation.y = 0.38 + Math.sin(elapsed * 0.42) * 0.22;
      sealStickerMaterial.rotation = Math.sin(elapsed * 0.28) * 0.045;
      eyesStickerMaterial.rotation = -0.06 + Math.sin(elapsed * 0.34) * 0.04;
      heartStickerMaterial.rotation = 0.05 + Math.cos(elapsed * 0.26) * 0.05;
      causticMaterial.rotation = Math.sin(elapsed * 0.11) * 0.02;
      recovery.rotation.z = 0.6 - elapsed * 0.26;
      permission.rotation.z = -0.16 + Math.sin(elapsed * 0.48) * 0.14;
      success.rotation.z = 0.13 - Math.sin(elapsed * 0.4) * 0.11;
      nodes.forEach((node, index) => node.scale.setScalar(0.64 + Math.sin(elapsed * 1.4 + index) * 0.12));

      if (pearlShader) pearlShader.uniforms.uMakaTime.value = elapsed;
      atmosphereUniforms.uMakaTime.value = elapsed;
      atmosphereUniforms.uMakaPointer.value.copy(pointer);
      atmosphereUniforms.uMakaVelocity.value.copy(pointerVelocity);
      atmosphereUniforms.uMakaIntensity.value = THREE.MathUtils.damp(
        atmosphereUniforms.uMakaIntensity.value,
        materialTargets.atmosphere * atmosphereNightScale,
        6,
        delta,
      );

      pearl.opacity = THREE.MathUtils.damp(pearl.opacity, materialTargets.pearl, 7, delta);
      wordGlassUniforms.uOpacity.value = THREE.MathUtils.damp(wordGlassUniforms.uOpacity.value, materialTargets.word, 7, delta);
      wordGlassUniforms.uLight.value.set(pointer.x * 5 + 0.6, pointer.y * 3 + 0.9, 0.5);
      wordDustMaterial.opacity = THREE.MathUtils.damp(wordDustMaterial.opacity, materialTargets.word * 0.34, 7, delta);
      causticMaterial.opacity = THREE.MathUtils.damp(causticMaterial.opacity, materialTargets.word * 0.3, 7, delta);
      glass.opacity = THREE.MathUtils.damp(glass.opacity, materialTargets.glass, 7, delta);
      cobalt.opacity = THREE.MathUtils.damp(cobalt.opacity, materialTargets.cobalt, 7, delta);
      ink.opacity = THREE.MathUtils.damp(ink.opacity, materialTargets.ink, 7, delta);
      permissionAmber.opacity = THREE.MathUtils.damp(permissionAmber.opacity, materialTargets.amber, 7, delta);
      successGreen.opacity = THREE.MathUtils.damp(successGreen.opacity, materialTargets.green, 7, delta);

      renderer.render(scene, camera);
    };

    document.addEventListener("visibilitychange", () => {
      visible = !document.hidden;
      if (visible && !reduceMotion && !frame) animate();
    });

    new ResizeObserver(resize).observe(canvas);
    applyState(Math.max(0, ["overview", "product", "runtime", "surfaces"].indexOf(document.querySelector<HTMLElement>(".stage")?.dataset.view ?? "overview")));
    resize();

    const ready = async () => {
      try {
        await renderer.compileAsync(scene, camera);
      } finally {
        document.documentElement.dataset.field = "ready";
        revealBoot(reduceMotion);
        if (reduceMotion) renderer.render(scene, camera);
        else animate();
      }
    };

    void ready();
  } catch (error) {
    console.warn("Maka execution field unavailable", error);
    document.documentElement.dataset.field = "unavailable";
    clearBootFallback();
    document.documentElement.dataset.boot = "complete";
  }
}
