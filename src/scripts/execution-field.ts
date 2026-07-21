import * as THREE from "three";

const canvas = document.querySelector<HTMLCanvasElement>("#execution-field");

if (canvas) {
  try {
    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      depth: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });

    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0, 15);

    const world = new THREE.Group();
    const word = new THREE.Group();
    const orbitalSystem = new THREE.Group();
    const objectSystem = new THREE.Group();
    scene.add(world);
    world.add(word, orbitalSystem, objectSystem);

    const blueMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#78b9f4"),
      metalness: 0.08,
      roughness: 0.17,
      clearcoat: 1,
      clearcoatRoughness: 0.08,
      iridescence: 0.72,
      iridescenceIOR: 1.28,
      sheen: 0.45,
      sheenColor: new THREE.Color("#d8edff"),
      transparent: true,
      opacity: 0.94,
    });

    const paleMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#f3f8ff"),
      metalness: 0.02,
      roughness: 0.22,
      clearcoat: 0.85,
      clearcoatRoughness: 0.12,
      transmission: 0.1,
      transparent: true,
      opacity: 0.86,
    });

    const inkMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#1d2028"),
      metalness: 0.28,
      roughness: 0.34,
      transparent: true,
      opacity: 0.92,
    });

    const signalMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color("#2e83de"),
      emissive: new THREE.Color("#0c3d70"),
      emissiveIntensity: 0.2,
      metalness: 0.12,
      roughness: 0.12,
      clearcoat: 1,
      transparent: true,
      opacity: 0.98,
    });

    const stroke = (
      parent: THREE.Group,
      x: number,
      y: number,
      length: number,
      angle: number,
      material: THREE.Material = blueMaterial,
      radius = 0.24,
    ) => {
      const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.05, length - radius * 2), 9, 18);
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(x, y, 0);
      mesh.rotation.z = angle;
      mesh.castShadow = false;
      mesh.receiveShadow = false;
      parent.add(mesh);
      return mesh;
    };

    const makeM = (x: number) => {
      const group = new THREE.Group();
      stroke(group, -0.95, 0, 3.3, 0);
      stroke(group, 0.95, 0, 3.3, 0);
      stroke(group, -0.48, 0.52, 1.8, -0.57);
      stroke(group, 0.48, 0.52, 1.8, 0.57);
      group.position.x = x;
      word.add(group);
    };

    const makeA = (x: number) => {
      const group = new THREE.Group();
      stroke(group, -0.53, 0, 3.5, -0.3);
      stroke(group, 0.53, 0, 3.5, 0.3);
      stroke(group, 0, -0.1, 1.65, Math.PI / 2, paleMaterial, 0.19);
      group.position.x = x;
      word.add(group);
    };

    const makeK = (x: number) => {
      const group = new THREE.Group();
      stroke(group, -0.75, 0, 3.3, 0);
      stroke(group, 0.1, 0.72, 2.15, -0.72);
      stroke(group, 0.16, -0.74, 2.28, 0.76);
      group.position.x = x;
      word.add(group);
    };

    makeM(-4.7);
    makeA(-1.6);
    makeK(1.45);
    makeA(4.55);
    word.position.set(0.65, 0.45, 0);
    word.rotation.set(-0.08, -0.15, -0.025);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#285e91"),
      transparent: true,
      opacity: 0.18,
      side: THREE.DoubleSide,
    });

    const orbitA = new THREE.Mesh(new THREE.TorusGeometry(6.9, 0.015, 6, 240), ringMaterial);
    orbitA.scale.y = 0.48;
    orbitA.rotation.set(0.15, -0.08, -0.1);
    orbitalSystem.add(orbitA);

    const orbitB = new THREE.Mesh(new THREE.TorusGeometry(5.35, 0.012, 6, 220), ringMaterial.clone());
    orbitB.scale.y = 0.56;
    orbitB.rotation.set(-0.2, 0.12, 0.32);
    orbitalSystem.add(orbitB);

    const nodeGeometry = new THREE.SphereGeometry(0.12, 18, 18);
    const nodePositions = [
      [-5.9, -1.9, 0.2],
      [-2.5, 2.35, -0.25],
      [2.7, 2.15, 0.4],
      [6.1, -1.45, -0.2],
    ];
    const orbitNodes = nodePositions.map(([x, y, z], index) => {
      const mesh = new THREE.Mesh(nodeGeometry, index === 2 ? signalMaterial : inkMaterial);
      mesh.position.set(x, y, z);
      orbitalSystem.add(mesh);
      return mesh;
    });

    const task = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 2), signalMaterial);
    task.position.set(-5.7, 2.35, 0.9);
    task.rotation.set(0.4, 0.2, 0.1);
    objectSystem.add(task);

    const tool = new THREE.Mesh(new THREE.TorusKnotGeometry(0.44, 0.13, 96, 16), inkMaterial);
    tool.position.set(5.9, 1.8, 0.7);
    tool.scale.setScalar(0.86);
    objectSystem.add(tool);

    const artifact = new THREE.Group();
    const artifactBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.35, 0.18, 4, 4, 1), paleMaterial);
    const artifactLineA = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.055, 0.025), signalMaterial);
    const artifactLineB = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.055, 0.025), inkMaterial);
    artifactLineA.position.set(-0.1, 0.26, 0.11);
    artifactLineB.position.set(-0.18, 0.05, 0.11);
    artifact.add(artifactBody, artifactLineA, artifactLineB);
    artifact.position.set(6.25, -2.3, 0.65);
    artifact.rotation.set(-0.18, 0.3, 0.12);
    objectSystem.add(artifact);

    const recovery = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.13, 16, 60, Math.PI * 1.72), blueMaterial);
    recovery.position.set(-5.45, -2.5, 0.7);
    recovery.rotation.set(0.25, 0.2, 0.45);
    objectSystem.add(recovery);

    const particleCount = 72;
    const particlePositions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      particlePositions[index * 3] = (Math.random() - 0.5) * 17;
      particlePositions[index * 3 + 1] = (Math.random() - 0.5) * 9;
      particlePositions[index * 3 + 2] = (Math.random() - 0.5) * 3 - 1;
    }
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(particlePositions, 3));
    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color("#2b5d8d"),
      size: 0.022,
      transparent: true,
      opacity: 0.28,
      sizeAttenuation: true,
    });
    const particles = new THREE.Points(particleGeometry, particleMaterial);
    world.add(particles);

    const hemisphere = new THREE.HemisphereLight(0xe9f5ff, 0x52677f, 2.8);
    scene.add(hemisphere);

    const keyLight = new THREE.DirectionalLight(0xffffff, 4.2);
    keyLight.position.set(-4, 7, 9);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x5ba8ff, 3.8);
    rimLight.position.set(8, -2, 6);
    scene.add(rimLight);

    const pointerLight = new THREE.PointLight(0xd8edff, 8, 24, 1.5);
    pointerLight.position.set(0, 0, 7);
    scene.add(pointerLight);

    const pointer = new THREE.Vector2(0, 0);
    const pointerTarget = new THREE.Vector2(0, 0);
    const worldTarget = new THREE.Vector3(0, 0, 0);
    const worldScaleTarget = new THREE.Vector3(1, 1, 1);
    let stateIndex = 0;
    let visible = true;
    let frame = 0;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const startedAt = performance.now();

    const applyState = (index: number) => {
      stateIndex = index;
      if (index === 0) {
        worldTarget.set(0.35, 0.35, 0);
        worldScaleTarget.setScalar(1);
        blueMaterial.opacity = 0.94;
        paleMaterial.opacity = 0.86;
        ringMaterial.opacity = 0.18;
      } else if (index === 1) {
        worldTarget.set(6.8, 1.35, -2.5);
        worldScaleTarget.setScalar(0.55);
        blueMaterial.opacity = 0.28;
        paleMaterial.opacity = 0.22;
        ringMaterial.opacity = 0.08;
      } else {
        worldTarget.set(0.3, 0.05, -4);
        worldScaleTarget.setScalar(0.76);
        blueMaterial.opacity = 0.23;
        paleMaterial.opacity = 0.15;
        ringMaterial.opacity = 0.34;
      }
      if (reduceMotion) {
        world.position.copy(worldTarget);
        world.scale.copy(worldScaleTarget);
        render();
      }
    };

    window.addEventListener("maka:viewchange", ((event: CustomEvent<{ index: number }>) => {
      applyState(event.detail.index);
    }) as EventListener);

    window.addEventListener("pointermove", (event) => {
      pointerTarget.x = (event.clientX / window.innerWidth) * 2 - 1;
      pointerTarget.y = -(event.clientY / window.innerHeight) * 2 + 1;
      if (reduceMotion) render();
    }, { passive: true });

    const render = () => {
      renderer.render(scene, camera);
    };

    const resize = () => {
      const width = Math.max(1, canvas.clientWidth);
      const height = Math.max(1, canvas.clientHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = width < 768 ? 45 : 34;
      camera.position.z = width < 768 ? 17.5 : 15;
      camera.updateProjectionMatrix();
      word.scale.setScalar(width < 768 ? 0.5 : 1);
      render();
    };

    const animate = () => {
      if (!visible) {
        frame = 0;
        return;
      }
      frame = window.requestAnimationFrame(animate);
      const elapsed = (performance.now() - startedAt) / 1000;
      pointer.lerp(pointerTarget, 0.045);
      world.position.lerp(worldTarget, 0.045);
      world.scale.lerp(worldScaleTarget, 0.045);

      world.rotation.x = THREE.MathUtils.lerp(world.rotation.x, pointer.y * 0.065, 0.04);
      world.rotation.y = THREE.MathUtils.lerp(world.rotation.y, pointer.x * 0.11, 0.04);
      pointerLight.position.x = pointer.x * 7;
      pointerLight.position.y = pointer.y * 4;

      if (stateIndex === 0) {
        word.position.y = 0.45 + Math.sin(elapsed * 0.56) * 0.08;
        word.rotation.z = -0.025 + Math.sin(elapsed * 0.32) * 0.015;
        orbitalSystem.rotation.z = elapsed * 0.026;
      } else if (stateIndex === 1) {
        word.rotation.y += 0.002;
        orbitalSystem.rotation.z = elapsed * 0.012;
      } else {
        orbitalSystem.rotation.z = elapsed * 0.085;
        word.rotation.z = Math.sin(elapsed * 0.4) * 0.02;
      }

      task.rotation.x = elapsed * 0.42;
      task.rotation.y = elapsed * 0.36;
      tool.rotation.x = elapsed * 0.22;
      tool.rotation.y = -elapsed * 0.36;
      artifact.rotation.y = 0.3 + Math.sin(elapsed * 0.45) * 0.16;
      recovery.rotation.z = 0.45 - elapsed * 0.3;
      particles.rotation.z = elapsed * 0.006;
      orbitNodes.forEach((node, index) => {
        const pulse = 1 + Math.sin(elapsed * 1.5 + index * 1.2) * 0.22;
        node.scale.setScalar(pulse);
      });
      render();
    };

    document.addEventListener("visibilitychange", () => {
      visible = !document.hidden;
      if (visible && !reduceMotion && !frame) animate();
    });

    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    applyState(Number((document.querySelector<HTMLElement>(".stage")?.dataset.view === "product") ? 1 : (document.querySelector<HTMLElement>(".stage")?.dataset.view === "runtime") ? 2 : 0));
    resize();

    const ready = async () => {
      try {
        await renderer.compileAsync(scene, camera);
      } finally {
        document.documentElement.dataset.field = "ready";
        if (reduceMotion) render();
        else animate();
      }
    };

    void ready();
  } catch (error) {
    console.warn("Maka execution field unavailable", error);
    document.documentElement.dataset.field = "unavailable";
  }
}
