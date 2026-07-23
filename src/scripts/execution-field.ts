import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { SVGLoader } from "three/addons/loaders/SVGLoader.js";
import { MAKA_WORDMARK_PATH } from "./maka-wordmark-path";

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
          float alpha = clamp((whiteBand * 0.34 + pearlBand * 0.22 + blueBand * 0.13 + centerBloom * 0.025 + velocityTrail * 0.08) * uMakaIntensity, 0.0, 0.42);
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

    const svgLoader = new SVGLoader();
    const svgDocument = svgLoader.parse(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 -125 360 155"><path fill="#fff" d="${MAKA_WORDMARK_PATH}"/></svg>`,
    );
    const wordShapes = svgDocument.paths.flatMap((path) => SVGLoader.createShapes(path));
    const wordmark = new THREE.Group();
    const wordShape = new THREE.Group();

    // Unlike the old constant-radius tube, this is a real calligraphic solid:
    // the face carries the letter rhythm, while the deep rounded bevel creates
    // a soft silhouette, side walls, thickness, and readable counters.
    // Frosted, milky glass: the word should read as a calm background
    // sculpture (reference-grade restraint), not glossy inflatable candy.
    // Identity comes from the silhouette; the material stays quiet.
    const wordFaceMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#b7d7ee"),
      metalness: 0,
      roughness: 0.46,
      transmission: 0.52,
      thickness: 0.92,
      ior: 1.28,
      clearcoat: 0.22,
      clearcoatRoughness: 0.32,
      attenuationColor: new THREE.Color("#cfe6f6"),
      attenuationDistance: 2.4,
      iridescence: 0,
      specularIntensity: 0.34,
      specularColor: new THREE.Color("#ffffff"),
      transparent: true,
      opacity: 0.88,
    });
    const wordEdgeMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#79aed6"),
      metalness: 0,
      roughness: 0.4,
      transmission: 0.34,
      thickness: 1.25,
      ior: 1.3,
      clearcoat: 0.3,
      clearcoatRoughness: 0.26,
      attenuationColor: new THREE.Color("#8ec2e4"),
      attenuationDistance: 1.9,
      iridescence: 0,
      specularIntensity: 0.4,
      specularColor: new THREE.Color("#f7fcff"),
      transparent: true,
      opacity: 0.84,
    });
    const wordRimMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#d9f2ff"),
      transparent: true,
      opacity: 0.045,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const wordGlowMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#f9fdff"),
      transparent: true,
      opacity: 0.012,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    for (const [shapeIndex, shape] of wordShapes.entries()) {
      // Bevel reduced ~30% and depth ~20% versus the candy iteration: softness
      // stays, the inflatable-balloon signal goes.
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: 9.6,
        curveSegments: 20,
        steps: 1,
        bevelEnabled: true,
        bevelSegments: 10,
        bevelSize: 4.6,
        bevelThickness: 3.9,
        bevelOffset: -0.8,
      });
      geometry.computeVertexNormals();
      const solid = new THREE.Mesh(geometry, [wordFaceMaterial, wordEdgeMaterial]);
      const glyphYScale = shapeIndex === 2 ? 0.66 : 1;
      solid.scale.y = glyphYScale;
      solid.castShadow = true;
      solid.receiveShadow = true;
      solid.renderOrder = 2;
      wordShape.add(solid);

      const rimShell = new THREE.Mesh(geometry, wordRimMaterial);
      rimShell.scale.set(1.004, glyphYScale * 1.004, 1.026);
      rimShell.renderOrder = 3;
      wordShape.add(rimShell);

      const innerGlow = new THREE.Mesh(geometry, wordGlowMaterial);
      innerGlow.scale.set(0.985, glyphYScale * 0.985, 0.88);
      innerGlow.position.z += 0.8;
      innerGlow.renderOrder = 1;
      wordShape.add(innerGlow);
    }

    // The source outline uses SVG coordinates. Flip it upright, center it in
    // world space, and leave enough Z depth for visible beveled side walls.
    wordShape.scale.set(0.0245, -0.033, 0.027);
    wordShape.position.set(-4.2, -1.55, -0.12);
    wordmark.add(wordShape);

    const dustPositions = new Float32Array(84 * 3);
    for (let index = 0; index < 84; index += 1) {
      const ratio = (index * 0.61803398875) % 1;
      dustPositions[index * 3] = -4.7 + ratio * 9.7;
      dustPositions[index * 3 + 1] = -1.75 + ((index * 0.41421356237) % 1) * 3.7;
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
    const glintAnchors = [
      new THREE.Vector3(-3.7, -0.72, 0.39),
      new THREE.Vector3(-1.35, -0.5, 0.42),
      new THREE.Vector3(1.05, 0.66, 0.4),
      new THREE.Vector3(3.2, -0.42, 0.42),
    ];
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
      glint.scale.setScalar(index === 2 ? 0.95 : 0.72);
      glint.renderOrder = 6;
      wordmark.add(glint);
      return { glint, material, anchor, phase: index * 1.71 };
    });

    wordmark.position.set(-0.85, -0.32, 0.48);
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

    const cursorShape = new THREE.Shape();
    cursorShape.moveTo(0.68, 0.68);
    cursorShape.lineTo(-0.58, 0.2);
    cursorShape.lineTo(-0.12, -0.05);
    cursorShape.lineTo(-0.36, -0.58);
    cursorShape.lineTo(-0.04, -0.72);
    cursorShape.lineTo(0.2, -0.18);
    cursorShape.lineTo(0.5, 0.02);
    cursorShape.closePath();
    const cursorGeometry = new THREE.ExtrudeGeometry(cursorShape, {
      depth: 0.2,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: 0.07,
      bevelThickness: 0.06,
    });
    cursorGeometry.center();
    const cursor = new THREE.Mesh(cursorGeometry, cobalt);
    cursor.scale.setScalar(0.55);
    cursor.rotation.set(0.12, -0.16, 0.05);
    cursor.position.set(4.72, -1.08, -0.72);
    cursor.visible = window.innerWidth >= 768;
    cursor.castShadow = true;
    scene.add(cursor);

    const makeStickerTexture = (kind: "seal") => {
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
    sealSticker.position.set(6.05, -0.4, -0.38);
    sealSticker.scale.set(1.5, 1.5, 1);
    sealSticker.renderOrder = 0;
    satellites.add(sealSticker);

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
        wordFaceMaterial.opacity = materialTargets.word;
        wordEdgeMaterial.opacity = materialTargets.word;
        wordRimMaterial.opacity = materialTargets.word * 0.045;
        wordGlowMaterial.opacity = materialTargets.word * 0.012;
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
      renderer.toneMappingExposure = night ? 0.48 : 0.58;
      scene.environmentIntensity = night ? 0.58 : 0.78;
      ink.color.copy(night ? inkNightColor : inkDayColor);
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
      cursor.scale.x = THREE.MathUtils.damp(cursor.scale.x, 0.6 * (1 + cursorSpeed * 0.13), 13, delta);
      cursor.scale.y = THREE.MathUtils.damp(cursor.scale.y, 0.6 * (1 - cursorSpeed * 0.09), 13, delta);
      cursor.scale.z = THREE.MathUtils.damp(cursor.scale.z, 0.6, 13, delta);

      wordmark.rotation.x = THREE.MathUtils.damp(wordmark.rotation.x, -0.018 + pointer.y * 0.014, 4.8, delta);
      wordmark.rotation.y = THREE.MathUtils.damp(wordmark.rotation.y, 0.028 + pointer.x * 0.016, 4.8, delta);
      wordmark.rotation.z = -0.012;
      wordDust.rotation.z = Math.sin(elapsed * 0.18) * 0.004;
      wordGlints.forEach(({ glint, material, anchor, phase }, index) => {
        const pulse = Math.pow(0.5 + 0.5 * Math.sin(elapsed * 1.42 + phase), 5.0);
        glint.position.copy(anchor);
        glint.position.x += Math.sin(elapsed * 0.38 + phase) * 0.48 + pointer.x * 0.16;
        glint.position.y += Math.cos(elapsed * 0.31 + phase) * 0.12 + pointer.y * 0.08;
        glint.scale.setScalar((index === 2 ? 0.4 : 0.3) + pulse * 0.36);
        material.opacity = 0.025 + pulse * 0.38;
      });
      sweepLight.position.x = -7.1 + ((elapsed * 1.42 + pointer.x * 0.8 + 20) % 14.2);
      sweepLight.position.y = 0.5 + Math.sin(elapsed * 0.84) * 1.2 + pointer.y * 0.72;
      returnLight.position.x = 7.2 - ((elapsed * 0.58 + 12) % 14.4);
      returnLight.position.y = -0.35 + Math.cos(elapsed * 0.58) * 0.9;
      task.rotation.y = -0.34 + elapsed * 0.22;
      tool.rotation.y = 0.5 - elapsed * 0.2;
      artifact.rotation.y = 0.38 + Math.sin(elapsed * 0.42) * 0.22;
      sealStickerMaterial.rotation = Math.sin(elapsed * 0.28) * 0.045;
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
      wordFaceMaterial.opacity = THREE.MathUtils.damp(wordFaceMaterial.opacity, materialTargets.word, 7, delta);
      wordEdgeMaterial.opacity = THREE.MathUtils.damp(wordEdgeMaterial.opacity, materialTargets.word, 7, delta);
      wordRimMaterial.opacity = THREE.MathUtils.damp(wordRimMaterial.opacity, materialTargets.word * 0.045, 7, delta);
      wordGlowMaterial.opacity = THREE.MathUtils.damp(wordGlowMaterial.opacity, materialTargets.word * 0.012, 7, delta);
      wordDustMaterial.opacity = THREE.MathUtils.damp(wordDustMaterial.opacity, materialTargets.word * 0.34, 7, delta);
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
