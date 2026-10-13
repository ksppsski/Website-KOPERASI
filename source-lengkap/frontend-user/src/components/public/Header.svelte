<script>
  import LandingIcon from './LandingIcon.svelte';
  let menuOpen = $state(false);
</script>

<header class="ski-header ski-wrap">
  <a class="ski-brand" href="#ski-beranda" aria-label="KSPPS Syirkah Kebaikan Indonesia, beranda"
    ><img
      class="ski-brand-image ski-brand-image--color"
      src="assets/brand-ae84bf1cdc.png"
      width="720"
      height="255"
      alt=""
      aria-hidden="true"
    /><img
      class="ski-brand-image ski-brand-image--white"
      src="assets/brand-9523c1e45f.png"
      width="720"
      height="256"
      alt=""
      aria-hidden="true"
    /></a
  >
  <nav class="ski-nav" class:ski-open={menuOpen} aria-label="Navigasi utama">
    <a href="#ski-tentang">Tentang Kami</a><a href="#ski-layanan">Layanan</a><a
      href="#ski-bergabung">Cara Bergabung</a
    >
    <button
      type="button"
      class="ski-button ski-mobile-member"
      data-ski-dialog="member"
      hidden={!menuOpen}>Masuk Anggota</button
    >
  </nav>
  <button class="ski-button ski-outline" type="button" data-ski-dialog="member"
    >Masuk Anggota <LandingIcon name="arrow-up-right" /></button
  >
  <button
    class="ski-menu-button"
    type="button"
    aria-label={menuOpen ? 'Tutup menu' : 'Buka menu'}
    aria-expanded={menuOpen}
    onclick={() => (menuOpen = !menuOpen)}><LandingIcon name="menu" /></button
  >
</header>
