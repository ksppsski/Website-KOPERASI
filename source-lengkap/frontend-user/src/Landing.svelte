<script>
  import { tick } from 'svelte';
  import Header from './components/public/Header.svelte';
  import Hero from './components/public/Hero.svelte';
  import Products from './components/public/Products.svelte';
  import About from './components/public/About.svelte';
  import FAQ from './components/public/FAQ.svelte';
  import Footer from './components/public/Footer.svelte';
  import LandingIcon from './components/public/LandingIcon.svelte';
  import { landingScrollMotion } from './motion/landing-scroll-motion.js';

  let contactOpen = $state(false);
  let closeButton;
  let contactDialog;
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
        event.preventDefault();
        lastFocus = button;
        contactOpen = true;
        await tick();
        closeButton?.focus({ preventScroll: true });
      }
    }
  }
</script>

<svelte:document onclick={handleClick} />
<svelte:window
  onkeydown={(event) => {
    if (!contactOpen) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeContact();
    }
    if (event.key === 'Tab') {
      const controls = [...contactDialog.querySelectorAll('button, a[href]')];
      const first = controls[0];
      const last = controls.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
  }}
/>

<div id="ski-web" use:landingScrollMotion>
  <a class="ski-skip" href="#konten">Lewati ke konten</a>
  <Header />
  <main id="konten"><Hero /><Products /><About /><FAQ /></main>
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
      bind:this={contactDialog}
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
      <h2 id="ski-dialog-title">Hubungi Admin</h2>
      <div id="ski-dialog-body">
        <ul class="ski-dialog-list">
          <li>
            <LandingIcon name="map-pin" /><span
              >Jl. Kijang No. 34 A, Maricaya,<br />Kota Makassar</span
            >
          </li>
          <li><LandingIcon name="phone" /><a href="tel:085608365555">0856 0836 5555</a></li>
          <li>
            <LandingIcon name="mail" /><a href="mailto:syirkahkebaikanindonesia@gmail.com"
              >syirkahkebaikanindonesia@gmail.com</a
            >
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>
