(() => {
  const favicon = document.querySelector('link[data-theme-favicon]');
  if (!favicon || typeof window.matchMedia !== 'function') return;

  const colorScheme = window.matchMedia('(prefers-color-scheme: dark)');

  function updateFavicon() {
    const target = colorScheme.matches ? favicon.dataset.darkIcon : favicon.dataset.lightIcon;
    if (target) favicon.setAttribute('href', target);
  }

  updateFavicon();

  // A new asset URL also refreshes browsers that cache SVG media-query results.
  if (typeof colorScheme.addEventListener === 'function') {
    colorScheme.addEventListener('change', updateFavicon);
  } else if (typeof colorScheme.addListener === 'function') {
    colorScheme.addListener(updateFavicon);
  }
})();
