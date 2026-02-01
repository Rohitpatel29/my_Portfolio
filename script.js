/* script.js — Interaction for Rohit Kumar portfolio
   - Smooth scrolling, active nav, theme toggle
   - Scroll reveal (IntersectionObserver)
   - Simple form validation + resume download
*/

// ---------- Utilities ----------
const qs = (s, el = document) => el.querySelector(s);
const qsa = (s, el = document) => Array.from(el.querySelectorAll(s));

// ---------- DOM Elements ----------
const navToggle = qs('#navToggle');
const nav = qs('#primary-navigation');
const navLinks = qsa('.nav-link');
const themeToggle = qs('#themeToggle');
const body = document.body;
const downloadBtn = qs('#downloadResume');
const form = qs('#contactForm');
const yearEl = qs('#year');

// set year
yearEl.textContent = new Date().getFullYear();

// ---------- Mobile nav: improved toggle, backdrop and focus-trap ----------
const backdrop = qs('#navBackdrop');
let _previousFocus = null;
let _trapHandler = null;

function getFocusable(container){
  const selectors = 'a[href],button:not([disabled]),input:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  return Array.from(container.querySelectorAll(selectors)).filter(el => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
}

function openMenu(){
  _previousFocus = document.activeElement;
  nav.setAttribute('data-visible','true');
  nav.setAttribute('aria-hidden','false');
  navToggle.setAttribute('aria-expanded','true');
  backdrop.dataset.hidden = 'false';
  backdrop.setAttribute('aria-hidden','false');
  document.documentElement.classList.add('menu-open');

  const focusable = getFocusable(nav);
  if (focusable.length) focusable[0].focus();

  // trap focus
  _trapHandler = (e) => {
    if (e.key !== 'Tab') return;
    const nodes = getFocusable(nav);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  document.addEventListener('keydown', _trapHandler);
}

function closeMenu(restoreFocus = true){
  nav.setAttribute('data-visible','false');
  nav.setAttribute('aria-hidden','true');
  navToggle.setAttribute('aria-expanded','false');
  backdrop.dataset.hidden = 'true';
  backdrop.setAttribute('aria-hidden','true');
  document.documentElement.classList.remove('menu-open');
  if (_trapHandler) document.removeEventListener('keydown', _trapHandler);
  _trapHandler = null;
  if (restoreFocus && _previousFocus) try{ _previousFocus.focus(); }catch(_){}
}

navToggle.addEventListener('click', () => {
  const isOpen = nav.getAttribute('data-visible') === 'true';
  if (isOpen) closeMenu(); else openMenu();
});

// close when backdrop clicked
backdrop.addEventListener('click', () => closeMenu());

// close mobile nav when a link is clicked (preserve existing behaviour)
navLinks.forEach(a => a.addEventListener('click', (e) => {
  // set immediate aria-current for instant feedback
  navLinks.forEach(n => n.removeAttribute('aria-current'));
  a.setAttribute('aria-current', 'true');
  closeMenu();
}));

// Keyboard navigation for the header nav (left/right/home/end)
qs('nav#primary-navigation')?.addEventListener('keydown', (e) => {
  const keys = ['ArrowRight','ArrowLeft','Home','End'];
  if (!keys.includes(e.key)) return;
  const links = navLinks;
  const idx = links.indexOf(document.activeElement);
  if (e.key === 'ArrowRight') { e.preventDefault(); links[(idx + 1 + links.length) % links.length].focus(); }
  if (e.key === 'ArrowLeft') { e.preventDefault(); links[(idx - 1 + links.length) % links.length].focus(); }
  if (e.key === 'Home') { e.preventDefault(); links[0].focus(); }
  if (e.key === 'End') { e.preventDefault(); links[links.length - 1].focus(); }
});

// close on escape (preserve existing behaviour)
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeMenu();
});

// close menu when viewport switches to desktop to avoid stale open state
const mm = window.matchMedia('(min-width:700px)');
mm.addEventListener?.('change', (ev) => { if (ev.matches) closeMenu(false); });


// ---------- Theme (persisted) ----------
const themeKey = 'rk_theme_v1';
const applyTheme = (theme) => {
  if (theme === 'light') document.documentElement.classList.add('theme-light');
  else document.documentElement.classList.remove('theme-light');
  const pressed = theme === 'light';
  themeToggle.setAttribute('aria-pressed', String(pressed));
};
const saved = localStorage.getItem(themeKey) || (window.matchMedia && window.matchMedia('(prefers-color-scheme:light)').matches ? 'light' : 'dark');
applyTheme(saved);
themeToggle.addEventListener('click', () => {
  const isLight = document.documentElement.classList.toggle('theme-light');
  const theme = isLight ? 'light' : 'dark';
  localStorage.setItem(themeKey, theme);
  applyTheme(theme);
});

