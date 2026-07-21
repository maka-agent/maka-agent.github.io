import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const canvas = document.querySelector<HTMLCanvasElement>("#execution-field");

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
    renderer.toneMappingExposure = 0.78;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    camera.position.set(0, 0, 18);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.035).texture;
    scene.environmentIntensity = 0.82;
    pmrem.dispose();

    const world = new THREE.Group();
    const organism = new THREE.Group();
    const satellites = new THREE.Group();
    const foreground = new THREE.Group();
    world.add(organism, satellites, foreground);

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
          float alpha = clamp((whiteBand * 0.2 + pearlBand * 0.14 + blueBand * 0.1 + centerBloom * 0.035 + velocityTrail * 0.08) * uMakaIntensity, 0.0, 0.28);
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

    class ExecutionCurve extends THREE.Curve<THREE.Vector3> {
      constructor() {
        super();
      }

      override getPoint(t: number, target = new THREE.Vector3()) {
        const a = t * Math.PI * 2;
        const x = Math.sin(a) * 4.25 + Math.sin(a * 3) * 0.62;
        const y = Math.sin(a * 2) * 1.48 + Math.cos(a * 3) * 0.2;
        const z = Math.cos(a) * 0.72 + Math.sin(a * 2) * 0.56;
        return target.set(x, y, z);
      }
    }

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

    // Keep the silhouette stable while letting the pearl surface catch light like
    // a living material. This is intentionally a normal perturbation, not a
    // geometry wobble, so the execution loop remains legible at every state.
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
      color: new THREE.Color("#2f83ce"),
      metalness: 0,
      roughness: 0.2,
      transmission: 0.08,
      thickness: 0.9,
      ior: 1.36,
      dispersion: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.82,
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

    const loop = new THREE.Mesh(
      new THREE.TubeGeometry(new ExecutionCurve(), 360, 0.5, 28, true),
      pearl,
    );
    loop.castShadow = true;
    loop.receiveShadow = true;
    loop.rotation.set(-0.18, -0.05, -0.08);
    organism.add(loop);

    const glassLoop = new THREE.Mesh(
      new THREE.TorusKnotGeometry(2.08, 0.42, 260, 24, 2, 3),
      glass,
    );
    glassLoop.scale.set(0.48, 0.38, 0.45);
    glassLoop.rotation.set(0.22, 0.28, 0.58);
    glassLoop.position.set(0.06, 0.12, 0.82);
    glassLoop.castShadow = true;
    organism.add(glassLoop);

    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.82, 6), cobalt);
    core.position.set(-0.05, 0.12, 1.15);
    core.castShadow = true;
    organism.add(core);

    const coreHalo = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.035, 12, 128),
      new THREE.MeshBasicMaterial({ color: "#266ba8", transparent: true, opacity: 0.28 }),
    );
    coreHalo.position.copy(core.position);
    coreHalo.rotation.x = 1.08;
    organism.add(coreHalo);

    const task = new THREE.Mesh(new RoundedBoxGeometry(1.12, 1.12, 0.54, 5, 0.24), cobalt);
    task.position.set(-5.15, 2.18, 1.15);
    task.rotation.set(0.42, -0.34, -0.3);
    task.castShadow = true;
    satellites.add(task);

    const tool = new THREE.Group();
    const toolRing = new THREE.Mesh(new THREE.TorusGeometry(0.63, 0.17, 18, 90), ink);
    const toolPin = new THREE.Mesh(new THREE.OctahedronGeometry(0.3, 2), cobalt);
    tool.add(toolRing, toolPin);
    tool.position.set(5.22, 2.05, 0.45);
    tool.rotation.set(0.25, 0.5, 0.25);
    toolRing.castShadow = true;
    satellites.add(tool);

    const artifact = new THREE.Group();
    const artifactBody = new THREE.Mesh(new RoundedBoxGeometry(1.24, 1.58, 0.16, 4, 0.12), glass);
    const artifactLineA = new THREE.Mesh(new RoundedBoxGeometry(0.74, 0.07, 0.035, 2, 0.03), cobalt);
    const artifactLineB = new THREE.Mesh(new RoundedBoxGeometry(0.52, 0.07, 0.035, 2, 0.03), ink);
    artifactLineA.position.set(-0.12, 0.26, 0.1);
    artifactLineB.position.set(-0.23, 0.02, 0.1);
    artifact.add(artifactBody, artifactLineA, artifactLineB);
    artifact.position.set(5.35, -2.35, 1.1);
    artifact.rotation.set(-0.16, 0.38, 0.14);
    artifactBody.castShadow = true;
    satellites.add(artifact);

    const recovery = new THREE.Mesh(
      new THREE.TorusGeometry(0.7, 0.17, 20, 90, Math.PI * 1.72),
      pearl,
    );
    recovery.position.set(-5.1, -2.4, 0.7);
    recovery.rotation.set(0.36, 0.26, 0.6);
    recovery.castShadow = true;
    satellites.add(recovery);

    const permission = new THREE.Group();
    const permissionSeal = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.18, 8), permissionAmber);
    const keyHead = new THREE.Mesh(new THREE.SphereGeometry(0.14, 20, 20), ink);
    const keyStem = new THREE.Mesh(new RoundedBoxGeometry(0.14, 0.34, 0.09, 3, 0.045), ink);
    permissionSeal.rotation.x = Math.PI / 2;
    keyHead.position.set(0, 0.1, 0.15);
    keyStem.position.set(0, -0.14, 0.15);
    permission.add(permissionSeal, keyHead, keyStem);
    permission.position.set(-3.2, 2.85, 1.55);
    permission.rotation.set(-0.1, 0.24, -0.16);
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
    success.position.set(2.9, -2.85, 1.25);
    success.rotation.set(0.08, -0.22, 0.13);
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
    cursor.scale.setScalar(0.78);
    cursor.rotation.set(0.12, -0.16, 0.05);
    cursor.position.set(6.2, -0.2, 3.1);
    cursor.visible = false;
    cursor.castShadow = true;
    foreground.add(cursor);

    const nodeGeometry = new THREE.SphereGeometry(0.115, 20, 20);
    const nodes = Array.from({ length: 9 }, (_, index) => {
      const node = new THREE.Mesh(nodeGeometry, index % 3 === 0 ? cobalt : ink);
      const angle = (index / 9) * Math.PI * 2;
      node.position.set(Math.cos(angle) * (4.55 + (index % 2) * 0.5), Math.sin(angle) * 2.35, -0.4 + (index % 3) * 0.4);
      satellites.add(node);
      return node;
    });

    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 8),
      new THREE.ShadowMaterial({ color: "#31608d", opacity: 0.18 }),
    );
    shadow.position.set(0, -3.25, -0.8);
    shadow.rotation.x = -Math.PI / 2;
    shadow.receiveShadow = true;
    organism.add(shadow);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x55789e, 0.92));

    const key = new THREE.DirectionalLight(0xffffff, 2.1);
    key.position.set(-4, 8, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x4b9eff, 1.55);
    rim.position.set(8, -1, 7);
    scene.add(rim);

    const pointerLight = new THREE.PointLight(0xd9efff, 3.8, 26, 1.5);
    pointerLight.position.set(0, 1, 7);
    scene.add(pointerLight);

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
    let pointerOverControl = true;

    const updateCursorVisibility = () => {
      cursor.visible = pointerEngaged && !pointerOverControl && window.innerWidth >= 768 && stateIndex !== 1;
    };

    const materialTargets = { pearl: 1, glass: 0.82, cobalt: 1, ink: 1, amber: 1, green: 1, atmosphere: 1 };

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
      if (index === 0) {
        worldPositionTarget.set(0.75, 0.28, 0);
        worldScaleTarget.setScalar(1);
        materialTargets.pearl = 1;
        materialTargets.glass = 0.82;
        materialTargets.cobalt = 1;
        materialTargets.ink = 1;
        materialTargets.amber = 1;
        materialTargets.green = 1;
        materialTargets.atmosphere = 1;
      } else if (index === 1) {
        worldPositionTarget.set(-13.2, 2.8, -4.4);
        worldScaleTarget.setScalar(0.34);
        materialTargets.pearl = 0;
        materialTargets.glass = 0;
        materialTargets.cobalt = 0;
        materialTargets.ink = 0;
        materialTargets.amber = 0;
        materialTargets.green = 0;
        materialTargets.atmosphere = 0;
      } else {
        worldPositionTarget.set(1.8, 0.1, -1.3);
        worldScaleTarget.setScalar(0.78);
        materialTargets.pearl = 0.3;
        materialTargets.glass = 0.42;
        materialTargets.cobalt = 0.88;
        materialTargets.ink = 0.78;
        materialTargets.amber = 0.72;
        materialTargets.green = 0.82;
        materialTargets.atmosphere = 0.08;
      }

      for (const material of [pearl, cobalt, ink, permissionAmber, successGreen]) material.transparent = index !== 0;
      updateCursorVisibility();
      if (reduceMotion) {
        world.position.copy(worldPositionTarget);
        world.scale.copy(worldScaleTarget);
        pearl.opacity = materialTargets.pearl;
        glass.opacity = materialTargets.glass;
        cobalt.opacity = materialTargets.cobalt;
        ink.opacity = materialTargets.ink;
        permissionAmber.opacity = materialTargets.amber;
        successGreen.opacity = materialTargets.green;
        atmosphereUniforms.uMakaIntensity.value = materialTargets.atmosphere;
        renderer.render(scene, camera);
      }
    };

    window.addEventListener("maka:viewchange", ((event: CustomEvent<{ index: number }>) => {
      applyState(event.detail.index);
    }) as EventListener);

    window.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "touch") pointerEngaged = true;
      pointerOverControl = event.target instanceof Element && Boolean(event.target.closest("a, button, nav, header, footer"));
      updateCursorVisibility();
      pointerTarget.set(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
      );
      if (reduceMotion) renderer.render(scene, camera);
    }, { passive: true });

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
      organism.scale.setScalar(width < 768 ? 0.69 : 1);
      satellites.scale.setScalar(width < 768 ? 0.72 : 1);
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
      foreground.position.x = THREE.MathUtils.damp(foreground.position.x, pointer.x * 0.24, 8, delta);
      foreground.position.y = THREE.MathUtils.damp(foreground.position.y, pointer.y * 0.18, 8, delta);

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
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(pointerPlane, intersection)) {
        cursorTarget.copy(intersection);
        cursorTarget.z = 3.1;
      }
      dampVector3(cursor.position, cursorTarget, 9.5, delta);
      cursor.rotation.x = THREE.MathUtils.damp(cursor.rotation.x, 0.12 + pointerVelocity.y * 0.018, 12, delta);
      cursor.rotation.y = THREE.MathUtils.damp(cursor.rotation.y, -0.16 - pointerVelocity.x * 0.025, 12, delta);
      cursor.rotation.z = THREE.MathUtils.damp(cursor.rotation.z, 0.05 - pointerVelocity.x * 0.045, 12, delta);
      const cursorSpeed = Math.min(1, pointerVelocity.length() * 0.18);
      cursor.scale.x = THREE.MathUtils.damp(cursor.scale.x, 0.78 * (1 + cursorSpeed * 0.13), 13, delta);
      cursor.scale.y = THREE.MathUtils.damp(cursor.scale.y, 0.78 * (1 - cursorSpeed * 0.09), 13, delta);
      cursor.scale.z = THREE.MathUtils.damp(cursor.scale.z, 0.78, 13, delta);

      loop.rotation.z = -0.08 + Math.sin(elapsed * 0.28) * 0.035;
      glassLoop.rotation.y = 0.28 + elapsed * (stateIndex === 2 ? 0.12 : 0.045);
      glassLoop.rotation.z = 0.58 + Math.sin(elapsed * 0.36) * 0.08;
      core.rotation.set(elapsed * 0.18, elapsed * 0.28, elapsed * 0.11);
      coreHalo.rotation.z = elapsed * 0.25;
      task.rotation.y = -0.34 + elapsed * 0.22;
      tool.rotation.y = 0.5 - elapsed * 0.2;
      artifact.rotation.y = 0.38 + Math.sin(elapsed * 0.42) * 0.22;
      recovery.rotation.z = 0.6 - elapsed * 0.26;
      permission.rotation.z = -0.16 + Math.sin(elapsed * 0.48) * 0.14;
      success.rotation.z = 0.13 - Math.sin(elapsed * 0.4) * 0.11;
      nodes.forEach((node, index) => node.scale.setScalar(1 + Math.sin(elapsed * 1.4 + index) * 0.2));

      if (pearlShader) pearlShader.uniforms.uMakaTime.value = elapsed;
      atmosphereUniforms.uMakaTime.value = elapsed;
      atmosphereUniforms.uMakaPointer.value.copy(pointer);
      atmosphereUniforms.uMakaVelocity.value.copy(pointerVelocity);
      atmosphereUniforms.uMakaIntensity.value = THREE.MathUtils.damp(
        atmosphereUniforms.uMakaIntensity.value,
        materialTargets.atmosphere,
        6,
        delta,
      );

      pearl.opacity = THREE.MathUtils.damp(pearl.opacity, materialTargets.pearl, 7, delta);
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
    applyState(document.querySelector<HTMLElement>(".stage")?.dataset.view === "product" ? 1 : document.querySelector<HTMLElement>(".stage")?.dataset.view === "runtime" ? 2 : 0);
    resize();

    const ready = async () => {
      try {
        await renderer.compileAsync(scene, camera);
      } finally {
        document.documentElement.dataset.field = "ready";
        if (reduceMotion) renderer.render(scene, camera);
        else animate();
      }
    };

    void ready();
  } catch (error) {
    console.warn("Maka execution field unavailable", error);
    document.documentElement.dataset.field = "unavailable";
  }
}
