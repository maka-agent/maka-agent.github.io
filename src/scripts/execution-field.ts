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
    renderer.toneMappingExposure = 1.18;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 80);
    camera.position.set(0, 0, 18);

    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.045).texture;
    pmrem.dispose();

    const world = new THREE.Group();
    const organism = new THREE.Group();
    const satellites = new THREE.Group();
    const foreground = new THREE.Group();
    world.add(organism, satellites, foreground);
    scene.add(world);

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
      color: new THREE.Color("#d9efff"),
      metalness: 0.02,
      roughness: 0.11,
      clearcoat: 1,
      clearcoatRoughness: 0.055,
      transmission: 0.06,
      thickness: 1.1,
      iridescence: 0.82,
      iridescenceIOR: 1.34,
      sheen: 0.5,
      sheenColor: new THREE.Color("#ffffff"),
    });

    const glass = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#b9dcff"),
      metalness: 0,
      roughness: 0.08,
      transmission: 0.58,
      thickness: 1.25,
      ior: 1.36,
      dispersion: 0.32,
      clearcoat: 1,
      clearcoatRoughness: 0.04,
      transparent: true,
      opacity: 0.86,
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
    glassLoop.scale.set(1.28, 0.92, 1);
    glassLoop.rotation.set(0.22, 0.28, 0.58);
    glassLoop.position.set(0.2, 0.12, 0.85);
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

    scene.add(new THREE.HemisphereLight(0xffffff, 0x6a83a4, 2.5));

    const key = new THREE.DirectionalLight(0xffffff, 5.8);
    key.position.set(-4, 8, 9);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 6;
    key.shadow.camera.bottom = -6;
    scene.add(key);

    const rim = new THREE.DirectionalLight(0x5fafff, 4.8);
    rim.position.set(8, -1, 7);
    scene.add(rim);

    const pointerLight = new THREE.PointLight(0xd9efff, 11, 26, 1.5);
    pointerLight.position.set(0, 1, 7);
    scene.add(pointerLight);

    const pointer = new THREE.Vector2();
    const pointerTarget = new THREE.Vector2();
    const worldPosition = new THREE.Vector3(0.75, 0.28, 0);
    const worldPositionTarget = worldPosition.clone();
    const worldScaleTarget = new THREE.Vector3(1, 1, 1);
    const cursorTarget = cursor.position.clone();
    const raycaster = new THREE.Raycaster();
    const pointerPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), -2.2);
    const intersection = new THREE.Vector3();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startedAt = performance.now();
    let stateIndex = 0;
    let frame = 0;
    let visible = true;

    const materialTargets = { pearl: 1, glass: 0.86, cobalt: 1, ink: 1, amber: 1, green: 1 };

    const applyState = (index: number) => {
      stateIndex = index;
      if (index === 0) {
        worldPositionTarget.set(0.75, 0.28, 0);
        worldScaleTarget.setScalar(1);
        materialTargets.pearl = 1;
        materialTargets.glass = 0.86;
        materialTargets.cobalt = 1;
        materialTargets.ink = 1;
        materialTargets.amber = 1;
        materialTargets.green = 1;
      } else if (index === 1) {
        worldPositionTarget.set(-10.2, 2.3, -3.4);
        worldScaleTarget.setScalar(0.34);
        materialTargets.pearl = 0.04;
        materialTargets.glass = 0.03;
        materialTargets.cobalt = 0.05;
        materialTargets.ink = 0.04;
        materialTargets.amber = 0.04;
        materialTargets.green = 0.04;
      } else {
        worldPositionTarget.set(1.8, 0.1, -1.3);
        worldScaleTarget.setScalar(0.78);
        materialTargets.pearl = 0.3;
        materialTargets.glass = 0.42;
        materialTargets.cobalt = 0.88;
        materialTargets.ink = 0.78;
        materialTargets.amber = 0.72;
        materialTargets.green = 0.82;
      }

      for (const material of [pearl, cobalt, ink, permissionAmber, successGreen]) material.transparent = index !== 0;
      if (reduceMotion) {
        world.position.copy(worldPositionTarget);
        world.scale.copy(worldScaleTarget);
        pearl.opacity = materialTargets.pearl;
        glass.opacity = materialTargets.glass;
        cobalt.opacity = materialTargets.cobalt;
        ink.opacity = materialTargets.ink;
        permissionAmber.opacity = materialTargets.amber;
        successGreen.opacity = materialTargets.green;
        renderer.render(scene, camera);
      }
    };

    window.addEventListener("maka:viewchange", ((event: CustomEvent<{ index: number }>) => {
      applyState(event.detail.index);
    }) as EventListener);

    window.addEventListener("pointermove", (event) => {
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
      camera.fov = width < 768 ? 43 : width < 1100 ? 36 : 30;
      camera.position.z = width < 768 ? 20 : 18;
      camera.updateProjectionMatrix();
      organism.scale.setScalar(width < 768 ? 0.69 : 1);
      satellites.scale.setScalar(width < 768 ? 0.72 : 1);
      renderer.render(scene, camera);
    };

    const animate = () => {
      if (!visible) {
        frame = 0;
        return;
      }
      frame = requestAnimationFrame(animate);
      const elapsed = (performance.now() - startedAt) / 1000;
      pointer.lerp(pointerTarget, 0.06);
      world.position.lerp(worldPositionTarget, 0.055);
      world.scale.lerp(worldScaleTarget, 0.055);

      world.rotation.x = THREE.MathUtils.lerp(world.rotation.x, pointer.y * 0.09, 0.045);
      world.rotation.y = THREE.MathUtils.lerp(world.rotation.y, pointer.x * 0.16, 0.045);
      organism.position.set(pointer.x * 0.22, pointer.y * 0.13 + Math.sin(elapsed * 0.55) * 0.08, 0);
      satellites.position.set(pointer.x * -0.58, pointer.y * -0.38, 0);
      foreground.position.set(pointer.x * 0.72, pointer.y * 0.52, 0);

      pointerLight.position.set(pointer.x * 7, pointer.y * 4.5, 7);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(pointerPlane, intersection)) cursorTarget.lerp(intersection, 0.13);
      cursor.position.lerp(cursorTarget, 0.08);
      cursor.position.z = 3.1;

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

      pearl.opacity = THREE.MathUtils.lerp(pearl.opacity, materialTargets.pearl, 0.065);
      glass.opacity = THREE.MathUtils.lerp(glass.opacity, materialTargets.glass, 0.065);
      cobalt.opacity = THREE.MathUtils.lerp(cobalt.opacity, materialTargets.cobalt, 0.065);
      ink.opacity = THREE.MathUtils.lerp(ink.opacity, materialTargets.ink, 0.065);
      permissionAmber.opacity = THREE.MathUtils.lerp(permissionAmber.opacity, materialTargets.amber, 0.065);
      successGreen.opacity = THREE.MathUtils.lerp(successGreen.opacity, materialTargets.green, 0.065);

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
