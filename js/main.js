import { createTagSphere } from "./tagsphere.js";
import { createSudokuDemo } from "./sudoku.js";

const root = document.documentElement;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

/* ── Text splitting ── */
function splitLetters(el) {
  const text = el.textContent;
  el.setAttribute("aria-label", text);
  el.style.setProperty("--n", text.length);
  el.textContent = "";
  [...text].forEach((ch, i) => {
    const span = document.createElement("span");
    span.className = "char";
    span.setAttribute("aria-hidden", "true");
    span.style.setProperty("--i", i);
    span.textContent = ch;
    el.appendChild(span);
  });
}

function splitWords(el) {
  let index = 0;
  const walk = (node) => {
    [...node.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        child.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(document.createTextNode(" "));
            return;
          }
          const word = document.createElement("span");
          word.className = "word";
          const inner = document.createElement("span");
          inner.className = "word__inner";
          inner.style.setProperty("--i", index++);
          inner.textContent = part;
          word.appendChild(inner);
          frag.appendChild(word);
        });
        child.replaceWith(frag);
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        walk(child);
      }
    });
  };
  walk(el);
}

document.querySelectorAll("[data-split-letters]").forEach(splitLetters);
document.querySelectorAll("[data-split-words]").forEach(splitWords);

/* ── WebGL scene (loaded lazily so a WebGL failure never breaks the page) ── */
let scene = null;
const sceneReady = import("./scene.js")
  .then(({ createScene }) => {
    scene = createScene({
      canvas: document.getElementById("webgl"),
      sections: [...document.querySelectorAll("[data-scene]")],
      orbitChips: [...document.querySelectorAll(".orbit-chip")],
      reducedMotion,
    });
    if (finished) scene.playIntro();
  })
  .catch((err) => {
    root.classList.add("no-webgl");
    console.warn("3D scene unavailable:", err);
  });

/* ── Preloader ── */
const preloader = document.querySelector(".preloader");
const countEl = document.querySelector(".preloader__count");
const barEl = document.querySelector(".preloader__bar span");
const tasks = [sceneReady, document.fonts ? document.fonts.ready : Promise.resolve(), new Promise((r) => (document.readyState === "complete" ? r() : window.addEventListener("load", r, { once: true })))];
let done = 0;
tasks.forEach((t) => t.finally(() => done++));

const minDuration = reducedMotion ? 200 : 1500;
const started = performance.now();
let shown = 0;
let finished = false;

function finishLoading() {
  if (finished) return;
  finished = true;
  root.classList.add("is-loaded");
  scene?.playIntro();
  setTimeout(() => preloader?.remove(), 1200);
  setTimeout(() => root.classList.add("intro-done"), 2400);
}

function tickPreloader(now) {
  if (finished) return;
  const elapsed = now - started;
  const timeCap = Math.min(elapsed / minDuration, 1);
  const target = Math.min(done / tasks.length, timeCap) * 100;
  shown += (target - shown) * 0.12;
  if (target === 100 && shown > 99.4) shown = 100;
  const value = Math.round(shown);
  countEl.textContent = String(value).padStart(3, "0");
  barEl.style.transform = `scaleX(${shown / 100})`;
  if (value >= 100 || elapsed > 6000) {
    finishLoading();
    return;
  }
  requestAnimationFrame(tickPreloader);
}
requestAnimationFrame(tickPreloader);

/* ── Custom cursor ── */
if (finePointer && !reducedMotion) {
  const cursor = document.querySelector(".cursor");
  const dot = cursor.querySelector(".cursor__dot");
  const ring = cursor.querySelector(".cursor__ring");
  const label = cursor.querySelector(".cursor__label");
  let mx = -100, my = -100, rx = -100, ry = -100;

  root.classList.add("has-cursor");
  window.addEventListener("pointermove", (e) => {
    mx = e.clientX;
    my = e.clientY;
    dot.style.transform = `translate3d(${mx}px, ${my}px, 0)`;
    cursor.classList.remove("is-hidden");
  });
  document.addEventListener("pointerleave", () => cursor.classList.add("is-hidden"));
  window.addEventListener("pointerdown", () => cursor.classList.add("is-down"));
  window.addEventListener("pointerup", () => cursor.classList.remove("is-down"));

  document.addEventListener("pointerover", (e) => {
    const target = e.target.closest("a, button, input, [data-cursor], .tag-sphere");
    cursor.classList.toggle("is-hover", !!target);
    cursor.classList.toggle("is-grab", !!target?.classList.contains("tag-sphere"));
    const text = target?.getAttribute("data-cursor") || "";
    label.textContent = text;
    cursor.classList.toggle("has-label", !!text);
  });

  const follow = () => {
    rx += (mx - rx) * 0.18;
    ry += (my - ry) * 0.18;
    ring.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
    requestAnimationFrame(follow);
  };
  follow();
}

