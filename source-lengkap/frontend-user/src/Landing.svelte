<script>
  import PreviewBanner from '../../shared/components/PreviewBanner.svelte';
  import ThemeToggle from '../../shared/components/ThemeToggle.svelte';
  import { tick } from 'svelte';
  import Header from './components/public/Header.svelte';
  import Values from './components/public/Values.svelte';
  import Hero from './components/public/Hero.svelte';
  import Products from './components/public/Products.svelte';
  import Join from './components/public/Join.svelte';
  import About from './components/public/About.svelte';
  import Footer from './components/public/Footer.svelte';
  import LandingIcon from './components/public/LandingIcon.svelte';

  let contactOpen = $state(false);
  let closeButton;
  let lastFocus;

  function closeContact() {
    contactOpen = false;
    lastFocus?.focus({ preventScroll: true });
  }

  async function handleClick(event) {
    const button = event.target.closest('[data-ski-dialog]');
    if (button) {
      const action = button.dataset.skiDialog;
      if (action === 'member' || action === 'join') {
        location.assign('anggota.html#' + (action === 'join' ? 'daftar' : 'masuk'));
      } else if (action === 'contact') {
        lastFocus = button;
        contactOpen = true;
        await tick();
        closeButton?.focus({ preventScroll: true });
      }
    }
    const link = event.target.closest('a[href^="#ski-"]');
    if (link) {
      event.preventDefault();
      document.querySelector(link.getAttribute('href'))?.scrollIntoView({ block: 'start' });
    }
  }
</script>

<PreviewBanner />
<ThemeToggle />

<svelte:document onclick={handleClick} />
<svelte:window
  onkeydown={(event) => {
    if (!contactOpen) return;
    if (event.key === 'Escape') closeContact();
    if (event.key === 'Tab') {
      event.preventDefault();
      closeButton?.focus();
    }
  }}
/>

<div id="ski-web">
  <Header />
  <main><Hero /><Values /><Products /><Join /><About /></main>
  <Footer />
  <div
    class="ski-overlay"
    hidden={!contactOpen}
    role="presentation"
    onclick={(event) => {
      if (event.target === event.currentTarget) closeContact();
    }}
  >
    <div
      class="ski-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ski-dialog-title"
      tabindex="-1"
    >
      <div class="ski-dialog-top">
        <small id="ski-dialog-label">KSPPS SYIRKAH KEBAIKAN INDONESIA</small>
        <button
          type="button"
          class="ski-close"
          aria-label="Tutup"
          bind:this={closeButton}
          onclick={closeContact}><LandingIcon name="x" /></button
        >
      </div>
      <h2 id="ski-dialog-title">Hubungi Kami</h2>
      <div id="ski-dialog-body">
        <ul class="ski-dialog-list">
          <li>
            <LandingIcon name="map-pin" /><span
              >Jl. Kijang No. 34 A, Maricaya,<br />Kota Makassar</span
            >
          </li>
          <li><LandingIcon name="phone" /><span>0856 0836 5555</span></li>
          <li>
            <LandingIcon name="mail" /><span style="overflow-wrap:anywhere"
              >syirkahkebaikanindonesia@gmail.com</span
            >
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