// ---------- Smooth offset scrolling for fixed header ----------
// Use CSS smooth scrolling but offset for the fixed header
qsa('a[href^="#"]').forEach(link => {
  link.addEventListener('click', (e) => {
    const href = link.getAttribute('href');
    if (!href.startsWith('#') || href === '#') return;
    e.preventDefault();
    const target = document.querySelector(href);
    if (!target) return;
    const navH = document.querySelector('.site-header').offsetHeight + 12;
    const top = Math.max(target.getBoundingClientRect().top + window.scrollY - navH, 0);
    window.scrollTo({ top, behavior: 'smooth' });
  });
});

// ---------- Active nav on scroll ----------
const sections = qsa('main section[id]');
const sectionIdToNav = {};
navLinks.forEach(a => {
  const id = a.getAttribute('href')?.slice(1);
  if (id) sectionIdToNav[id] = a;
});

const currentSectionEl = qs('#currentSection');
const setActive = () => {
  const fromTop = window.scrollY + document.querySelector('.site-header').offsetHeight + 24;
  let current = sections[0];
  for (const sec of sections) {
    if (sec.offsetTop <= fromTop) current = sec;
  }
  const id = current?.id;

  // update nav active state + aria-current for accessibility
  navLinks.forEach(a => {
    const isActive = a.getAttribute('href') === `#${id}`;
    a.classList.toggle('active', isActive);
    if (isActive) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current');
  });

  // update header label (use the section's first H2 if available)
  if (currentSectionEl) {
    const h = current.querySelector('h2');
    const label = (h && h.textContent.trim()) || (id === 'hero' ? 'Home' : id);
    if (currentSectionEl.textContent !== label) {
      currentSectionEl.textContent = label;
      currentSectionEl.setAttribute('data-visible','true');
      // modest pulse to indicate change (respects reduced-motion via CSS)
      try{ currentSectionEl.animate([{ opacity: 0.92, transform: 'translateY(2px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.2,.9,.2,1)' }); }catch(e){}
    }
  }
};
window.addEventListener('scroll', setActive, { passive: true });
setActive();

/* Sections dropdown: build from page sections and provide accessible keyboard behavior */
(function sectionsDropdown(){
  const btn = qs('#sectionsToggle');
  const menu = qs('#sectionsMenu');
  if (!btn || !menu) return;

  // collect sections (include hero as Home)
  const items = [{ id: 'hero', label: 'Home' }].concat(Array.from(sections).map(s => {
    const h = s.querySelector('h2');
    return { id: s.id, label: h ? h.textContent.trim() : s.id };
  }).filter(i => i.id && i.id !== 'hero'));

  menu.innerHTML = items.map(it => `\n    <li><a role="menuitem" tabindex="-1" href="#${it.id}" data-id="${it.id}">${it.label}</a></li>`).join('');

  const links = Array.from(menu.querySelectorAll('a'));

  // helper to open/close
  let prevFocus = null;
  const open = () => {
    prevFocus = document.activeElement;
    btn.setAttribute('aria-expanded','true');
    menu.dataset.visible = 'true';
    menu.setAttribute('aria-hidden','false');
    document.addEventListener('pointerdown', onDocPointer);
    document.addEventListener('keydown', onKey);
    links[0]?.focus();
  };
  const close = (restore = true) => {
    btn.setAttribute('aria-expanded','false');
    menu.dataset.visible = 'false';
    menu.setAttribute('aria-hidden','true');
    document.removeEventListener('pointerdown', onDocPointer);
    document.removeEventListener('keydown', onKey);
    if (restore && prevFocus) try { prevFocus.focus(); } catch(e){}
  };

  const onDocPointer = (ev) => {
    if (!menu.contains(ev.target) && ev.target !== btn) close();
  };

  const onKey = (ev) => {
    const idx = links.indexOf(document.activeElement);
    if (ev.key === 'Escape') return close();
    if (ev.key === 'ArrowDown') { ev.preventDefault(); links[(idx + 1) % links.length].focus(); }
    if (ev.key === 'ArrowUp') { ev.preventDefault(); links[(idx - 1 + links.length) % links.length].focus(); }
    if (ev.key === 'Home') { ev.preventDefault(); links[0].focus(); }
    if (ev.key === 'End') { ev.preventDefault(); links[links.length - 1].focus(); }
    if (ev.key === 'Tab' && links.length) {
      // trap focus inside menu
      if (ev.shiftKey && document.activeElement === links[0]) { ev.preventDefault(); links[links.length - 1].focus(); }
      else if (!ev.shiftKey && document.activeElement === links[links.length - 1]) { ev.preventDefault(); links[0].focus(); }
    }
  };

  btn.addEventListener('click', (e) => {
    const openState = menu.dataset.visible === 'true';
    if (openState) close(); else open();
  });

  // close on selection and update aria-current
  links.forEach(a => a.addEventListener('click', (ev) => {
    // let the smooth scroll handler run; close immediately
    close();
  }));

  // reflect active section in the menu
  const reflectActive = () => {
    const id = sections.find(s => s.getBoundingClientRect().top <= (window.innerHeight * 0.35))?.id || 'hero';
    links.forEach(l => l.removeAttribute('aria-current'));
    const active = links.find(l => l.dataset.id === id);
    if (active) active.setAttribute('aria-current','true');
  };
  window.addEventListener('scroll', reflectActive, { passive: true });
  reflectActive();
})();

// ---------- Scroll reveal (custom) ----------
const io = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('reveal');
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });
qsa('[data-reveal]').forEach(el => io.observe(el));

