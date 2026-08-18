/*
  Rent Easy — core interactions
  Everything is progressive: markup works without JS, this layer adds polish.
*/
(function () {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;
  const isRTL = () => document.documentElement.getAttribute('dir') === 'rtl';

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  /* ------------------------------------------------------------------ *
   * Toasts — shared notification channel (window.toast)
   * ------------------------------------------------------------------ */
  let toastStack;

  function toast(message, type = 'info', duration = 3600) {
    if (!toastStack) {
      toastStack = document.createElement('div');
      toastStack.className = 'toast-stack';
      toastStack.setAttribute('role', 'status');
      toastStack.setAttribute('aria-live', 'polite');
      document.body.appendChild(toastStack);
    }

    const icons = { success: 'ph-check-circle', error: 'ph-warning-circle', info: 'ph-info' };
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `<i class="ph-fill ${icons[type] || icons.info}"></i><span></span>`;
    el.lastElementChild.textContent = message;
    toastStack.appendChild(el);

    setTimeout(() => {
      el.classList.add('leaving');
      el.addEventListener('animationend', () => el.remove(), { once: true });
    }, duration);
  }

  window.toast = toast;

  // Small public surface so page-specific scripts can reuse these helpers
  window.RentEasy = { toast, prefersReducedMotion };

  /* ------------------------------------------------------------------ *
   * Injected chrome — scroll progress + back to top
   * ------------------------------------------------------------------ */
  function buildChrome() {
    const bar = document.createElement('div');
    bar.className = 'scroll-progress';
    document.body.appendChild(bar);

    const toTop = document.createElement('button');
    toTop.className = 'to-top';
    toTop.type = 'button';
    toTop.setAttribute('aria-label', 'Back to top');
    toTop.innerHTML = '<i class="ph ph-arrow-up"></i>';
    toTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
    document.body.appendChild(toTop);

    const navbar = $('.navbar');
    let ticking = false;

    function onScroll() {
      const y = window.scrollY;
      const max = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.transform = `scaleX(${max > 0 ? Math.min(y / max, 1) : 0})`;

      if (navbar) navbar.classList.toggle('scrolled', y > 24);
      toTop.classList.toggle('show', y > 600);
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(onScroll);
      }
    }, { passive: true });

    onScroll();
  }

  /* ------------------------------------------------------------------ *
   * Mobile drawer
   * ------------------------------------------------------------------ */
  function initDrawer() {
    const hamburger = $('.hamburger');
    const drawer = $('.mobile-drawer');
    const overlay = $('.drawer-overlay');
    const closeBtn = $('.close-drawer');
    if (!drawer) return;

    let lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      drawer.classList.add('open');
      overlay && overlay.classList.add('open');
      document.body.style.overflow = 'hidden';
      drawer.setAttribute('aria-hidden', 'false');
      const first = drawer.querySelector('a, button');
      first && setTimeout(() => first.focus(), 120);
    }

    function close() {
      drawer.classList.remove('open');
      overlay && overlay.classList.remove('open');
      document.body.style.overflow = '';
      drawer.setAttribute('aria-hidden', 'true');
      lastFocus && lastFocus.focus();
    }

    function toggle() {
      drawer.classList.contains('open') ? close() : open();
    }

    hamburger && hamburger.addEventListener('click', toggle);
    closeBtn && closeBtn.addEventListener('click', close);
    overlay && overlay.addEventListener('click', close);
    $$('.drawer-links a', drawer).forEach(a => a.addEventListener('click', close));

    document.addEventListener('keydown', (e) => {
      if (!drawer.classList.contains('open')) return;

      if (e.key === 'Escape') { close(); return; }

      if (e.key === 'Tab') {
        const focusables = $$('a[href], button:not([disabled])', drawer);
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    });
  }

  /* ------------------------------------------------------------------ *
   * Theme + direction
   * ------------------------------------------------------------------ */
  function initTheme() {
    const html = document.documentElement;
    const toggles = $$('.theme-toggle');

    const saved = localStorage.getItem('theme') ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');

    if (saved === 'dark') html.setAttribute('data-theme', 'dark');

    function paintIcons() {
      const dark = html.getAttribute('data-theme') === 'dark';
      toggles.forEach(t => {
        const label = t.closest('.drawer-actions') ? (dark ? ' Light Mode' : ' Dark Mode') : '';
        t.innerHTML = `<i class="ph ${dark ? 'ph-sun' : 'ph-moon'}"></i>` +
          (label ? `<span>${label.trim()}</span>` : `<span class="sr-only">${dark ? 'Switch to light mode' : 'Switch to dark mode'}</span>`);
      });

      let meta = $('meta[name="theme-color"]');
      if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
      }
      meta.content = dark ? '#060911' : '#F7F6F3';
    }

    toggles.forEach(t => t.addEventListener('click', () => {
      const dark = html.getAttribute('data-theme') === 'dark';
      if (dark) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      } else {
        html.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      }
      paintIcons();
    }));

    paintIcons();
  }

  function initDirection() {
    const html = document.documentElement;
    html.setAttribute('dir', localStorage.getItem('dir') || 'ltr');

    $$('.rtl-toggle').forEach(t => t.addEventListener('click', () => {
      const next = html.getAttribute('dir') === 'rtl' ? 'ltr' : 'rtl';
      html.setAttribute('dir', next);
      localStorage.setItem('dir', next);
      toast(next === 'rtl' ? 'Right-to-left layout enabled' : 'Left-to-right layout restored', 'info', 2200);
    }));
  }

  /* ------------------------------------------------------------------ *
   * Scroll reveal
   * ------------------------------------------------------------------ */
  function initReveal() {
    const items = $$('[data-reveal]');
    if (!items.length) return;

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('is-visible'));
      return;
    }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const delay = parseFloat(entry.target.dataset.revealDelay || 0);
        entry.target.style.transitionDelay = `${delay}s`;
        entry.target.classList.add('is-visible');
        io.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px' });

    items.forEach(el => io.observe(el));
  }

  /* ------------------------------------------------------------------ *
   * Animated counters
   * ------------------------------------------------------------------ */
  function initCounters() {
    const nums = $$('[data-count]');
    if (!nums.length) return;

    function run(el) {
      const target = parseFloat(el.dataset.count);
      const decimals = (el.dataset.count.split('.')[1] || '').length;
      const duration = 1600;

      if (prefersReducedMotion) {
        el.textContent = target.toLocaleString(undefined, { minimumFractionDigits: decimals });
        return;
      }

      const start = performance.now();
      function tick(now) {
        const p = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = (target * eased).toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals
        });
        if (p < 1) requestAnimationFrame(tick);
      }
      requestAnimationFrame(tick);
    }

    if (!('IntersectionObserver' in window)) { nums.forEach(run); return; }

    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
      });
    }, { threshold: 0.6 });

    nums.forEach(n => io.observe(n));
  }

  /* ------------------------------------------------------------------ *
   * Hero: word reveal + parallax
   * ------------------------------------------------------------------ */
  function initHeroTitle() {
    const title = $('.reveal-words');
    if (!title || prefersReducedMotion) return;

    const units = [];

    Array.from(title.childNodes).forEach(node => {
      if (node.nodeType === Node.TEXT_NODE) {
        const frag = document.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part.trim()) { frag.appendChild(document.createTextNode(part)); return; }
          const word = document.createElement('span');
          word.className = 'word';
          const inner = document.createElement('span');
          inner.textContent = part;
          word.appendChild(inner);
          frag.appendChild(word);
          units.push(inner);
        });
        node.replaceWith(frag);
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        // Keep styled elements (e.g. <em>) intact as a single animated unit
        const word = document.createElement('span');
        word.className = 'word';
        const inner = document.createElement('span');
        node.replaceWith(word);
        inner.appendChild(node);
        word.appendChild(inner);
        units.push(inner);
      }
    });

    units.forEach((u, i) => { u.style.animationDelay = `${0.25 + i * 0.06}s`; });
  }

  function initHeroParallax() {
    const layer = $('.hero-bg img');
    const hero = $('.hero');
    if (!layer || !hero || prefersReducedMotion) return;

    let scrollY = 0, mx = 0, my = 0, raf = null;

    function paint() {
      layer.style.transform =
        `translate3d(${mx}px, ${scrollY * 0.18 + my}px, 0) scale(1.08)`;
      raf = null;
    }

    function schedule() { if (!raf) raf = requestAnimationFrame(paint); }

    window.addEventListener('scroll', () => {
      if (window.scrollY > window.innerHeight * 1.2) return;
      scrollY = window.scrollY;
      schedule();
    }, { passive: true });

    if (!isTouch) {
      hero.addEventListener('mousemove', (e) => {
        const r = hero.getBoundingClientRect();
        mx = ((e.clientX - r.width / 2) / r.width) * -26;
        my = ((e.clientY - r.height / 2) / r.height) * -14;
        schedule();
      });
      hero.addEventListener('mouseleave', () => { mx = 0; my = 0; schedule(); });
    }

    paint();
  }

  /* ------------------------------------------------------------------ *
   * 3D tilt on cards
   * ------------------------------------------------------------------ */
  function initTilt() {
    if (prefersReducedMotion || isTouch) return;

    $$('[data-tilt]').forEach(card => {
      const strength = parseFloat(card.dataset.tilt) || 7;

      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        card.style.transform =
          `perspective(900px) rotateY(${px * strength}deg) rotateX(${-py * strength}deg) translateY(-8px)`;
      });

      card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });
  }

  /* ------------------------------------------------------------------ *
   * Carousel
   * ------------------------------------------------------------------ */
  function initCarousels() {
    $$('[data-carousel]').forEach(root => {
      const track = $('.carousel-track', root);
      const slides = $$('.carousel-slide', track);
      const prev = $('[data-carousel-prev]', root);
      const next = $('[data-carousel-next]', root);
      const dotsWrap = $('.carousel-dots', root);
      if (!track || slides.length < 2) return;

      let index = 0;
      let timer = null;
      const interval = parseInt(root.dataset.carousel, 10) || 6000;

      const dots = slides.map((_, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'carousel-dot';
        b.setAttribute('aria-label', `Go to slide ${i + 1}`);
        b.addEventListener('click', () => { go(i); restart(); });
        dotsWrap && dotsWrap.appendChild(b);
        return b;
      });

      function go(i) {
        index = (i + slides.length) % slides.length;
        const dir = isRTL() ? 1 : -1;
        track.style.transform = `translateX(${dir * index * 100}%)`;
        dots.forEach((d, di) => d.classList.toggle('active', di === index));
        slides.forEach((s, si) => s.setAttribute('aria-hidden', si === index ? 'false' : 'true'));
      }

      function restart() {
        clearInterval(timer);
        timer = setInterval(() => go(index + 1), interval);
      }

      prev && prev.addEventListener('click', () => { go(index - 1); restart(); });
      next && next.addEventListener('click', () => { go(index + 1); restart(); });

      root.addEventListener('mouseenter', () => clearInterval(timer));
      root.addEventListener('mouseleave', restart);

      root.setAttribute('tabindex', '0');
      root.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowRight') { go(index + 1); restart(); }
        if (e.key === 'ArrowLeft')  { go(index - 1); restart(); }
      });

      // Swipe
      let startX = null;
      track.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
      track.addEventListener('touchend', (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 45) go(index + (dx < 0 ? 1 : -1) * (isRTL() ? -1 : 1));
        startX = null;
        restart();
      });

      go(0);
      restart();
    });
  }

  /* ------------------------------------------------------------------ *
   * Accordion
   * ------------------------------------------------------------------ */
  function initAccordions() {
    $$('.accordion').forEach(acc => {
      const single = acc.dataset.accordion !== 'multi';
      const items = $$('.accordion-item', acc);

      items.forEach(item => {
        const trigger = $('.accordion-trigger', item);
        const panel = $('.accordion-panel', item);
        if (!trigger || !panel) return;

        // Honour an item that ships open in the markup
        const startsOpen = item.classList.contains('open');
        trigger.setAttribute('aria-expanded', String(startsOpen));
        if (startsOpen) panel.style.maxHeight = `${panel.scrollHeight}px`;

        trigger.addEventListener('click', () => {
          const willOpen = !item.classList.contains('open');

          if (single) {
            items.forEach(other => {
              other.classList.remove('open');
              const p = $('.accordion-panel', other);
              const t = $('.accordion-trigger', other);
              if (p) p.style.maxHeight = null;
              if (t) t.setAttribute('aria-expanded', 'false');
            });
          }

          item.classList.toggle('open', willOpen);
          trigger.setAttribute('aria-expanded', String(willOpen));
          panel.style.maxHeight = willOpen ? `${panel.scrollHeight}px` : null;
        });
      });
    });

    window.addEventListener('resize', () => {
      $$('.accordion-item.open .accordion-panel').forEach(p => {
        p.style.maxHeight = `${p.scrollHeight}px`;
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Button ripple
   * ------------------------------------------------------------------ */
  function initRipple() {
    if (prefersReducedMotion) return;

    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest('.btn');
      if (!btn) return;

      const r = btn.getBoundingClientRect();
      const size = Math.max(r.width, r.height);
      const ink = document.createElement('span');
      ink.className = 'ripple';
      ink.style.width = ink.style.height = `${size}px`;
      ink.style.left = `${e.clientX - r.left - size / 2}px`;
      ink.style.top = `${e.clientY - r.top - size / 2}px`;
      btn.appendChild(ink);
      ink.addEventListener('animationend', () => ink.remove(), { once: true });
    });
  }

  /* ------------------------------------------------------------------ *
   * Marquee — duplicate content for a seamless loop
   * ------------------------------------------------------------------ */
  function initMarquee() {
    $$('.marquee-track').forEach(track => {
      track.innerHTML += track.innerHTML;
      track.setAttribute('aria-hidden', 'true');
    });
  }

  /* ------------------------------------------------------------------ *
   * Favourite (wishlist) toggles
   * ------------------------------------------------------------------ */
  function initFavourites() {
    const key = 'renteasy:favourites';
    const saved = new Set(JSON.parse(localStorage.getItem(key) || '[]'));

    const paintHeart = (btn, on) => {
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', String(on));
      btn.innerHTML = `<i class="${on ? 'ph-fill' : 'ph'} ph-heart"></i>`;
    };

    $$('.vehicle-fav').forEach(btn => {
      const id = btn.dataset.fav || '';
      paintHeart(btn, saved.has(id));

      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const active = !btn.classList.contains('is-active');
        paintHeart(btn, active);
        active ? saved.add(id) : saved.delete(id);
        localStorage.setItem(key, JSON.stringify([...saved]));
        toast(active ? 'Saved to your shortlist' : 'Removed from your shortlist', active ? 'success' : 'info', 2200);
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Password field helpers
   * ------------------------------------------------------------------ */
  function initPasswords() {
    $$('[data-password]').forEach(wrap => {
      const input = $('input', wrap);
      if (!input) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'pw-toggle';
      btn.setAttribute('aria-label', 'Show password');
      btn.innerHTML = '<i class="ph ph-eye"></i>';
      btn.addEventListener('click', () => {
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.innerHTML = `<i class="ph ${show ? 'ph-eye-slash' : 'ph-eye'}"></i>`;
        btn.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
      });

      wrap.style.position = 'relative';
      wrap.appendChild(btn);

      const meter = wrap.parentElement && $('.pw-strength span', wrap.parentElement);
      if (!meter) return;

      input.addEventListener('input', () => {
        const v = input.value;
        let score = 0;
        if (v.length >= 8) score++;
        if (/[A-Z]/.test(v)) score++;
        if (/\d/.test(v)) score++;
        if (/[^A-Za-z0-9]/.test(v)) score++;

        const map = [
          { w: '0%',   c: 'transparent' },
          { w: '25%',  c: '#DC2F3C' },
          { w: '50%',  c: '#E0913B' },
          { w: '75%',  c: '#C8A951' },
          { w: '100%', c: '#17915C' }
        ][v ? score : 0];

        meter.style.width = map.w;
        meter.style.backgroundColor = map.c;
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Auth tabs (login / register)
   * ------------------------------------------------------------------ */
  function initAuthTabs() {
    const tabs = $$('[data-auth-tab]');
    if (!tabs.length) return;

    tabs.forEach(tab => tab.addEventListener('click', () => {
      const target = tab.dataset.authTab;
      tabs.forEach(t => t.classList.toggle('active', t === tab));
      $$('[data-auth-panel]').forEach(p => {
        p.hidden = p.dataset.authPanel !== target;
      });
    }));
  }

  /* ------------------------------------------------------------------ *
   * Newsletter
   * ------------------------------------------------------------------ */
  function initNewsletter() {
    $$('.newsletter').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = $('input', form);
        if (!input) return;

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim())) {
          toast('Please enter a valid email address', 'error');
          input.focus();
          return;
        }

        toast('You are on the list — welcome to Rent Easy.', 'success');
        form.reset();
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Form validation
   * ------------------------------------------------------------------ */
  function validateField(input) {
    const group = input.closest('.form-group') || input.closest('.checkbox-group');
    if (!group) return true;
    const errorMsg = group.querySelector('.error-msg');
    const value = (input.value || '').trim();

    let message = '';

    if (input.type === 'checkbox') {
      if (!input.checked) message = 'You must accept the terms to continue';
    } else if (!value) {
      message = 'This field is required';
    } else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      message = 'Please enter a valid email address';
    } else if (input.type === 'tel' && !/^[\d\s+()-]{7,}$/.test(value)) {
      message = 'Please enter a valid phone number';
    } else if (input.type === 'password' && value.length < 8) {
      message = 'Password must be at least 8 characters';
    }

    if (message) {
      group.classList.add('has-error');
      input.classList.add('error');
      input.classList.remove('success');
      input.setAttribute('aria-invalid', 'true');
      if (errorMsg) errorMsg.innerHTML = `<i class="ph ph-warning-circle"></i><span></span>`;
      if (errorMsg) errorMsg.lastElementChild.textContent = message;
      return false;
    }

    group.classList.remove('has-error');
    input.classList.remove('error');
    input.classList.add('success');
    input.removeAttribute('aria-invalid');
    return true;
  }

  window.RentEasy.validateField = validateField;

  function initForms() {
    $$('.validate-form').forEach(form => {
      form.setAttribute('novalidate', '');

      form.addEventListener('submit', (e) => {
        e.preventDefault();

        // Only validate fields inside the visible portion of a wizard
        const scope = $('.wizard-panel.is-active', form) || form;
        const required = $$('input[required], textarea[required], select[required]', scope);

        let valid = true;
        let firstBad = null;

        required.forEach(input => {
          if (!validateField(input)) {
            valid = false;
            if (!firstBad) firstBad = input;
          }
        });

        const pass = form.querySelector('[name="password"]');
        const confirm = form.querySelector('[name="confirm_password"]');
        if (pass && confirm && pass.value !== confirm.value) {
          valid = false;
          const group = confirm.closest('.form-group');
          group && group.classList.add('has-error');
          confirm.classList.add('error');
          const err = group && group.querySelector('.error-msg');
          if (err) err.textContent = 'Passwords do not match';
          if (!firstBad) firstBad = confirm;
        }

        if (!valid) {
          toast('Please review the highlighted fields', 'error');
          firstBad && firstBad.focus();
          firstBad && firstBad.scrollIntoView({ block: 'center', behavior: prefersReducedMotion ? 'auto' : 'smooth' });
          return;
        }

        const btn = form.querySelector('button[type="submit"]');
        const original = btn ? btn.innerHTML : '';

        if (btn) {
          btn.disabled = true;
          btn.innerHTML = '<i class="ph ph-circle-notch"></i> Processing…';
          const spinner = btn.querySelector('i');
          if (spinner && !prefersReducedMotion) spinner.style.animation = 'spinSlow .9s linear infinite';
        }

        // Placeholder for a real endpoint — swap for fetch() when a backend exists
        setTimeout(() => {
          toast(form.dataset.successMessage || 'Sent successfully. We will be in touch shortly.', 'success', 4200);
          form.reset();
          $$('.form-control', form).forEach(i => i.classList.remove('success', 'error'));
          $$('.extra-row.checked', form).forEach(r => r.classList.remove('checked'));
          document.dispatchEvent(new CustomEvent('renteasy:form-success', { detail: { form } }));

          if (btn) {
            btn.disabled = false;
            btn.innerHTML = original;
          }
        }, 900);
      });

      $$('input, textarea, select', form).forEach(input => {
        input.addEventListener('input', () => {
          const group = input.closest('.form-group');
          if (group && group.classList.contains('has-error')) {
            group.classList.remove('has-error');
            input.classList.remove('error');
          }
        });
        input.addEventListener('blur', () => {
          if (input.hasAttribute('required') && (input.value || '').trim()) validateField(input);
        });
      });
    });
  }

  /* ------------------------------------------------------------------ *
   * Dashboard navigation (active link highlighting & scrollspy)
   * ------------------------------------------------------------------ */
  function initDashboardNav() {
    const dashNav = $('.dash-nav');
    if (!dashNav) return;

    const links = $$('.dash-nav a');
    const sections = [];
    
    links.forEach(link => {
      const href = link.getAttribute('href');
      if (href && href.startsWith('#')) {
        const sec = $(href);
        if (sec) {
          sections.push({ link, sec });
        }
      }
    });

    let isClicking = false;

    // Handle clicks
    links.forEach(link => {
      link.addEventListener('click', () => {
        const href = link.getAttribute('href');
        if (href && href.startsWith('#')) {
          isClicking = true;
          links.forEach(l => l.classList.remove('active'));
          link.classList.add('active');
          setTimeout(() => { isClicking = false; }, 800);
        }
      });
    });

    // Scrollspy with IntersectionObserver
    if ('IntersectionObserver' in window && sections.length > 0) {
      const observerOptions = {
        root: null,
        rootMargin: '-20% 0px -60% 0px',
        threshold: 0
      };

      const observer = new IntersectionObserver(entries => {
        if (isClicking) return;
        
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const id = '#' + entry.target.id;
            links.forEach(link => {
              const active = link.getAttribute('href') === id;
              link.classList.toggle('active', active);
            });
          }
        });
      }, observerOptions);

      sections.forEach(item => observer.observe(item.sec));
    }
  }

  /* ------------------------------------------------------------------ *
   * Active nav link, based on the current file name
   * ------------------------------------------------------------------ */
  function initActiveNav() {
    const page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    $$('.nav-link').forEach(link => {
      const href = (link.getAttribute('href') || '').toLowerCase();
      if (href === page) link.classList.add('active');
    });
  }

  /* ------------------------------------------------------------------ *
   * Boot
   * ------------------------------------------------------------------ */
  function boot() {
    buildChrome();
    initDrawer();
    initTheme();
    initDirection();
    initActiveNav();
    initDashboardNav();
    initHeroTitle();
    initHeroParallax();
    initReveal();
    initCounters();
    initTilt();
    initCarousels();
    initAccordions();
    initMarquee();
    initFavourites();
    initPasswords();
    initAuthTabs();
    initNewsletter();
    initForms();
    initRipple();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
