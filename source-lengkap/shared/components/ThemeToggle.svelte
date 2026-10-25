<script>
  import { onMount, tick } from 'svelte';
  import Icon from './Icon.svelte';
  import { createThemeController } from '../lib/theme.js';
  import { createThemeMotion } from '../lib/theme-motion.js';
  import '../styles/theme-motion.css';

  let theme = $state('light');
  let controller;
  let motion;
  let mounted = false;
  let switching = $state(false);
  const label = $derived(theme === 'dark' ? 'Aktifkan mode terang' : 'Aktifkan mode gelap');

  onMount(() => {
    mounted = true;
    controller = createThemeController({
      browser: window,
      root: document.documentElement,
      onChange: (value) => (theme = value),
    });
    motion = createThemeMotion({
      browser: window,
      root: document.documentElement,
      afterChange: tick,
    });
    return () => {
      mounted = false;
      motion.dispose();
      controller.dispose();
    };
  });

  async function switchTheme(event) {
    if (!controller || switching) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    switching = true;
    try {
      await motion.run(() => controller.toggle(), {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      });
    } finally {
      if (mounted) switching = false;
    }
  }
</script>

<div class="theme-control">
  <button
    class="theme-toggle"
    type="button"
    aria-label={label}
    title={label}
    aria-disabled={switching}
    aria-busy={switching}
    onclick={switchTheme}
  >
    {#key theme}
      <span class="theme-icon" aria-hidden="true"
        ><Icon name={theme === 'dark' ? 'sun' : 'moon'} /></span
      >
    {/key}
  </button>
</div>

<style>
  .theme-control {
    position: fixed;
    top: 14px;
    right: 16px;
    z-index: 90;
  }
  .theme-toggle {
    display: inline-grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid var(--line, #e3eaf0);
    border-radius: 50%;
    background: var(--paper, #fff);
    color: var(--navy, #183e7c);
    box-shadow: 0 3px 12px rgb(0 0 0 / 8%);
    cursor: pointer;
  }
  .theme-toggle:hover {
    background: var(--mist, #eaf5f9);
  }
  .theme-toggle[aria-disabled='true'] {
    opacity: 1;
    cursor: progress;
  }
  .theme-icon {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    view-transition-name: kspps-theme-icon;
  }
  .theme-toggle:focus-visible {
    outline: 3px solid var(--cyan, #51b0ce);
    outline-offset: 3px;
  }
  .theme-toggle :global(.icon) {
    display: block;
    width: 22px;
    height: 22px;
    fill: none;
    stroke: currentColor;
    stroke-width: 1.7;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  @media (max-width: 600px) {
    .theme-control {
      top: 12px;
      right: 12px;
    }
  }
</style>
