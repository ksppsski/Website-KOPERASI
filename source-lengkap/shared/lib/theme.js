export const THEME_STORAGE_KEY = 'kspps-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function isTheme(value) {
  return value === 'light' || value === 'dark';
}

function getStorage(browser) {
  try {
    return browser?.localStorage;
  } catch {
    return null;
  }
}

export function readThemePreference(storage) {
  try {
    const value = storage?.getItem(THEME_STORAGE_KEY);
    return isTheme(value) ? value : null;
  } catch {
    return null;
  }
}

export function applyTheme(root, theme) {
  if (!root || !isTheme(theme)) return;
  root.setAttribute('data-theme', theme);
  root.style.colorScheme = theme;
}

/** Each mounted control owns its preference and releases browser listeners. */
export function createThemeController({ browser, root, onChange = () => {} }) {
  const storage = getStorage(browser);
  let preference = readThemePreference(storage);
  let media = null;
  let disposed = false;
  let current = 'light';

  try {
    media = browser?.matchMedia?.(DARK_QUERY) || null;
  } catch {
    // Browsers without media-query support use the light theme by default.
  }

  function update() {
    if (disposed) return;
    current = preference || (media?.matches ? 'dark' : 'light');
    applyTheme(root, current);
    onChange(current);
  }

  function systemChanged() {
    if (!preference) update();
  }

  function storageChanged(event) {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    if (event.storageArea && storage && event.storageArea !== storage) return;
    preference = isTheme(event.newValue) ? event.newValue : null;
    update();
  }

  if (media?.addEventListener) media.addEventListener('change', systemChanged);
  else media?.addListener?.(systemChanged);
  browser?.addEventListener?.('storage', storageChanged);
  update();

  return {
    get theme() {
      return current;
    },
    toggle() {
      if (disposed) return;
      preference = current === 'dark' ? 'light' : 'dark';
      try {
        storage?.setItem(THEME_STORAGE_KEY, preference);
      } catch {
        // A denied or full storage still allows changes in the current page.
      }
      update();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      if (media?.removeEventListener) media.removeEventListener('change', systemChanged);
      else media?.removeListener?.(systemChanged);
      browser?.removeEventListener?.('storage', storageChanged);
    },
  };
}
