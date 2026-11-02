<script>
  import { onMount } from 'svelte';
  import ThemeToggle from '../../../../shared/components/ThemeToggle.svelte';
  import LandingBrand from './LandingBrand.svelte';
  import LandingIcon from './LandingIcon.svelte';

  let menuOpen = $state(false);
  let active = $state('#beranda');
  let menuButton;
  const links = [
    ['#beranda', 'Beranda'],
    ['#tentang', 'Tentang Kami'],
    ['#layanan', 'Layanan'],
    ['#informasi', 'Informasi'],
  ];

  onMount(() => {
    const syncAnchor = () => {
      active = links.some(([href]) => href === location.hash) ? location.hash : '#beranda';
    };
    syncAnchor();
    window.addEventListener('hashchange', syncAnchor);
    return () => window.removeEventListener('hashchange', syncAnchor);
  });

  function closeMenuOnEscape(event) {
    if (event.key !== 'Escape' || !menuOpen) return;
    event.preventDefault();
    menuOpen = false;
    menuButton?.focus();
  }
</script>

<svelte:window onkeydown={closeMenuOnEscape} />

<header class="ski-header">
  <div class="ski-header-inner ski-wrap">
    <a class="ski-brand" href="#beranda" aria-label="KSPPS Syirkah Kebaikan Indonesia, beranda">
      <LandingBrand />
    </a>
    <nav
      id="ski-main-navigation"
      class="ski-nav"
      class:ski-open={menuOpen}
      aria-label="Navigasi utama"
    >
      {#each links as [href, label]}
        <a
          {href}
          class:active={href === active}
          aria-current={href === active ? 'location' : undefined}
          onclick={() => {
            active = href;
            menuOpen = false;
          }}>{label}</a
        >
      {/each}
      <a
        class="ski-button ski-mobile-member"
        href="anggota.html#masuk"
        onclick={() => (menuOpen = false)}
      >
        Portal Anggota <LandingIcon name="arrow-up-right" />
      </a>
    </nav>
    <div class="ski-header-actions">
      <ThemeToggle />
      <a class="ski-button ski-header-member" href="anggota.html#masuk">
        Portal Anggota <LandingIcon name="arrow-up-right" />
      </a>
      <button
        class="ski-menu-button"
        type="button"
        aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
        aria-expanded={menuOpen}
        aria-controls="ski-main-navigation"
        bind:this={menuButton}
        onclick={() => (menuOpen = !menuOpen)}
        ><LandingIcon name={menuOpen ? 'x' : 'menu'} /></button
      >
    </div>
  </div>
</header>
