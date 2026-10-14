/** Every listener, timer and pending request belongs to one mounted portal. */
export function createLifecycle() {
  const controller = new AbortController();
  const cleanups = new Set();
  let disposed = false;

  function add(cleanup) {
    let active = true;
    const release = () => {
      if (!active) return;
      active = false;
      cleanups.delete(release);
      cleanup();
    };
    if (disposed) release();
    else cleanups.add(release);
    return release;
  }

  function listen(target, type, handler, options) {
    if (!target || disposed) return () => {};
    // Explicit removal also supports older browsers and test DOMs.
    target.addEventListener(type, handler, options);
    return add(() => target.removeEventListener(type, handler, options));
  }

  function timeout(callback, delay) {
    if (disposed) return undefined;
    const id = setTimeout(() => {
      cleanups.delete(cancel);
      if (!disposed) callback();
    }, delay);
    const cancel = add(() => clearTimeout(id));
    return id;
  }

  function interval(callback, delay) {
    if (disposed) return undefined;
    const id = setInterval(() => {
      if (!disposed) callback();
    }, delay);
    add(() => clearInterval(id));
    return id;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    controller.abort();
    for (const cleanup of [...cleanups].reverse()) cleanup();
    cleanups.clear();
  }

  return {
    add,
    listen,
    timeout,
    interval,
    dispose,
    signal: controller.signal,
    get disposed() {
      return disposed;
    },
  };
}
