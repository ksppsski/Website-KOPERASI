// Run before styles load so a saved dark theme never starts with a light page.
(() => {
  let theme = null;
  try {
    const saved = window.localStorage.getItem('kspps-theme');
    if (saved === 'light' || saved === 'dark') theme = saved;
  } catch {
    // Private browsing or storage restrictions must not stop the page loading.
  }
  if (!theme) {
    try {
      theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch {
      theme = 'light';
    }
  }
  document.documentElement.setAttribute('data-theme', theme);
  document.documentElement.style.colorScheme = theme;
})();
