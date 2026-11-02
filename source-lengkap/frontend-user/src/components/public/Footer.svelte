<script>
  import LandingBrand from './LandingBrand.svelte';
  import LandingIcon from './LandingIcon.svelte';
</script>

<footer class="ski-footer">
  <div class="ski-footer-inner ski-wrap">
    <div>
      <a
        class="ski-brand ski-footer-brand"
        href="#beranda"
        aria-label="KSPPS Syirkah Kebaikan Indonesia, kembali ke beranda"><LandingBrand /></a
      >
      <p>© {new Date().getFullYear()} KSPPS Syirkah Kebaikan Indonesia.</p>
    </div>
    <a
      class="ski-footer-contact"
      href="mailto:syirkahkebaikanindonesia@gmail.com"
      data-ski-dialog="contact">Hubungi Admin <LandingIcon name="arrow-up-right" /></a
    >
  </div>
</footer>
