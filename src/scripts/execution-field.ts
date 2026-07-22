import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const canvas = document.querySelector<HTMLCanvasElement>("#execution-field");
const root = document.documentElement;
const clearBootFallback = () => {
  const timeout = Number.parseInt(root.dataset.bootTimeout ?? "", 10);
  if (Number.isFinite(timeout)) window.clearTimeout(timeout);
  delete root.dataset.bootTimeout;
};
const revealBoot = (reduceMotion: boolean) => {
  clearBootFallback();
  if (reduceMotion) {
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
    renderer.toneMappingExposure = 0.82;
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
          point += vec2(uMakaPointer.x * -0.2, uMakaPointer.y * -0.12);
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

    // A view-dependent shell is more reliable than a single transmissive
    // material over the bright page. It keeps the blue rim and transparent
    // body legible at every camera angle without washing the wordmark white.
    const wordGlass = new THREE.ShaderMaterial({
      uniforms: {
        uMakaTime: { value: 0 },
        uMakaPointer: { value: new THREE.Vector2() },
        uMakaVelocity: { value: 0 },
        uMakaOpacity: { value: 1 },
      },
      vertexShader: `
        varying vec3 vMakaWordPosition;
        varying vec3 vMakaWorldNormal;
        varying vec3 vMakaViewDirection;
        void main() {
          vMakaWordPosition = position;
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vMakaWorldNormal = normalize(mat3(modelMatrix) * normal);
          vMakaViewDirection = normalize(cameraPosition - worldPosition.xyz);
          gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
      `,
      fragmentShader: `
        uniform float uMakaTime;
        uniform vec2 uMakaPointer;
        uniform float uMakaVelocity;
        uniform float uMakaOpacity;
        varying vec3 vMakaWordPosition;
        varying vec3 vMakaWorldNormal;
        varying vec3 vMakaViewDirection;

        void main() {
          vec3 normal = normalize(vMakaWorldNormal);
          vec3 viewDirection = normalize(vMakaViewDirection);
          float facing = abs(dot(normal, viewDirection));
          float rim = pow(1.0 - facing, 1.65);
          float thinRim = pow(1.0 - facing, 5.5);
          float upperEdge = smoothstep(-0.35, 0.88, normal.y);
          float lowerEdge = smoothstep(0.42, -0.72, normal.y);
          float makaSweepCenter = mod(uMakaTime * 1.08 + uMakaPointer.x * 1.2 + 6.8, 13.6) - 6.8;
          float sweep = exp(-pow((vMakaWordPosition.x - makaSweepCenter) * 1.36, 2.0));
          float micro = 0.5 + 0.5 * sin(vMakaWordPosition.x * 6.2 + vMakaWordPosition.y * 8.7 - uMakaTime * 0.75);
          float motion = min(1.0, uMakaVelocity);

          vec3 body = vec3(0.32, 0.67, 0.94);
          vec3 edge = vec3(0.045, 0.34, 0.78);
          vec3 highlight = vec3(1.0, 0.965, 0.82);
          vec3 color = mix(body, edge, rim * 0.84 + upperEdge * 0.08);
          color = mix(color, highlight, thinRim * (0.6 + upperEdge * 0.34));
          color += highlight * sweep * (0.24 + micro * 0.2 + motion * 0.12);
          color += vec3(0.04, 0.29, 0.76) * lowerEdge * 0.2;

          float alpha = (0.24 + rim * 0.58 + thinRim * 0.18 + sweep * 0.14) * uMakaOpacity;
          gl_FragColor = vec4(color, clamp(alpha, 0.0, 0.96));
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      blending: THREE.NormalBlending,
    });

    const wordCoreMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#2f8ddd"),
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      blending: THREE.NormalBlending,
    });

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

    type TubePoint = readonly [number, number, number?];
    const cursivePoints: TubePoint[] = [
      [-4.8, -0.5, 0], [-4.48, -0.48, 0.02], [-4.27, -0.08, 0.08],
      [-4.04, 0.76, 0.14], [-3.78, 1.34, 0.08], [-3.5, 1.18, -0.02],
      [-3.38, 0.32, -0.08], [-3.32, -0.54, 0], [-3.08, -0.16, 0.06],
      [-2.78, 0.72, 0.12], [-2.5, 1.22, 0.04], [-2.22, 1.04, -0.04],
      [-2.15, 0.22, -0.08], [-2.08, -0.48, 0],
      [-1.78, -0.58, 0.06], [-1.42, -0.43, 0.12], [-1.2, 0.02, 0.08],
      [-1.28, 0.52, 0], [-1.65, 0.68, -0.06], [-1.98, 0.43, -0.02],
      [-2.02, -0.03, 0.06], [-1.7, -0.38, 0.12], [-1.22, -0.4, 0.06],
      [-1.08, 0.78, 0], [-0.96, -0.42, 0.04], [-0.78, -0.08, 0],
      [-0.66, 0.68, -0.03], [-0.44, 1.36, 0.02],
      [-0.22, 1.48, 0.1], [-0.06, 1.08, 0.12], [-0.2, 0.42, 0.06],
      [-0.58, -0.1, 0], [-0.24, 0.02, 0.06], [0.2, 0.52, 0.12],
      [0.58, 0.62, 0.06], [0.34, 0.18, -0.02], [0.04, -0.06, 0],
      [0.46, -0.44, 0.08], [0.9, -0.48, 0.12], [1.2, -0.24, 0.08],
      [1.32, 0.24, 0], [1.1, 0.62, -0.06], [0.7, 0.62, 0],
      [0.5, 0.24, 0.08], [0.66, -0.22, 0.12], [1.08, -0.4, 0.06],
      [1.52, -0.22, 0], [1.72, 0.78, 0.04], [1.7, -0.3, 0.08],
      [2.02, -0.47, 0.1], [2.48, -0.34, 0.06], [2.88, -0.12, 0],
      [3.24, -0.04, -0.02],
    ];
    const cursiveCurve = new THREE.CatmullRomCurve3(
      cursivePoints.map(([x, y, z = 0]) => new THREE.Vector3(x, y, z)),
      false,
      "centripetal",
      0.42,
    );
    const wordmark = new THREE.Group();
    const cursiveCore = new THREE.Mesh(
      new THREE.TubeGeometry(cursiveCurve, 480, 0.118, 22, false),
      wordCoreMaterial,
    );
    const cursiveStroke = new THREE.Mesh(
      new THREE.TubeGeometry(cursiveCurve, 480, 0.175, 28, false),
      wordGlass,
    );
    const wordHighlightMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#fff6d8"),
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
    });
    const cursiveHighlight = new THREE.Mesh(
      new THREE.TubeGeometry(cursiveCurve, 480, 0.014, 8, false),
      wordHighlightMaterial,
    );
    cursiveHighlight.position.set(-0.028, 0.052, 0.192);
    cursiveStroke.castShadow = false;
    cursiveStroke.receiveShadow = true;
    cursiveCore.renderOrder = 1;
    cursiveStroke.renderOrder = 2;
    cursiveHighlight.renderOrder = 4;
    wordmark.add(cursiveCore, cursiveStroke, cursiveHighlight);
    const terminalGeometry = new THREE.SphereGeometry(0.1755, 28, 20);
    const startTerminal = new THREE.Mesh(terminalGeometry, wordGlass);
    const endTerminal = new THREE.Mesh(terminalGeometry, wordGlass);
    startTerminal.position.copy(cursiveCurve.getPointAt(0));
    endTerminal.position.copy(cursiveCurve.getPointAt(1));
    startTerminal.castShadow = false;
    endTerminal.castShadow = false;
    wordmark.add(startTerminal, endTerminal);

    const sparklePositions = new Float32Array(260 * 3);
    for (let index = 0; index < 260; index += 1) {
      const t = ((index * 0.61803398875) % 1) * 0.996 + 0.002;
      const point = cursiveCurve.getPointAt(t);
      const angle = index * 2.3999632297;
      const radius = 0.025 + ((index * 0.41421356237) % 1) * 0.105;
      sparklePositions[index * 3] = point.x + Math.cos(angle) * radius * 0.35;
      sparklePositions[index * 3 + 1] = point.y + Math.sin(angle) * radius;
      sparklePositions[index * 3 + 2] = point.z + Math.cos(angle * 1.37) * radius;
    }
    const sparkleGeometry = new THREE.BufferGeometry();
    sparkleGeometry.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
    const wordSparkleMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.045,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const wordSparkles = new THREE.Points(sparkleGeometry, wordSparkleMaterial);
    wordmark.add(wordSparkles);
    const glintCanvas = document.createElement("canvas");
    glintCanvas.width = 96;
    glintCanvas.height = 96;
    const glintContext = glintCanvas.getContext("2d");
    if (glintContext) {
      const glow = glintContext.createRadialGradient(48, 48, 0, 48, 48, 48);
      glow.addColorStop(0, "rgba(255,255,255,1)");
      glow.addColorStop(0.12, "rgba(255,255,255,0.95)");
      glow.addColorStop(0.36, "rgba(210,235,255,0.42)");
      glow.addColorStop(1, "rgba(190,225,255,0)");
      glintContext.fillStyle = glow;
      glintContext.fillRect(0, 0, 96, 96);
    }
    const glintTexture = new THREE.CanvasTexture(glintCanvas);
    glintTexture.colorSpace = THREE.SRGBColorSpace;
    const wordGlints = [0, 0.33, 0.66].map((phase, index) => {
      const material = new THREE.SpriteMaterial({
        map: glintTexture,
        color: 0xffffff,
        transparent: true,
        opacity: 0.66,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const glint = new THREE.Sprite(material);
      glint.position.copy(cursiveCurve.getPointAt(phase));
      glint.position.z += 0.25;
      glint.scale.setScalar(0.55 + index * 0.04);
      wordmark.add(glint);
      return { glint, material, phase };
    });
    wordmark.position.set(0.1, -0.02, 0.42);
    // Keep the signature head-on. The material and travelling glints provide
    // depth; rotating the whole word makes the letterforms harder to read.
    wordmark.rotation.set(0, 0, 0);
    wordmark.scale.set(1.42, 1.52, 1.4);
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
    tool.position.set(5.72, 2.5, 0.18);
    tool.rotation.set(0.25, 0.5, 0.25);
    tool.scale.setScalar(0.66);
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
    permission.position.set(-3.65, 3.02, 1.18);
    permission.rotation.set(-0.1, 0.24, -0.16);
    permission.scale.setScalar(0.6);
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

    const nodeGeometry = new THREE.SphereGeometry(0.115, 14, 14);
    const nodes = Array.from({ length: 9 }, (_, index) => {
      const node = new THREE.Mesh(nodeGeometry, index % 3 === 0 ? cobalt : ink);
      const angle = (index / 9) * Math.PI * 2;
      node.position.set(Math.cos(angle) * (5.1 + (index % 2) * 0.55), Math.sin(angle) * 2.7, -0.6 + (index % 3) * 0.35);
      satellites.add(node);
      return node;
    });

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 8),
      new THREE.ShadowMaterial({ color: "#2c6095", opacity: 0.105 }),
    );
    shadow.position.set(0, -3.25, -0.8);
    shadow.rotation.x = -Math.PI / 2;
    shadow.receiveShadow = true;
    organism.add(shadow);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x78a8d8, 1.35));

    const key = new THREE.DirectionalLight(0xffffff, 1.75);
    key.position.set(-4, 8, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x4b9eff, 1.18);
    rim.position.set(8, -1, 7);
    scene.add(rim);

    const warmFill = new THREE.PointLight(0xfff1cf, 2.1, 13, 1.7);
    warmFill.position.set(-5.5, 3.8, 5.5);
    scene.add(warmFill);

    const frontFill = new THREE.DirectionalLight(0xaedcff, 1.25);
    frontFill.position.set(-1, -4, 10);
    scene.add(frontFill);

    const pointerLight = new THREE.PointLight(0xd9efff, 2.1, 26, 1.5);
    pointerLight.position.set(0, 1, 7);
    scene.add(pointerLight);

    const sweepLight = new THREE.PointLight(0xf4fbff, 1.25, 6.5, 1.65);
    const returnLight = new THREE.PointLight(0x4b9fff, 0.55, 6, 1.8);
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
      cursor.visible = window.innerWidth >= 768 && stateIndex === 0 && !pointerInShell;
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
        wordGlass.opacity = materialTargets.word;
        wordGlass.uniforms.uMakaOpacity.value = materialTargets.word;
        wordCoreMaterial.opacity = materialTargets.word * 0.18;
        wordHighlightMaterial.opacity = materialTargets.word * 0.5;
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
      renderer.toneMappingExposure = night ? 0.62 : 0.82;
      scene.environmentIntensity = night ? 0.72 : 1.18;
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

      wordmark.rotation.set(0, 0, 0);
      wordSparkles.rotation.z = Math.sin(elapsed * 0.18) * 0.006;
      wordGlints.forEach(({ glint, material, phase }) => {
        const progress = (elapsed * 0.072 + phase + pointer.x * 0.025 + 1) % 1;
        const point = cursiveCurve.getPointAt(progress);
        glint.position.copy(point);
        glint.position.z += 0.25;
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 2.1 + phase * Math.PI * 2);
        glint.scale.setScalar(0.34 + pulse * 0.3);
        material.opacity = 0.18 + pulse * 0.56;
      });
      sweepLight.position.x = -7.1 + ((elapsed * 1.42 + pointer.x * 0.8 + 20) % 14.2);
      sweepLight.position.y = 0.5 + Math.sin(elapsed * 0.84) * 1.2 + pointer.y * 0.72;
      returnLight.position.x = 7.2 - ((elapsed * 0.58 + 12) % 14.4);
      returnLight.position.y = -0.35 + Math.cos(elapsed * 0.58) * 0.9;
      task.rotation.y = -0.34 + elapsed * 0.22;
      tool.rotation.y = 0.5 - elapsed * 0.2;
      artifact.rotation.y = 0.38 + Math.sin(elapsed * 0.42) * 0.22;
      recovery.rotation.z = 0.6 - elapsed * 0.26;
      permission.rotation.z = -0.16 + Math.sin(elapsed * 0.48) * 0.14;
      success.rotation.z = 0.13 - Math.sin(elapsed * 0.4) * 0.11;
      nodes.forEach((node, index) => node.scale.setScalar(0.64 + Math.sin(elapsed * 1.4 + index) * 0.12));

      if (pearlShader) pearlShader.uniforms.uMakaTime.value = elapsed;
      wordGlass.uniforms.uMakaTime.value = elapsed;
      wordGlass.uniforms.uMakaPointer.value.copy(pointer);
      wordGlass.uniforms.uMakaVelocity.value = Math.min(1, pointerVelocity.length() * 0.16);
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
      wordGlass.opacity = THREE.MathUtils.damp(wordGlass.opacity, materialTargets.word, 7, delta);
      wordGlass.uniforms.uMakaOpacity.value = wordGlass.opacity;
      wordCoreMaterial.opacity = THREE.MathUtils.damp(wordCoreMaterial.opacity, materialTargets.word * 0.18, 7, delta);
      wordHighlightMaterial.opacity = THREE.MathUtils.damp(wordHighlightMaterial.opacity, materialTargets.word * 0.5, 7, delta);
      wordSparkleMaterial.opacity = THREE.MathUtils.damp(wordSparkleMaterial.opacity, materialTargets.word * 0.72, 7, delta);
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
