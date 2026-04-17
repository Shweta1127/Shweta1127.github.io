/**
 * APP.JS — Portfolio Theme Engine + UI Controller
 *
 * Architecture:
 *   ThemeManager  — switches data-theme, persists to localStorage
 *   Typewriter    — cycles role strings with per-character animation
 *   Counter       — animates stat numbers when they enter viewport
 *   HeroCanvas    — theme-specific canvas effects (particles / petals / matrix)
 *   ScrollReveal  — IntersectionObserver fade-in for .reveal elements
 *   NavManager    — active link highlighting + mobile menu
 *   PetalSystem   — DOM petal elements for SAKURA theme
 *
 * Theme switching flow:
 *   1. User clicks a .theme-btn
 *   2. ThemeManager.apply(name) fires
 *   3. Adds .theme-transitioning to <html> (enables CSS transitions globally)
 *   4. Sets data-theme="name" on <html>  ← CSS variables swap instantly
 *   5. Saves choice to localStorage
 *   6. Removes .theme-transitioning after 500ms
 *   7. Fires runEffects() for theme-specific JS behaviors
 */

'use strict';

/* ═════════════════════════════════════════════════════════════════
   THEME MANAGER
═════════════════════════════════════════════════════════════════ */
const ThemeManager = (() => {

  const STORAGE_KEY = 'shweta-portfolio-theme';
  const DEFAULT     = 'void';
  const THEMES      = ['void', 'sakura', 'terminal'];

  let _current = DEFAULT;

  /** Read the selected theme from localStorage (or use default). */
  function getSaved() {
    const saved = localStorage.getItem(STORAGE_KEY);
    return THEMES.includes(saved) ? saved : DEFAULT;
  }

  /**
   * Apply a theme by name.
   * Does the heavy lifting: CSS var swap, transition class, side effects.
   */
  function apply(name) {
    if (!THEMES.includes(name)) return;
    if (name === _current) return;

    const html = document.documentElement;

    // 1. Enable global CSS transitions so colors blend smoothly
    html.classList.add('theme-transitioning');

    // 2. Swap the data-theme attribute → all CSS variables update
    html.setAttribute('data-theme', name);
    _current = name;

    // 3. Persist selection
    localStorage.setItem(STORAGE_KEY, name);

    // 4. Update UI controls
    _updateButtons(name);
    _updateFooterLabel(name);

    // 5. Remove the transition class after it completes
    setTimeout(() => html.classList.remove('theme-transitioning'), 500);

    // 6. Restart canvas and DOM effects for the new theme
    HeroCanvas.init(name);
    PetalSystem.update(name);
  }

  /** Mark the correct .theme-btn as active and deactivate others. */
  function _updateButtons(name) {
    document.querySelectorAll('.theme-btn').forEach(btn => {
      const isActive = btn.dataset.themeTarget === name;
      btn.classList.toggle('active', isActive);
      btn.setAttribute('aria-pressed', isActive);
    });
  }

  /** Update the footer "Theme: X" label. */
  function _updateFooterLabel(name) {
    const el = document.getElementById('footer-theme-name');
    if (el) el.textContent = name.toUpperCase();
  }

  /** Initialize on page load. */
  function init() {
    const saved = getSaved();
    _current = saved;
    document.documentElement.setAttribute('data-theme', saved);
    _updateButtons(saved);
    _updateFooterLabel(saved);

    // Bind click handlers to each theme button
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => apply(btn.dataset.themeTarget));
    });
  }

  return { init, apply, getCurrent: () => _current };
})();


/* ═════════════════════════════════════════════════════════════════
   TYPEWRITER EFFECT
   Cycles through an array of role strings with realistic typing.
═════════════════════════════════════════════════════════════════ */
const Typewriter = (() => {

  const ROLES = [
    'Software Developer',
    'Java Engineer',
    'AWS Specialist',
    'Spring Boot Dev',
    'Microservices Builder',
    'Anime Enjoyer',
  ];

  let roleIndex    = 0;
  let charIndex    = 0;
  let isDeleting   = false;
  let timeoutId    = null;
  let target       = null;

  const SPEED_TYPE = 80;
  const SPEED_DEL  = 45;
  const PAUSE_END  = 1800;
  const PAUSE_DEL  = 400;

  function tick() {
    if (!target) return;

    const current = ROLES[roleIndex];

    if (isDeleting) {
      charIndex--;
      target.textContent = current.slice(0, charIndex);
      if (charIndex === 0) {
        isDeleting = false;
        roleIndex  = (roleIndex + 1) % ROLES.length;
        timeoutId  = setTimeout(tick, PAUSE_DEL);
        return;
      }
    } else {
      charIndex++;
      target.textContent = current.slice(0, charIndex);
      if (charIndex === current.length) {
        timeoutId = setTimeout(() => { isDeleting = true; tick(); }, PAUSE_END);
        return;
      }
    }

    timeoutId = setTimeout(tick, isDeleting ? SPEED_DEL : SPEED_TYPE);
  }

  function init() {
    target = document.getElementById('role-typewriter');
    if (!target) return;
    setTimeout(tick, 1200); // delay so page load animations finish
  }

  return { init };
})();