// ---------- Simple form validation (client-only) ----------
const showError = (el, msg) => { el.textContent = msg; el.previousElementSibling?.classList?.add('invalid'); };
const clearError = (el) => { el.textContent = ''; el.previousElementSibling?.classList?.remove('invalid'); };

form.addEventListener('submit', (ev) => {
  ev.preventDefault();
  const name = qs('#name').value.trim();
  const email = qs('#email').value.trim();
  const message = qs('#message').value.trim();
  let ok = true;

  // name
  if (name.length < 2) { showError(qs('#nameError'), 'Please enter your name.'); ok = false; } else clearError(qs('#nameError'));

  // email
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email)) { showError(qs('#emailError'), 'Enter a valid email.'); ok = false; } else clearError(qs('#emailError'));

  // message
  if (message.length < 10) { showError(qs('#messageError'), 'Message must be at least 10 characters.'); ok = false; } else clearError(qs('#messageError'));

  if (!ok) {
    qs('#formNote').textContent = 'Please fix the errors above.';
    return;
  }

  // simulate send (no backend) — provide a friendly confirmation and clear
  qs('#formNote').textContent = 'Thanks — your message was validated (demo). You can also email directly.';
  form.reset();
  setTimeout(() => qs('#formNote').textContent = '', 6000);
});

// ---------- Resume download (generates a simple resume file client-side) ----------
function generateResumeText() {
  return `Rohit Kumar\nJava Backend Developer | B.Tech CSE\nEmail: rohitkumarer0045@email.com\nPhone: +91 9304070908\n\nPROFILE\nDetail-oriented B.Tech CSE student with hands-on experience in Java, Spring Boot, REST APIs and SQL. Interested in secure, scalable, transaction-based backend systems.\n\nSKILLS\nJava, Spring Boot, RESTful APIs, Hibernate, MySQL, Git, Maven, Postman\n\nPROJECTS\n1) Student Management System — Core Java, Collections, OOP\n2) YouTube SEO Tags & Thumbnails — Spring Boot, REST, Thymeleaf\n3) Backend Fitness App — Microservices, RabbitMQ, MySQL\n\nEDUCATION\nB.Tech CSE — DRIEMS University (2022-2026) — CGPA: 8.4\n\nTRAINING\nSPCL Infotech Services Pvt. Ltd. — Backend Development (2026 – Present)\n\nLinks: https://github.com/Rohitpatel29 | https://www.linkedin.com/in/rohit-kumar-666a2629a`;
}

downloadBtn.addEventListener('click', () => {
  const blob = new Blob([generateResumeText()], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'Rohit_Kumar_Resume.txt';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

// ---------- Small helpers ----------
function openRepo(ev, url){
  ev.preventDefault();
  window.open(url, '_blank', 'noopener');
}

// Keyboard accessibility: close mobile nav with Escape
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    nav.setAttribute('data-visible', 'false');
    navToggle.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('menu-open');
  }
});

