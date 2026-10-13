<script>
  let { white = false } = $props();
</script>

<img
  class="brand-logo"
  src="assets/kspps-logo-{white ? 'white' : 'color'}-web.png"
  alt="KSPPS Syirkah Kebaikan Indonesia"
  width="720"
  height={white ? 256 : 255}
/>