/* ═════════════════════════════════════════════════════════════════
   STAT COUNTER ANIMATION
   Counts up numbers when the stat cards scroll into view.
═════════════════════════════════════════════════════════════════ */
const Counter = (() => {

  function animateTo(el, target, duration = 1500) {
    const start     = performance.now();
    const easeOut   = t => 1 - Math.pow(1 - t, 3);

    function step(now) {
      const elapsed  = now - start;
      const progress = Math.min(elapsed / duration, 1);
      el.textContent = Math.round(easeOut(progress) * target);
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  function init() {
    const nums = document.querySelectorAll('.stat-number[data-target]');
    if (!nums.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el     = entry.target;
          const target = parseInt(el.dataset.target, 10);
          animateTo(el, target);
          observer.unobserve(el); // only animate once
        }
      });
    }, { threshold: 0.4 });

    nums.forEach(n => observer.observe(n));
  }

  return { init };
})();


/* ═════════════════════════════════════════════════════════════════
   HERO CANVAS
   Three distinct visual effects, one per theme:
     VOID     → drifting neon particle field
     SAKURA   → gentle falling petals on canvas
     TERMINAL → matrix rain (katakana + numbers)
═════════════════════════════════════════════════════════════════ */
const HeroCanvas = (() => {

  let canvas, ctx, animId, currentTheme;

  // ── shared helpers ──────────────────────────────────────────────
  function getSize() {
    return { w: canvas.offsetWidth, h: canvas.offsetHeight };
  }

  function resize() {
    const { w, h } = getSize();
    canvas.width  = w * devicePixelRatio;
    canvas.height = h * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);
  }

  // ── VOID: neon particle field ───────────────────────────────────
  function voidEffect() {
    const { w, h } = getSize();
    const particles = Array.from({ length: 80 }, () => ({
      x:    Math.random() * w,
      y:    Math.random() * h,
      vx:   (Math.random() - 0.5) * 0.35,
      vy:   (Math.random() - 0.5) * 0.35,
      r:    Math.random() * 1.5 + 0.5,
      hue:  Math.random() < 0.6 ? 186 : 320, // cyan or pink
      life: Math.random(),
    }));

    function draw() {
      const { w, h } = getSize();
      ctx.clearRect(0, 0, w, h);

      particles.forEach(p => {
        p.x  += p.vx;
        p.y  += p.vy;
        p.life += 0.003;

        // Wrap around edges
        if (p.x < 0) p.x = w;
        if (p.x > w) p.x = 0;
        if (p.y < 0) p.y = h;
        if (p.y > h) p.y = 0;

        const alpha = 0.3 + Math.sin(p.life * Math.PI * 2) * 0.25;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 65%, ${alpha})`;
        ctx.fill();
      });

      // Draw faint connecting lines for nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx   = particles[i].x - particles[j].x;
          const dy   = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 90) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(0, 245, 255, ${(1 - dist / 90) * 0.07})`;
            ctx.lineWidth   = 0.5;
            ctx.stroke();
          }
        }
      }

      animId = requestAnimationFrame(draw);
    }

    draw();
  }

  // ── SAKURA: canvas petals ───────────────────────────────────────
  function sakuraEffect() {
    const { w, h } = getSize();

    const petals = Array.from({ length: 40 }, () => ({
      x:    Math.random() * w,
      y:    Math.random() * h - h,
      size: Math.random() * 8 + 5,
      rot:  Math.random() * Math.PI * 2,
      vx:   (Math.random() - 0.5) * 0.8,
      vy:   Math.random() * 0.6 + 0.3,
      vr:   (Math.random() - 0.5) * 0.02,
      hue:  340 + Math.random() * 20,
      sat:  70 + Math.random() * 20,
      lit:  75 + Math.random() * 15,
    }));

    function draw() {
      const { w, h } = getSize();
      ctx.clearRect(0, 0, w, h);

      petals.forEach(p => {
        p.x   += p.vx + Math.sin(p.rot * 2) * 0.3;
        p.y   += p.vy;
        p.rot += p.vr;

        if (p.y > h + 20) {
          p.y = -20;
          p.x = Math.random() * w;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);

        // Draw a stylized petal shape
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, 0.6)`;
        ctx.fill();

        ctx.restore();
      });

      animId = requestAnimationFrame(draw);
    }

    draw();
  }

  // ── TERMINAL: matrix rain ───────────────────────────────────────
  function terminalEffect() {
    const { w, h } = getSize();

    // Katakana + numbers for authentic "matrix" feel
    const CHARS  = 'アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ABCDEF';
    const COL_W  = 18;
    const cols   = Math.floor(w / COL_W);
    const drops  = Array.from({ length: cols }, () => Math.random() * -50);

    function draw() {
      const { w, h } = getSize();
      // Fade trail
      ctx.fillStyle = 'rgba(8, 8, 8, 0.05)';
      ctx.fillRect(0, 0, w, h);

      ctx.font      = `${COL_W - 2}px "VT323", monospace`;
      ctx.textAlign = 'center';

      drops.forEach((y, i) => {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)];
        const x    = i * COL_W + COL_W / 2;

        // Head character is bright white-green
        ctx.fillStyle = `rgba(200, 255, 220, ${Math.random() * 0.4 + 0.6})`;
        ctx.fillText(char, x, y * COL_W);

        // Body character is phosphor green
        ctx.fillStyle = `rgba(0, 255, 65, ${Math.random() * 0.3 + 0.2})`;
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], x, (y - 1) * COL_W);

        // Advance drop; random chance to reset to top
        drops[i]++;
        if (drops[i] * COL_W > h && Math.random() > 0.975) {
          drops[i] = 0;
        }
      });

      animId = requestAnimationFrame(draw);
    }

    draw();
  }

  /** Stop any running animation and start the one for the given theme. */
  function init(theme) {
    if (!canvas) return;

    cancelAnimationFrame(animId);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    currentTheme = theme;

    resize();

    switch (theme) {
      case 'void':     return voidEffect();
      case 'sakura':   return sakuraEffect();
      case 'terminal': return terminalEffect();
    }
  }

  function setup() {
    canvas = document.getElementById('hero-canvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    resize();
    window.addEventListener('resize', () => {
      resize();
      // Re-init to fit new dimensions
      cancelAnimationFrame(animId);
      init(ThemeManager.getCurrent());
    });
  }

  return { setup, init };
})();


/* ═════════════════════════════════════════════════════════════════
   PETAL SYSTEM (DOM layer)
   SAKURA theme adds a light DOM-level petal animation.
   VOID / TERMINAL remove these elements entirely.
═════════════════════════════════════════════════════════════════ */
const PetalSystem = (() => {
  const PETAL_COUNT = 12;
  let petals = [];

  function create() {
    remove();
    petals = Array.from({ length: PETAL_COUNT }, (_, i) => {
      const el = document.createElement('div');
      el.className  = 'sakura-petal';
      el.style.cssText = `
        left: ${Math.random() * 100}vw;
        top:  ${Math.random() * -20}vh;
        width:  ${8 + Math.random() * 8}px;
        height: ${8 + Math.random() * 8}px;
        animation-duration: ${8 + Math.random() * 12}s;
        animation-delay:    ${Math.random() * 10}s;
        opacity: ${0.4 + Math.random() * 0.4};
        background: hsl(${340 + Math.random() * 20}, ${70 + Math.random() * 20}%, ${75 + Math.random() * 15}%);
      `;
      document.body.appendChild(el);
      return el;
    });
  }

  function remove() {
    petals.forEach(el => el.remove());
    petals = [];
  }

  function update(theme) {
    if (theme === 'sakura') create();
    else                    remove();
  }

  return { update };
})();


/* ═════════════════════════════════════════════════════════════════
   SCROLL REVEAL
   Uses IntersectionObserver to add .visible to .reveal elements.
═════════════════════════════════════════════════════════════════ */
const ScrollReveal = (() => {

  function init() {
    const els = document.querySelectorAll('.reveal');
    if (!els.length) return;

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    els.forEach(el => observer.observe(el));
  }

  return { init };
})();


/* ═════════════════════════════════════════════════════════════════
   NAV MANAGER
   - Highlights nav links based on scroll position
   - Mobile menu toggle
   - TERMINAL theme: changes greeting text to look like boot seq
═════════════════════════════════════════════════════════════════ */
const NavManager = (() => {

  const SECTIONS = ['hero', 'about', 'skills', 'projects', 'contact'];

  function updateActiveLink() {
    const scrollY = window.scrollY + window.innerHeight * 0.35;

    let active = SECTIONS[0];
    SECTIONS.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.offsetTop <= scrollY) active = id;
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.toggle('active', link.dataset.section === active);
    });
  }

  function initMobileMenu() {
    const toggle = document.querySelector('.nav-toggle');
    const links  = document.querySelector('.nav-links');
    const switcher = document.querySelector('.theme-switcher');
    if (!toggle || !links) return;

    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      links.classList.toggle('open', !open);
      if (switcher) switcher.classList.toggle('open', !open);
    });

    // Close on nav link click
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        toggle.setAttribute('aria-expanded', 'false');
        links.classList.remove('open');
        if (switcher) switcher.classList.remove('open');
      });
    });
  }

  function init() {
    window.addEventListener('scroll', updateActiveLink, { passive: true });
    updateActiveLink();
    initMobileMenu();
  }

  return { init };
})();


/* ═════════════════════════════════════════════════════════════════
   HERO GREETING ANIMATOR
   Changes the // comment in the hero greeting to match the theme.
═════════════════════════════════════════════════════════════════ */
const GreetingAnimator = (() => {

  const GREETINGS = {
    void:     '// initializing neural interface...',
    sakura:   '// はじめまして — nice to meet you',
    terminal: 'root@portfolio:~$ ./init.sh',
  };

  function update(theme) {
    const el = document.getElementById('hero-greeting-text');
    if (!el) return;

    el.style.opacity = '0';
    setTimeout(() => {
      el.textContent = GREETINGS[theme] || GREETINGS.void;
      el.style.transition = 'opacity 0.4s ease';
      el.style.opacity = '1';
    }, 200);
  }

  function init() {
    // Hook into ThemeManager by patching apply (clean observer pattern)
    const originalApply = ThemeManager.apply;
    const patchedApply  = function(name) {
      originalApply(name);
      update(name);
    };
    // Replace on ThemeManager's internal buttons (already bound in ThemeManager.init)
    document.querySelectorAll('.theme-btn').forEach(btn => {
      btn.addEventListener('click', () => update(btn.dataset.themeTarget));
    });
  }

  return { init, update };
})();


/* ═════════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUT
   Press 1 / 2 / 3 to cycle themes quickly.
═════════════════════════════════════════════════════════════════ */
function initKeyboardShortcuts() {
  const map = { '1': 'void', '2': 'sakura', '3': 'terminal' };
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    const theme = map[e.key];
    if (theme) {
      ThemeManager.apply(theme);
      GreetingAnimator.update(theme);
    }
  });
}


/* ═════════════════════════════════════════════════════════════════
   BOOT SEQUENCE
   Everything wired together on DOMContentLoaded.
═════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {

  // 1. Theme: restore from localStorage and bind buttons
  ThemeManager.init();

  // 2. Canvas effect matching the saved theme
  HeroCanvas.setup();
  HeroCanvas.init(ThemeManager.getCurrent());

  // 3. DOM petal system (SAKURA only)
  PetalSystem.update(ThemeManager.getCurrent());

  // 4. Hero greeting
  GreetingAnimator.init();
  GreetingAnimator.update(ThemeManager.getCurrent());

  // 5. Typewriter role text
  Typewriter.init();

  // 6. Scroll-triggered counter animation
  Counter.init();

  // 7. Scroll reveal for sections
  ScrollReveal.init();

  // 8. Nav link highlight + mobile menu
  NavManager.init();

  // 9. Keyboard theme shortcuts (1 / 2 / 3)
  initKeyboardShortcuts();

  console.log(
    '%c SHWETA SURYAVANSHI PORTFOLIO ',
    'background:#00f5ff;color:#000;font-weight:bold;padding:4px 8px',
    '\nPress 1 = VOID, 2 = SAKURA, 3 = TERMINAL to switch themes.'
  );
});
