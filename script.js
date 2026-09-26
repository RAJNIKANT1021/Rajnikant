/* ── THEME TOGGLE ── */
const root = document.documentElement;
const toggleBtns = [
  document.getElementById("theme-toggle-desk"),
  document.getElementById("theme-toggle-mob"),
];

function applyTheme(theme) {
  root.setAttribute("data-theme", theme);
  localStorage.setItem("theme", theme);
  toggleBtns.forEach((btn) => {
    if (!btn) return;
    const sun  = btn.querySelector(".icon-sun");
    const moon = btn.querySelector(".icon-moon");
    if (theme === "dark") {
      sun.style.display  = "";
      moon.style.display = "none";
    } else {
      sun.style.display  = "none";
      moon.style.display = "";
    }
  });
}

// Restore saved preference (default: dark)
applyTheme(localStorage.getItem("theme") || "dark");

toggleBtns.forEach((btn) => {
  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    applyTheme(next);
  });
});

/* ── HAMBURGER MENU ── */
function toggleMenu() {
  const menu = document.querySelector(".menu-links");
  const icon = document.querySelector(".hamburger-icon");
  menu.classList.toggle("open");
  icon.classList.toggle("open");
}

document.addEventListener("click", (e) => {
  const nav = document.getElementById("hamburger-nav");
  if (nav && !nav.contains(e.target)) {
    document.querySelector(".menu-links")?.classList.remove("open");
    document.querySelector(".hamburger-icon")?.classList.remove("open");
  }
});

/* ── ACTIVE NAV HIGHLIGHT ON SCROLL ── */
const sections = document.querySelectorAll("section[id]");
const navAnchors = document.querySelectorAll(
  "#desktop-nav .nav-links a, .footer-nav a"
);

const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        navAnchors.forEach((a) => {
          const isActive = a.getAttribute("href") === "#" + entry.target.id;
          a.style.color = isActive ? "var(--accent)" : "";
        });
      }
    });
  },
  { rootMargin: "-40% 0px -55% 0px" }
);

sections.forEach((s) => sectionObserver.observe(s));

/* ── SCROLL-REVEAL ── */
const revealEls = document.querySelectorAll(".reveal");

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // stagger siblings inside the same parent
        const siblings = Array.from(
          entry.target.parentElement.querySelectorAll(".reveal:not(.visible)")
        );
        const delay = siblings.indexOf(entry.target) * 80;
        setTimeout(() => {
          entry.target.classList.add("visible");
        }, delay);
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

revealEls.forEach((el) => revealObserver.observe(el));

/* ── SMOOTH NAV SCROLL with offset for fixed header ── */
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", (e) => {
    const target = document.querySelector(anchor.getAttribute("href"));
    if (!target) return;
    e.preventDefault();
    const offset = 72;
    const top = target.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  });
});

/* ── 3D TILT / DEPTH-PARALLAX ON CARDS ── */
const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (canHover && !reduceMotion) {
  const MAX_TILT = 10; // degrees

  document.querySelectorAll(".tilt").forEach((el) => {
    let raf = null;

    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const px = (e.clientX - rect.left) / rect.width;
      const py = (e.clientY - rect.top) / rect.height;
      const rx = (0.5 - py) * MAX_TILT * 2;
      const ry = (px - 0.5) * MAX_TILT * 2;

      el.style.transition = "none";
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        el.style.setProperty("--glare-x", `${px * 100}%`);
        el.style.setProperty("--glare-y", `${py * 100}%`);
      });
    });

    el.addEventListener("mouseleave", () => {
      if (raf) cancelAnimationFrame(raf);
      el.style.transition = "transform 0.5s cubic-bezier(.4,0,.2,1)";
      el.style.transform = "";
    });
  });
}
