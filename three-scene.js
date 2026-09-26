/* ── HERO 3D SCENE (Three.js) ── */
import * as THREE from "./vendor/three.module.min.js";

(function () {
  const canvas = document.getElementById("hero-canvas");
  const heroSection = document.getElementById("profile");
  if (!canvas || !heroSection) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const isSmallScreen = window.innerWidth < 700;

  let width = canvas.clientWidth;
  let height = canvas.clientHeight;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 100);
  camera.position.z = 9;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  } catch {
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, isSmallScreen ? 1.5 : 2));
  renderer.setSize(width, height, false);

  function readThemeColors() {
    const styles = getComputedStyle(document.documentElement);
    return {
      accent: new THREE.Color(styles.getPropertyValue("--accent").trim() || "#6c63ff"),
      accent2: new THREE.Color(styles.getPropertyValue("--accent-2").trim() || "#a78bfa"),
    };
  }
  let colors = readThemeColors();

  // Anchors are fractions of the visible half-extent at each depth, keeping shapes at the edges, clear of the hero text.
  const shapes = [
    { geo: new THREE.TorusGeometry(0.8, 0.26, 16, 64), nx: -0.88, ny: 0.8, z: -2 },
    { geo: new THREE.IcosahedronGeometry(1.1, 0), nx: 0.9, ny: -0.75, z: -2 },
    { geo: new THREE.OctahedronGeometry(0.9, 0), nx: -0.25, ny: -0.88, z: -1 },
    { geo: new THREE.IcosahedronGeometry(0.6, 1), nx: 0.15, ny: 0.82, z: -1 },
  ];

  function placeShapes() {
    const tanHalfFov = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    meshes.forEach((mesh) => {
      const { nx, ny, z } = mesh.userData.anchor;
      const halfH = (camera.position.z - z) * tanHalfFov;
      mesh.userData.base.set(nx * halfH * camera.aspect, ny * halfH, z);
    });
  }

  const meshes = shapes.map(({ geo, nx, ny, z }, i) => {
    const material = new THREE.MeshBasicMaterial({
      color: i % 2 === 0 ? colors.accent : colors.accent2,
      wireframe: true,
      transparent: true,
      opacity: isSmallScreen ? 0.3 : 0.5,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.userData.anchor = { nx, ny, z };
    mesh.userData.base = new THREE.Vector3();
    mesh.userData.phase = i * 1.7;
    mesh.userData.speed = 0.15 + Math.random() * 0.25;
    mesh.userData.axis = new THREE.Vector3(
      Math.random() - 0.5,
      Math.random() - 0.5,
      Math.random() - 0.5
    ).normalize();
    scene.add(mesh);
    return mesh;
  });

  const particleCount = isSmallScreen ? 50 : 120;
  const positions = new Float32Array(particleCount * 3);
  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = (Math.random() - 0.5) * 14;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 6 - 2;
  }
  const particleGeometry = new THREE.BufferGeometry();
  particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const particleMaterial = new THREE.PointsMaterial({
    color: colors.accent2,
    size: 0.035,
    transparent: true,
    opacity: 0.5,
  });
  const particles = new THREE.Points(particleGeometry, particleMaterial);
  scene.add(particles);

  new MutationObserver(() => {
    colors = readThemeColors();
    meshes.forEach((mesh, i) => {
      mesh.material.color.copy(i % 2 === 0 ? colors.accent : colors.accent2);
    });
    particleMaterial.color.copy(colors.accent2);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  let targetX = 0;
  let targetY = 0;
  window.addEventListener("mousemove", (e) => {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function resize() {
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    if (width === 0 || height === 0) return;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    placeShapes();
  }
  window.addEventListener("resize", resize);
  placeShapes();

  // Stop rendering while the tab is hidden or the hero is scrolled out of view.
  let tabVisible = !document.hidden;
  let heroInView = true;
  const clock = new THREE.Clock();
  let elapsed = 0;
  let running = true;

  function updateRunning() {
    const next = tabVisible && heroInView;
    if (next && !running) clock.getDelta();
    running = next;
  }

  document.addEventListener("visibilitychange", () => {
    tabVisible = !document.hidden;
    updateRunning();
  });
  new IntersectionObserver(([entry]) => {
    heroInView = entry.isIntersecting;
    updateRunning();
  }).observe(heroSection);

  function animate() {
    requestAnimationFrame(animate);
    if (!running) return;
    const delta = Math.min(clock.getDelta(), 0.1);
    elapsed += delta;

    meshes.forEach((mesh) => {
      mesh.rotateOnAxis(mesh.userData.axis, mesh.userData.speed * delta);
      mesh.position.copy(mesh.userData.base);
      mesh.position.y += Math.sin(elapsed * 0.8 + mesh.userData.phase) * 0.15;
    });
    particles.rotation.y += delta * 0.02;

    camera.position.x += (targetX * 1.2 - camera.position.x) * 0.03;
    camera.position.y += (-targetY * 0.8 - camera.position.y) * 0.03;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }
  animate();
})();
