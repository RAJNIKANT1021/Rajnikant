import * as THREE from "../vendor/three.module.min.js";

const SHAPE_COUNT = 6;

const noiseGLSL = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x;p1*=norm.y;p2*=norm.z;p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

const vertexShader = /* glsl */ `
attribute vec3 aP1;
attribute vec3 aP2;
attribute vec3 aP3;
attribute vec3 aP4;
attribute vec3 aP5;
attribute vec4 aRand;

uniform float uMorph;
uniform float uTime;
uniform float uIntro;
uniform float uSize;
uniform float uPixelRatio;
uniform vec3 uMouse;
uniform float uMouseStrength;
uniform vec3 uOffsets[${SHAPE_COUNT}];
uniform float uDims[${SHAPE_COUNT}];
uniform vec3 uColA;
uniform vec3 uColB;
uniform vec3 uColC;

varying vec3 vColor;
varying float vAlpha;

${noiseGLSL}

float weight(float k){ return clamp(1.0 - abs(uMorph - k), 0.0, 1.0); }

void main(){
  float w0 = weight(0.0), w1 = weight(1.0), w2 = weight(2.0);
  float w3 = weight(3.0), w4 = weight(4.0), w5 = weight(5.0);

  vec3 p = position*w0 + aP1*w1 + aP2*w2 + aP3*w3 + aP4*w4 + aP5*w5;
  vec3 offset = uOffsets[0]*w0 + uOffsets[1]*w1 + uOffsets[2]*w2 + uOffsets[3]*w3 + uOffsets[4]*w4 + uOffsets[5]*w5;
  float dim = uDims[0]*w0 + uDims[1]*w1 + uDims[2]*w2 + uDims[3]*w3 + uDims[4]*w4 + uDims[5]*w5;

  // Mid-transition particles swirl outward, so morphs read as a burst rather than a linear slide.
  float between = 1.0 - abs(fract(uMorph) - 0.5) * 2.0;
  float transit = smoothstep(0.0, 1.0, between) * step(0.001, fract(uMorph));
  vec3 flow = vec3(
    snoise(p * 0.45 + vec3(uTime * 0.12, 0.0, 0.0)),
    snoise(p * 0.45 + vec3(17.0, uTime * 0.12, 0.0)),
    snoise(p * 0.45 + vec3(0.0, 31.0, uTime * 0.12))
  );
  p += flow * (0.09 + transit * 0.9 * aRand.z);

  vec3 scatter = normalize(aRand.xyz - 0.5 + 0.0001) * (7.0 + aRand.w * 12.0);
  float intro = smoothstep(0.0, 1.0, clamp(uIntro * 1.5 - aRand.w * 0.5, 0.0, 1.0));
  p = mix(scatter, p, intro);

  vec4 world = modelMatrix * vec4(p, 1.0);
  world.xyz += offset;

  vec2 toMouse = world.xy - uMouse.xy;
  float d = length(toMouse);
  float push = smoothstep(1.6, 0.0, d) * uMouseStrength;
  world.xy += normalize(toMouse + 0.0001) * push * 0.55;
  world.z += push * 0.4;

  vec4 mv = viewMatrix * world;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio * (0.55 + aRand.w * 0.9) * (1.0 / -mv.z);

  float grad = smoothstep(-2.5, 2.5, p.y + p.x * 0.35);
  vec3 col = mix(uColA, uColB, grad);
  col = mix(col, uColC, step(0.9, aRand.x));
  vColor = col + push * 0.35;
  vAlpha = dim * (0.45 + 0.55 * aRand.y) * (0.35 + 0.65 * intro);
}`;

const fragmentShader = /* glsl */ `
varying vec3 vColor;
varying float vAlpha;
void main(){
  float d = length(gl_PointCoord - 0.5);
  if (d > 0.5) discard;
  float s = pow(1.0 - d * 2.0, 2.4);
  gl_FragColor = vec4(vColor, s * vAlpha);
}`;

/* ── Shape generators: each returns a Float32Array of count*3 ── */

function rand(min, max) {
  return min + Math.random() * (max - min);
}

function randomUnit() {
  const u = Math.random() * 2 - 1;
  const t = Math.random() * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return [r * Math.cos(t), u, r * Math.sin(t)];
}

