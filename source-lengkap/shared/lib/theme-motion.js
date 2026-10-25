const DURATION = 650;
const EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';

/** Animation belongs to this control; preference and page state stay independent. */
export function createThemeMotion({ browser, root, afterChange = async () => {} }) {
  const document = root.ownerDocument;
  let active = null;
  let disposed = false;

  function reducedMotion() {
    try {
      return browser.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    } catch {
      return false;
    }
  }

  function clear(request) {
    request.endFade?.();
    if (active !== request) return;
    root.removeAttribute('data-theme-transition');
    root.classList.remove('theme-transitioning');
    active = null;
  }

  async function fade(request, commit) {
    if (disposed || active !== request) return;
    root.classList.add('theme-transitioning');
    await commit();
    if (disposed || active !== request) return;
    await new Promise((resolve) => {
      const timer = browser.setTimeout(resolve, 460);
      request.endFade = () => {
        browser.clearTimeout(timer);
        resolve();
      };
    });
  }

  async function run(update, origin) {
    // A short lock makes rapid clicks deterministic without remounting the page.
    if (disposed || active) return false;
    const request = { applied: false };
    active = request;
    const commit = async () => {
      if (disposed || active !== request || request.applied) return;
      request.applied = true;
      update();
      await afterChange();
    };
    try {
      if (reducedMotion() || document.hidden) {
        await commit();
      } else if (
        typeof document.startViewTransition !== 'function' ||
        typeof root.animate !== 'function'
      ) {
        await fade(request, commit);
      } else {
        root.setAttribute('data-theme-transition', 'reveal');
        try {
          const transition = document.startViewTransition(commit);
          request.transition = transition;
          const finished = transition.finished.catch(() => {});
          try {
            await transition.ready;
            if (disposed || active !== request) return false;
            const x = Math.max(0, Math.min(origin.x, browser.innerWidth));
            const y = Math.max(0, Math.min(origin.y, browser.innerHeight));
            const radius =
              Math.hypot(
                Math.max(x, browser.innerWidth - x),
                Math.max(y, browser.innerHeight - y),
              ) + 2;
            request.animation = root.animate(
              {
                clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`],
              },
              {
                duration: DURATION,
                easing: EASING,
                pseudoElement: '::view-transition-new(root)',
                fill: 'both',
              },
            );
            await request.animation.finished;
          } catch {
            transition.skipTransition();
          }
          await finished;
          await commit();
        } catch {
          request.transition?.skipTransition();
          root.removeAttribute('data-theme-transition');
          await fade(request, commit);
        }
      }
      return true;
    } finally {
      clear(request);
    }
  }

  return {
    run,
    dispose() {
      disposed = true;
      if (!active) return;
      const request = active;
      request.animation?.cancel();
      request.transition?.skipTransition();
      clear(request);
    },
  };
}
