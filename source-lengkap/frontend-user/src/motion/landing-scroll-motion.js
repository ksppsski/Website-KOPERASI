const revealGroups = [
  ['.ski-hero-content > *', 60],
  ['.ski-member-preview', 0],
  ['.ski-section-heading > *', 70],
  ['.ski-product', 85],
  ['.ski-products-tagline', 0],
  ['.ski-about-inner > *', 85],
  ['.ski-faq-section > h2', 0],
  ['.ski-faq-list > details', 70],
  ['.ski-footer-inner > *', 70],
];

// Svelte owns this action's lifetime. Scrolling stays native on every device.
export function landingScrollMotion(node) {
  const view = node.ownerDocument.defaultView;
  if (!view?.IntersectionObserver) return { destroy() {} };

  const preference = view.matchMedia?.('(prefers-reduced-motion: reduce)');
  const hero = node.querySelector('.ski-hero');
  const photo = node.querySelector('.ski-hero-visual');
  let observer;
  let frame = null;
  let targets = [];
  let active = false;
  let destroyed = false;

  function updatePhoto() {
    frame = null;
    if (!active || !hero || !photo) return;
    const bounds = hero.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= view.innerHeight) return;

    // Overscan in CSS covers this small drift, including the mobile photo crop.
    const limit = Math.min(20, photo.getBoundingClientRect().height * 0.04);
    const drift = Math.min(limit, Math.max(0, -bounds.top * 0.055));
    node.style.setProperty('--ski-photo-drift', `${drift.toFixed(2)}px`);
  }

  function schedulePhoto() {
    if (active && frame === null) frame = view.requestAnimationFrame(updatePhoto);
  }

  function stop() {
    active = false;
    observer?.disconnect();
    observer = null;
    view.removeEventListener('scroll', schedulePhoto);
    view.removeEventListener('resize', schedulePhoto);
    if (frame !== null) view.cancelAnimationFrame(frame);
    frame = null;
    node.removeAttribute('data-scroll-motion');
    node.style.removeProperty('--ski-photo-drift');
    for (const target of targets) {
      target.removeAttribute('data-scroll-reveal');
      target.removeAttribute('data-scroll-visible');
      target.style.removeProperty('--ski-reveal-delay');
    }
    targets = [];
  }

  function start() {
    if (destroyed || active || preference?.matches) return;

    observer = new view.IntersectionObserver(
      (entries) => {
        if (!active) return;
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-scroll-visible', 'true');
          } else if (
            entry.boundingClientRect.bottom <= 0 ||
            entry.boundingClientRect.top >= view.innerHeight
          ) {
            entry.target.removeAttribute('data-scroll-visible');
          }
        }
      },
      { threshold: 0 },
    );

    for (const [selector, stagger] of revealGroups) {
      const group = [...node.querySelectorAll(selector)];
      group.forEach((target, index) => {
        const bounds = target.getBoundingClientRect();
        target.setAttribute('data-scroll-reveal', '');
        target.style.setProperty('--ski-reveal-delay', `${Math.min(index * stagger, 240)}ms`);
        // The first screen and restored scroll position remain immediately readable.
        if (bounds.bottom > 0 && bounds.top < view.innerHeight) {
          target.setAttribute('data-scroll-visible', 'true');
        }
        targets.push(target);
      });
    }

    active = true;
    node.setAttribute('data-scroll-motion', 'active');
    for (const target of targets) observer.observe(target);
    view.addEventListener('scroll', schedulePhoto, { passive: true });
    view.addEventListener('resize', schedulePhoto, { passive: true });
    schedulePhoto();
  }

  function syncPreference() {
    if (preference?.matches) stop();
    else start();
  }

  preference?.addEventListener?.('change', syncPreference);
  start();

  return {
    destroy() {
      destroyed = true;
      stop();
      preference?.removeEventListener?.('change', syncPreference);
    },
  };
}