/* ── Magnetic buttons ── */
if (finePointer && !reducedMotion) {
  document.querySelectorAll(".magnetic").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const x = e.clientX - (r.left + r.width / 2);
      const y = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px)`;
    });
    el.addEventListener("pointerleave", () => {
      el.style.transform = "";
    });
  });
}

/* ── 3D tilt + glare ── */
if (finePointer && !reducedMotion) {
  document.querySelectorAll(".tilt").forEach((el) => {
    const max = el.classList.contains("case__media") ? 7 : 9;
    let raf = 0;
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.setProperty("--rx", `${(0.5 - py) * max * 2}deg`);
        el.style.setProperty("--ry", `${(px - 0.5) * max * 2}deg`);
        el.style.setProperty("--gx", `${px * 100}%`);
        el.style.setProperty("--gy", `${py * 100}%`);
        el.classList.add("is-tilting");
      });
    });
    el.addEventListener("pointerleave", () => {
      cancelAnimationFrame(raf);
      el.classList.remove("is-tilting");
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
    });
  });
}

/* ── Reveal on scroll ── */
const revealTargets = document.querySelectorAll(".reveal, [data-split-words]");
if (reducedMotion || !("IntersectionObserver" in window)) {
  revealTargets.forEach((el) => el.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      const batch = entries.filter((e) => e.isIntersecting);
      batch.forEach((entry, i) => {
        entry.target.style.setProperty("--d", `${i * 90}ms`);
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0, rootMargin: "0px 0px -12% 0px" }
  );
  revealTargets.forEach((el) => revealObserver.observe(el));
}

/* ── Count-up stats ── */
function countUp(el) {
  const end = Number(el.dataset.count);
  const prefix = el.dataset.prefix || "";
  const suffix = el.dataset.suffix || "";
  if (reducedMotion) return;
  const t0 = performance.now();
  const dur = 1600;
  const step = (now) => {
    const p = Math.min((now - t0) / dur, 1);
    const eased = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    el.textContent = `${prefix}${Math.round(end * eased)}${suffix}`;
    if (p < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
const countObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      countUp(entry.target);
      countObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.6 }
);
document.querySelectorAll("[data-count]").forEach((el) => countObserver.observe(el));

/* ── Hero word rotator ── */
const words = [...document.querySelectorAll(".rotator__word")];
if (words.length > 1 && !reducedMotion) {
  let current = 0;
  setInterval(() => {
    words[current].classList.remove("is-active");
    words[current].classList.add("is-leaving");
    const leaving = words[current];
    setTimeout(() => leaving.classList.remove("is-leaving"), 700);
    current = (current + 1) % words.length;
    words[current].classList.add("is-active");
  }, 2600);
}

/* ── Nav: scrolled state, active section, progress bar, timeline fill ── */
const nav = document.querySelector(".nav");
const progress = document.querySelector(".scroll-progress span");
const timeline = document.querySelector(".timeline");
const timelineFill = document.querySelector(".timeline__fill");
const roles = [...document.querySelectorAll(".role")];
let ticking = false;

function onScroll() {
  const y = window.scrollY;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  nav.classList.toggle("is-scrolled", y > 40);
  progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;

  if (timeline) {
    const r = timeline.getBoundingClientRect();
    const start = window.innerHeight * 0.6;
    const p = Math.min(Math.max((start - r.top) / r.height, 0), 1);
    timelineFill.style.transform = `scaleY(${p})`;
    roles.forEach((role) => {
      role.classList.toggle("is-active", role.getBoundingClientRect().top < start);
    });
  }
  ticking = false;
}
window.addEventListener("scroll", () => {
  if (!ticking) {
    ticking = true;
    requestAnimationFrame(onScroll);
  }
}, { passive: true });
onScroll();

const navLinks = [...document.querySelectorAll(".nav__links a")];
const activeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${entry.target.id}`));
    });
  },
  { rootMargin: "-45% 0px -50% 0px" }
);
document.querySelectorAll("main section[id]").forEach((s) => activeObserver.observe(s));

/* ── Mobile menu ── */
const burger = document.querySelector(".nav__burger");
const menu = document.getElementById("mobile-menu");
function setMenu(open) {
  burger.setAttribute("aria-expanded", String(open));
  burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  root.classList.toggle("menu-open", open);
  if (open) {
    menu.hidden = false;
    requestAnimationFrame(() => menu.classList.add("is-open"));
  } else {
    menu.classList.remove("is-open");
    setTimeout(() => { if (!menu.classList.contains("is-open")) menu.hidden = true; }, 450);
  }
}
burger.addEventListener("click", () => setMenu(burger.getAttribute("aria-expanded") !== "true"));
menu.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && root.classList.contains("menu-open")) setMenu(false);
});

/* ── Copy email + toast ── */
const toast = document.querySelector(".toast");
let toastTimer = 0;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
}
document.querySelectorAll("[data-copy]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const text = btn.dataset.copy;
    try {
      await navigator.clipboard.writeText(text);
      showToast("Email copied to clipboard");
    } catch {
      showToast(text);
    }
  });
});

/* ── Local time + year ── */
const clock = document.querySelector("[data-clock]");
const fmt = new Intl.DateTimeFormat("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Kolkata" });
const updateClock = () => { clock.textContent = fmt.format(new Date()); };
updateClock();
setInterval(updateClock, 15000);
document.querySelector("[data-year]").textContent = new Date().getFullYear();

/* ── Interactive widgets ── */
const sphere = document.querySelector(".tag-sphere");
if (sphere) createTagSphere(sphere, { reducedMotion });
const sudoku = document.querySelector("[data-sudoku]");
if (sudoku) createSudokuDemo(sudoku);

console.log(
  "%cHey, fellow developer. %cThe background is ~15k GPU particles morphing between six shapes in a custom GLSL shader. Source: https://github.com/RAJNIKANT1021/Rajnikant",
  "color:#a78bfa;font-weight:700;font-size:13px",
  "color:#94a3b8;font-size:12px"
);