function genSphere(n) {
  const out = new Float32Array(n * 3);
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const inner = Math.random() < 0.12;
    const y = 1 - (i / (n - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const th = golden * i;
    const rad = inner ? rand(0.3, 1.9) : 2.15 + rand(-0.04, 0.04);
    out[i * 3] = Math.cos(th) * r * rad;
    out[i * 3 + 1] = y * rad;
    out[i * 3 + 2] = Math.sin(th) * r * rad;
  }
  return out;
}

function genTorusKnot(n) {
  const out = new Float32Array(n * 3);
  const p = 2, q = 3, scale = 0.72;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2;
    const r = Math.cos(q * t) + 2;
    const [ux, uy, uz] = randomUnit();
    const tube = 0.32 * Math.cbrt(Math.random());
    out[i * 3] = (r * Math.cos(p * t) + ux * tube) * scale;
    out[i * 3 + 1] = (r * Math.sin(p * t) + uy * tube) * scale;
    out[i * 3 + 2] = (-Math.sin(q * t) + uz * tube) * scale;
  }
  return out;
}

function genCube(n) {
  const out = new Float32Array(n * 3);
  const h = 1.55;
  const edges = [];
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    edges.push((t) => [t, a, b], (t) => [a, t, b], (t) => [a, b, t]);
  }
  for (let i = 0; i < n; i++) {
    let x, y, z;
    const roll = Math.random();
    if (roll < 0.55) {
      [x, y, z] = edges[(Math.random() * 12) | 0](rand(-1, 1));
      x += rand(-0.02, 0.02); y += rand(-0.02, 0.02); z += rand(-0.02, 0.02);
    } else if (roll < 0.85) {
      const axis = (Math.random() * 3) | 0;
      const side = Math.random() < 0.5 ? -1 : 1;
      const g = () => Math.round(rand(-1, 1) * 5) / 5;
      const c = [g(), g(), g()];
      c[axis] = side;
      [x, y, z] = c;
    } else {
      [x, y, z] = [rand(-0.45, 0.45), rand(-0.45, 0.45), rand(-0.45, 0.45)];
    }
    out[i * 3] = x * h;
    out[i * 3 + 1] = y * h;
    out[i * 3 + 2] = z * h;
  }
  return out;
}

function genHelix(n) {
  const out = new Float32Array(n * 3);
  const turns = 3.2, height = 6.2, radius = 1.15, tilt = 0.5;
  const c = Math.cos(tilt), s = Math.sin(tilt);
  for (let i = 0; i < n; i++) {
    const t = Math.random();
    const ang = t * turns * Math.PI * 2;
    const y = (t - 0.5) * height;
    let x, z;
    if (Math.random() < 0.8) {
      const strand = Math.random() < 0.5 ? 0 : Math.PI;
      x = Math.cos(ang + strand) * radius + rand(-0.06, 0.06);
      z = Math.sin(ang + strand) * radius + rand(-0.06, 0.06);
    } else {
      const k = rand(-1, 1);
      const rung = Math.round(t * 34) / 34;
      const ra = rung * turns * Math.PI * 2;
      x = Math.cos(ra) * radius * k;
      z = Math.sin(ra) * radius * k;
    }
    out[i * 3] = x * c - y * s;
    out[i * 3 + 1] = x * s + y * c;
    out[i * 3 + 2] = z;
  }
  return out;
}

function genGalaxy(n) {
  const out = new Float32Array(n * 3);
  const arms = 4, radius = 3.6, spin = 1.1, tilt = 1.05;
  const c = Math.cos(tilt), s = Math.sin(tilt);
  for (let i = 0; i < n; i++) {
    const r = Math.pow(Math.random(), 1.6) * radius;
    const branch = ((i % arms) / arms) * Math.PI * 2;
    const ang = branch + r * spin;
    const spread = 0.35 * (1 - r / radius * 0.4);
    const rx = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * spread * r;
    const ry = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * spread * 0.6;
    const rz = Math.pow(Math.random(), 3) * (Math.random() < 0.5 ? 1 : -1) * spread * r;
    const x = Math.cos(ang) * r + rx;
    const y = ry;
    const z = Math.sin(ang) * r + rz;
    out[i * 3] = x;
    out[i * 3 + 1] = y * c - z * s;
    out[i * 3 + 2] = y * s + z * c;
  }
  return out;
}

