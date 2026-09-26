// Draggable 3D tag cloud: tags sit on a Fibonacci sphere and are projected with CSS transforms.
export function createTagSphere(root, { reducedMotion = false } = {}) {
  const tags = Array.from(root.querySelectorAll(".tag-sphere__tag"));
  if (!tags.length) return;

  const golden = Math.PI * (3 - Math.sqrt(5));
  const points = tags.map((_, i) => {
    const y = 1 - (i / (tags.length - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    return [Math.cos(golden * i) * r, y, Math.sin(golden * i) * r];
  });

  let radius = 0;
  let rotX = 0.3;
  let rotY = 0;
  let velX = 0;
  let velY = reducedMotion ? 0 : 0.0035;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let visible = false;
  let hovered = null;

  function measure() {
    radius = root.clientWidth * 0.4;
  }

  function render() {
    const cx = Math.cos(rotX), sx = Math.sin(rotX);
    const cy = Math.cos(rotY), sy = Math.sin(rotY);
    points.forEach(([x, y, z], i) => {
      const x1 = x * cy + z * sy;
      const z1 = -x * sy + z * cy;
      const y2 = y * cx - z1 * sx;
      const z2 = y * sx + z1 * cx;
      const depth = (z2 + 1) / 2;
      const tag = tags[i];
      const scale = 0.6 + depth * 0.6;
      tag.style.transform = `translate3d(${x1 * radius}px, ${y2 * radius}px, 0) translate(-50%, -50%) scale(${tag === hovered ? scale * 1.25 : scale})`;
      tag.style.opacity = String(0.22 + depth * 0.78);
      tag.style.zIndex = String(Math.round(depth * 100));
      tag.style.filter = depth < 0.35 ? `blur(${(0.35 - depth) * 4}px)` : "none";
    });
  }

  function tick() {
    if (visible) {
      if (!dragging) {
        velY += ((reducedMotion ? 0 : 0.0035) - velY) * 0.02;
        velX += (0 - velX) * 0.02;
      }
      rotY += velY;
      rotX = Math.max(-1.2, Math.min(1.2, rotX + velX));
      render();
    }
    requestAnimationFrame(tick);
  }

  root.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
    root.setPointerCapture(e.pointerId);
    root.classList.add("is-dragging");
  });
  root.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    velY = (e.clientX - lastX) * 0.004;
    velX = (e.clientY - lastY) * -0.004;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  const release = () => {
    dragging = false;
    root.classList.remove("is-dragging");
  };
  root.addEventListener("pointerup", release);
  root.addEventListener("pointercancel", release);

  tags.forEach((tag) => {
    tag.addEventListener("pointerenter", () => { hovered = tag; });
    tag.addEventListener("pointerleave", () => { if (hovered === tag) hovered = null; });
  });

  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; }).observe(root);
  window.addEventListener("resize", measure);
  measure();
  render();
  tick();
}