// Animate skill bars when visible + card/hero micro-interactions
(function(){
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Skill bars: animate when in viewport
  if (!reduce) {
    const barObserver = new IntersectionObserver((entries, o) => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const bars = en.target.querySelectorAll('.bar > div');
        bars.forEach(b => {
          const pc = b.style.getPropertyValue('--pc') || getComputedStyle(b).getPropertyValue('--pc') || b.getAttribute('data-pc') || '60%';
          b.style.setProperty('--target', pc);
        });
        o.unobserve(en.target);
      });
    }, { threshold: 0.18 });

    qsa('.skills-grid, .skill-card').forEach(s => barObserver.observe(s));
  } else {
    // reduced motion: ensure bars show final state
    qsa('.bar > div').forEach(d => d.style.width = d.style.getPropertyValue('--pc') || '60%');
  }

  // Card tilt (pointer devices only)
  const supportsPointer = window.matchMedia('(pointer:fine)').matches && !reduce;
  if (supportsPointer) {
    const tilt = (el, ev) => {
      const r = el.getBoundingClientRect();
      const px = (ev.clientX - r.left) / r.width - 0.5; // -0.5 -> 0.5
      const py = (ev.clientY - r.top) / r.height - 0.5;
      const rx = (py * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tilt-strength')))*-1;
      const ry = (px * parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--tilt-strength')));
      el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
    };

    const reset = (el) => { el.style.transform = ''; };

    qsa('.card, .project').forEach(card => {
      let raf = null;
      const onMove = (ev) => { if (raf) cancelAnimationFrame(raf); raf = requestAnimationFrame(() => tilt(card, ev)); };
      card.addEventListener('pointermove', onMove);
      card.addEventListener('pointerleave', () => { if (raf) cancelAnimationFrame(raf); reset(card); });
    });

    // Hero visual subtle parallax
    const hero = qs('.hero-visual');
    if (hero) {
      let rafH = null;
      hero.addEventListener('pointermove', (ev) => {
        if (rafH) cancelAnimationFrame(rafH);
        rafH = requestAnimationFrame(() => {
          const cx = (ev.clientX - window.innerWidth/2) / (window.innerWidth/2);
          const cy = (ev.clientY - window.innerHeight/2) / (window.innerHeight/2);
          hero.style.transform = `translate3d(${cx * 6}px, ${cy * 6}px, 0) rotateX(${cy * 1}deg) rotateY(${cx * 1}deg)`;
        });
      });
      hero.addEventListener('pointerleave', () => hero.style.transform = '');
    }

    // CTA sheen on pointerenter for accessibility-friendly micro-feedback
    qsa('.btn-primary').forEach(btn => {
      btn.addEventListener('pointerenter', () => btn.classList.add('hover'));
      btn.addEventListener('pointerleave', () => btn.classList.remove('hover'));
    });
  }

  // Entrance animation for primary CTAs
  qsa('.hero-ctas .btn-primary').forEach(b => b.classList.add('entrance'));
})();

/* ------------------
   Typing / rotating role (hero)
   - Vanilla JS, accessible, respects reduced-motion
   - Minimal DOM footprint: updates #typed and shows a blinking cursor
   ------------------ */
(function heroTyping(){
  const el = qs('#typed');
  const cursor = qs('.cursor');
  if (!el) return;

  const roles = [
    'Java Backend Developer',
    'Spring Boot Enthusiast',
    'Backend Systems Learner'
  ];

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) {
    // Respect user preference: show first role statically and hide cursor
    el.textContent = roles[0];
    if (cursor) cursor.style.display = 'none';
    return;
  }

  // Config (subtle, professional timing)
  const TYPING = 60;      // ms per char (typing)
  const DELETING = 40;    // ms per char (deleting)
  const PAUSE = 1400;     // pause after full word
  const LOOP_PAUSE = 600; // pause between cycles

  let index = 0;
  let char = 0;
  let deleting = false;
  let timer = null;

  // Update aria-label for screen readers less frequently
  const updateA11y = (text) => el.setAttribute('aria-label', text + ' — Rohit Kumar, CS Student');

  function step() {
    const full = roles[index];
    if (!deleting) {
      char++;
      el.textContent = full.slice(0, char);
      if (char === full.length) {
        updateA11y(full);
        deleting = true;
        timer = setTimeout(step, PAUSE);
        return;
      }
      timer = setTimeout(step, TYPING + Math.random() * 30);
    } else {
      char--;
      el.textContent = full.slice(0, char);
      if (char === 0) {
        deleting = false;
        index = (index + 1) % roles.length;
        timer = setTimeout(step, LOOP_PAUSE);
        return;
      }
      timer = setTimeout(step, DELETING);
    }
  }

  // Kick off slightly after hero reveal to keep it subtle
  setTimeout(() => step(), 700);

  // Clean up if the element is removed
  const obs = new MutationObserver(() => {
    if (!document.contains(el)) {
      clearTimeout(timer);
      obs.disconnect();
    }
  });
  obs.observe(document.documentElement, { childList: true, subtree: true });
})();

// Reduce motion accessibility
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.style.scrollBehavior = 'auto';
  qsa('[data-reveal]').forEach(el => el.classList.add('reveal'));
}