function genRing(n) {
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const band = Math.random();
    let r, y;
    if (band < 0.7) {
      r = 3.1 + rand(-0.12, 0.12) + Math.sin(a * 6) * 0.05;
      y = rand(-0.12, 0.12);
    } else if (band < 0.9) {
      r = 3.6 + rand(-0.03, 0.03);
      y = rand(-0.03, 0.03);
    } else {
      r = rand(0.2, 2.7);
      y = rand(-0.4, 0.4) * (1 - r / 2.7);
    }
    out[i * 3] = Math.cos(a) * r;
    out[i * 3 + 1] = Math.sin(a) * r;
    out[i * 3 + 2] = y;
  }
  return out;
}

/* ── Scene ── */

export function createScene({ canvas, sections, orbitChips = [], reducedMotion = false }) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: "high-performance" });
  const mobileQuery = window.matchMedia("(max-width: 820px)");
  const isMobile = () => mobileQuery.matches;

  const count = isMobile() ? 7000 : 15000;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 0, 9);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(genSphere(count), 3));
  geometry.setAttribute("aP1", new THREE.BufferAttribute(genTorusKnot(count), 3));
  geometry.setAttribute("aP2", new THREE.BufferAttribute(genCube(count), 3));
  geometry.setAttribute("aP3", new THREE.BufferAttribute(genHelix(count), 3));
  geometry.setAttribute("aP4", new THREE.BufferAttribute(genGalaxy(count), 3));
  geometry.setAttribute("aP5", new THREE.BufferAttribute(genRing(count), 3));
  const rnd = new Float32Array(count * 4);
  for (let i = 0; i < rnd.length; i++) rnd[i] = Math.random();
  geometry.setAttribute("aRand", new THREE.BufferAttribute(rnd, 4));
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);

  const uniforms = {
    uMorph: { value: 0 },
    uTime: { value: 0 },
    uIntro: { value: reducedMotion ? 1 : 0 },
    uSize: { value: 30 },
    uPixelRatio: { value: 1 },
    uMouse: { value: new THREE.Vector3(99, 99, 0) },
    uMouseStrength: { value: 0 },
    uOffsets: { value: Array.from({ length: SHAPE_COUNT }, () => new THREE.Vector3()) },
    uDims: { value: new Array(SHAPE_COUNT).fill(1) },
    uColA: { value: new THREE.Color("#7c5cff") },
    uColB: { value: new THREE.Color("#22d3ee") },
    uColC: { value: new THREE.Color("#f472b6") },
  };

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  const starCount = isMobile() ? 500 : 1400;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3] = rand(-30, 30);
    starPos[i * 3 + 1] = rand(-20, 20);
    starPos[i * 3 + 2] = rand(-30, -6);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({ color: 0x9aa4ff, size: 0.06, transparent: true, opacity: 0.55, depthWrite: false })
  );
  scene.add(stars);

  // Where each section's shape sits and how bright it is: feature sections get the shape beside the text,
  // reading-heavy sections push it back and dim it so it becomes ambience behind the cards.
  function layout() {
    const m = isMobile();
    const o = uniforms.uOffsets.value;
    const d = uniforms.uDims.value;
    o[0].set(m ? 0 : 2.9, m ? 1.1 : 0, m ? -2.5 : 0);
    o[1].set(m ? 0 : -2.6, 0, m ? -4 : -1.5);
    o[2].set(m ? 0 : 3, 0, m ? -4 : -2);
    o[3].set(m ? 0 : -3.6, 0, m ? -5 : -2);
    o[4].set(0, m ? 0 : -0.4, -3);
    o[5].set(0, 0, m ? -3 : 0);
    d.splice(0, SHAPE_COUNT, m ? 0.55 : 1, 0.7, 0.75, m ? 0.35 : 0.6, 0.45, m ? 0.7 : 0.95);
  }

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const pr = Math.min(window.devicePixelRatio, isMobile() ? 1.5 : 1.75);
    renderer.setPixelRatio(pr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    uniforms.uPixelRatio.value = pr;
    uniforms.uSize.value = isMobile() ? 34 : 30;
    layout();
    measureSections();
  }

  let sectionTops = [];
  function measureSections() {
    sectionTops = sections.map((el) => el.getBoundingClientRect().top + window.scrollY);
  }

  // Hold each shape while its section is read, then morph during the last part of the section.
  function targetMorph() {
    const y = window.scrollY + window.innerHeight * 0.5;
    let i = 0;
    while (i < sectionTops.length - 1 && y >= sectionTops[i + 1]) i++;
    if (i >= sectionTops.length - 1) return Math.min(i, SHAPE_COUNT - 1);
    const span = sectionTops[i + 1] - sectionTops[i];
    const frac = THREE.MathUtils.clamp((y - sectionTops[i]) / span, 0, 1);
    return Math.min(i + THREE.MathUtils.smoothstep(frac, 0.55, 1), SHAPE_COUNT - 1);
  }

  const pointer = new THREE.Vector2(0, 0);
  const pointerTarget = new THREE.Vector2(0, 0);
  let pointerActive = false;
  const raycaster = new THREE.Raycaster();
  const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  const hit = new THREE.Vector3();

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse") return;
    pointerTarget.set((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
    pointerActive = true;
  });
  document.addEventListener("pointerleave", () => { pointerActive = false; });

  const tmp = new THREE.Vector3();
  function updateOrbitChips(t) {
    if (!orbitChips.length) return;
    const heroWeight = THREE.MathUtils.clamp(1 - uniforms.uMorph.value, 0, 1) * uniforms.uIntro.value;
    const center = uniforms.uOffsets.value[0];
    const hidden = heroWeight < 0.02 || isMobile();
    orbitChips.forEach((chip, i) => {
      if (hidden) { chip.style.opacity = "0"; return; }
      const a = t * 0.25 + (i / orbitChips.length) * Math.PI * 2;
      tmp.set(Math.cos(a) * 2.45, Math.sin(a * 1.3) * 0.9 + (i - 1.5) * 0.55, Math.sin(a) * 2.45).add(center);
      const depth = (tmp.z - center.z + 2.45) / 4.9;
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * window.innerWidth;
      const y = (-tmp.y * 0.5 + 0.5) * window.innerHeight;
      chip.style.transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) scale(${0.75 + depth * 0.35})`;
      chip.style.opacity = String(heroWeight * (0.25 + depth * 0.75));
      chip.style.zIndex = depth > 0.5 ? "2" : "0";
    });
  }

  let running = !document.hidden;
  document.addEventListener("visibilitychange", () => {
    running = !document.hidden;
    if (running) clock.getDelta();
  });

  const clock = new THREE.Clock();
  let time = 0;
  let introStart = -1;

  function frame() {
    requestAnimationFrame(frame);
    if (!running) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    if (!reducedMotion) time += dt;
    uniforms.uTime.value = time;

    if (introStart >= 0 && uniforms.uIntro.value < 1) {
      uniforms.uIntro.value = Math.min((time - introStart) / 2.6, 1);
    }

    const target = targetMorph();
    const m = uniforms.uMorph;
    m.value += (target - m.value) * (reducedMotion ? 1 : Math.min(dt * 3.2, 1));
    if (Math.abs(target - m.value) < 0.0005) m.value = target;

    pointer.lerp(pointerTarget, Math.min(dt * 6, 1));
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(plane, hit)) uniforms.uMouse.value.copy(hit);
    const strengthTarget = pointerActive && !reducedMotion ? 1 : 0;
    uniforms.uMouseStrength.value += (strengthTarget - uniforms.uMouseStrength.value) * Math.min(dt * 4, 1);

    if (!reducedMotion) {
      points.rotation.y += dt * 0.09;
      points.rotation.x = Math.sin(time * 0.15) * 0.18;
      stars.rotation.y += dt * 0.004;
      camera.position.x += (pointer.x * 0.6 - camera.position.x) * Math.min(dt * 2, 1);
      camera.position.y += (pointer.y * 0.4 - camera.position.y) * Math.min(dt * 2, 1);
    }
    camera.lookAt(0, 0, 0);

    updateOrbitChips(time);
    renderer.render(scene, camera);
  }

  window.addEventListener("resize", resize);
  if ("ResizeObserver" in window) new ResizeObserver(measureSections).observe(document.body);
  resize();
  frame();

  return {
    playIntro() {
      if (introStart < 0) introStart = time;
    },
  };
}
