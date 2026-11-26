// RoboMemo project page behavior. No dependencies.
(() => {
  'use strict';

  const root = document.documentElement;
  const THEME_KEY = 'robomemo-theme';
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Light / dark toggle ---------- */
  const darkQuery = window.matchMedia('(prefers-color-scheme: dark)');
  const effectiveTheme = () => root.getAttribute('data-theme') || (darkQuery.matches ? 'dark' : 'light');
  const themeToggle = document.getElementById('themeToggle');
  const syncToggleLabel = () => {
    if (!themeToggle) return;
    themeToggle.setAttribute('aria-label', effectiveTheme() === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
  };
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* storage unavailable */ }
      syncToggleLabel();
    });
  }
  if (darkQuery.addEventListener) darkQuery.addEventListener('change', syncToggleLabel);
  syncToggleLabel();

  /* ---------- Media placeholders ---------- */
  // Any <video data-src> or <img data-placeholder> whose file is missing is swapped for a dashed
  // box showing the expected path, so the page looks intentional before assets exist.
  let videoObserver = null;

  const applyAspect = (el) => {
    if (el.dataset.aspect) el.style.setProperty('--ar', el.dataset.aspect);
  };

  const showPlaceholder = (el, path, kind) => {
    if (!el.isConnected) return;
    if (videoObserver && kind === 'video') videoObserver.unobserve(el);
    const box = document.createElement('div');
    box.className = 'media-placeholder';
    if (el.dataset.aspect) box.style.setProperty('--ar', el.dataset.aspect);
    const icon = document.createElement('i');
    icon.className = kind === 'video' ? 'fa-regular fa-file-video' : 'fa-regular fa-image';
    icon.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span');
    label.className = 'ph-label';
    label.textContent = kind === 'video' ? 'Video placeholder' : 'Image placeholder';
    const code = document.createElement('code');
    code.textContent = path;
    box.append(icon, label, code);
    el.replaceWith(box);
  };

  document.querySelectorAll('img[data-placeholder]').forEach((img) => {
    applyAspect(img);
    const fail = () => showPlaceholder(img, img.getAttribute('src'), 'image');
    if (img.complete && img.naturalWidth === 0) fail();
    else img.addEventListener('error', fail, { once: true });
  });

  /* ---------- Lazy, viewport-aware videos ---------- */
  // Videos load only when near the viewport (hidden tab panels never load), autoplay muted while
  // visible and pause when scrolled away. Videos with a `controls` attribute load but never autoplay.
  const videos = Array.from(document.querySelectorAll('video[data-src]'));
  if (reduceMotion) videos.forEach((v) => v.setAttribute('controls', ''));

  const autoplays = (v) => !v.hasAttribute('controls');
  const load = (v) => {
    if (!v.getAttribute('src')) v.src = v.dataset.src;
  };
  const play = (v) => {
    const p = v.play();
    if (p && p.catch) p.catch(() => { /* autoplay blocked or file missing */ });
  };

  videos.forEach((v) => {
    applyAspect(v);
    v.addEventListener('error', () => showPlaceholder(v, v.dataset.src, 'video'), { once: true });
  });

  // Videos inside a [data-sync] group (side-by-side comparisons) are driven together by the group,
  // so both sides start, pause and loop at the same moment even when stacked on a phone.
  const syncGroups = Array.from(document.querySelectorAll('[data-sync]'));
  const inSyncGroup = (v) => Boolean(v.closest('[data-sync]'));
  const soloVideos = videos.filter((v) => !inSyncGroup(v));

  const groupVideos = (group) => Array.from(group.querySelectorAll('video')).filter((v) => v.isConnected);
  const playGroup = (group) => {
    const vids = groupVideos(group);
    vids.forEach(load);
    if (!vids.length || !autoplays(vids[0])) return;
    const t = vids[0].currentTime;
    vids.slice(1).forEach((f) => { if (Math.abs(f.currentTime - t) > 0.1) f.currentTime = t; });
    vids.forEach(play);
  };
  const pauseGroup = (group) => groupVideos(group).forEach((v) => { if (!v.paused) v.pause(); });

  syncGroups.forEach((group) => {
    const [leader] = groupVideos(group);
    if (!leader) return;
    // keep followers within ~0.3 s of the leader, including right after each loop
    leader.addEventListener('timeupdate', () => {
      groupVideos(group).slice(1).forEach((f) => {
        if (f.readyState >= 2 && Math.abs(f.currentTime - leader.currentTime) > 0.3) {
          f.currentTime = leader.currentTime;
        }
      });
    });
  });

  if ('IntersectionObserver' in window) {
    videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target: v, isIntersecting }) => {
        if (isIntersecting) {
          load(v);
          if (autoplays(v)) play(v);
        } else if (autoplays(v) && !v.paused) {
          v.pause();
        }
      });
    }, { rootMargin: '200px 0px', threshold: 0.01 });
    soloVideos.forEach((v) => videoObserver.observe(v));

    const groupObserver = new IntersectionObserver((entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) playGroup(target);
        else pauseGroup(target);
      });
    }, { rootMargin: '100px 0px', threshold: 0.01 });
    syncGroups.forEach((g) => groupObserver.observe(g));
  } else {
    soloVideos.forEach((v) => { load(v); if (autoplays(v)) play(v); });
    syncGroups.forEach(playGroup);
  }

  /* ---------- Tabs ---------- */
  document.querySelectorAll('[data-tabs]').forEach((list) => {
    const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
    const select = (tab, moveFocus) => {
      tabs.forEach((t) => {
        const on = t === tab;
        t.setAttribute('aria-selected', String(on));
        t.tabIndex = on ? 0 : -1;
        const panel = document.getElementById(t.getAttribute('aria-controls'));
        if (panel) panel.hidden = !on;
      });
      if (moveFocus) tab.focus();
    };
    tabs.forEach((tab, i) => {
      tab.addEventListener('click', () => select(tab, false));
      tab.addEventListener('keydown', (e) => {
        let next = null;
        if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
        else if (e.key === 'ArrowLeft') next = tabs[(i - 1 + tabs.length) % tabs.length];
        else if (e.key === 'Home') next = tabs[0];
        else if (e.key === 'End') next = tabs[tabs.length - 1];
        if (next) { e.preventDefault(); select(next, true); }
      });
    });
  });

  /* ---------- Section menu: highlight the section in view ---------- */
  const navLinksBox = document.querySelector('.section-nav__links');
  const navLinks = Array.from(document.querySelectorAll('.section-nav__links a[href^="#"]'));
  const sections = navLinks
    .map((a) => document.getElementById(a.getAttribute('href').slice(1)))
    .filter(Boolean);

  const setActive = (id) => {
    if (!id && navLinksBox) navLinksBox.scrollTo({ left: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
    navLinks.forEach((a) => {
      const on = a.getAttribute('href') === '#' + id;
      a.classList.toggle('is-active', on);
      if (on) {
        a.setAttribute('aria-current', 'true');
        // keep the active link visible when the menu scrolls sideways on phones
        if (navLinksBox && navLinksBox.scrollWidth > navLinksBox.clientWidth) {
          // position of the link inside the scrolling strip (offsetLeft would be relative to the whole bar)
          const linkLeft = a.getBoundingClientRect().left - navLinksBox.getBoundingClientRect().left + navLinksBox.scrollLeft;
          navLinksBox.scrollTo({
            left: linkLeft - navLinksBox.clientWidth / 2 + a.offsetWidth / 2,
            behavior: reduceMotion ? 'auto' : 'smooth',
          });
        }
      } else {
        a.removeAttribute('aria-current');
      }
    });
  };

  // Active = the last section whose top has passed 40% of the viewport; none above the first one.
  let activeId = null;
  const updateActive = () => {
    const line = window.innerHeight * 0.4;
    let current = '';
    sections.forEach((s) => { if (s.getBoundingClientRect().top <= line) current = s.id; });
    // at the very bottom, the last section wins even if it is short
    if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2 && sections.length) {
      current = sections[sections.length - 1].id;
    }
    if (current !== activeId) {
      activeId = current;
      setActive(current);
    }
  };
  if (sections.length) {
    // a handful of getBoundingClientRect calls per scroll event is cheap; no throttling needed
    window.addEventListener('scroll', updateActive, { passive: true });
    window.addEventListener('resize', updateActive);
    updateActive();
  }

  /* ---------- Copy BibTeX ---------- */
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    const label = btn.querySelector('.copy-label');
    let timer = null;
    btn.addEventListener('click', async () => {
      const target = document.getElementById(btn.dataset.copy);
      if (!target) return;
      const text = target.textContent.trim();
      let ok = false;
      try {
        await navigator.clipboard.writeText(text);
        ok = true;
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (_) { ok = false; }
        ta.remove();
      }
      if (label) {
        label.textContent = ok ? 'Copied!' : 'Select and copy';
        clearTimeout(timer);
        timer = setTimeout(() => { label.textContent = 'Copy'; }, 1600);
      }
    });
  });
})();
