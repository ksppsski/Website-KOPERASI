<script>
  let { white = false } = $props();
</script>

<span
  class="brand-logo"
  class:brand-logo--white={white}
  role="img"
  aria-label="KSPPS Syirkah Kebaikan Indonesia"
>
  <img
    class="brand-logo-image brand-logo-image--color"
    src="assets/kspps-logo-color-web.png"
    alt=""
    aria-hidden="true"
    width="720"
    height="255"
  />
  <img
    class="brand-logo-image brand-logo-image--white"
    src="assets/kspps-logo-white-web.png"
    alt=""
    aria-hidden="true"
    width="720"
    height="256"
  />
</span>
