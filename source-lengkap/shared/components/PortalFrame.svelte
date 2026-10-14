<script>
  import PreviewBanner from './PreviewBanner.svelte';
  import Region from './Region.svelte';
  let { children } = $props();
</script>

<PreviewBanner />
<a class="skip-link" href="#page-main">Lewati ke konten</a>
{@render children()}
<dialog id="portal-dialog" aria-labelledby="dialog-title">
  <div id="dialog-content"><Region name="dialog-content" /></div>
</dialog>
<div class="toast" id="toast" role="status" hidden></div>
<noscript
  >Aktifkan JavaScript untuk menggunakan portal. <a href="index.html">Kembali ke beranda</a
  >.</noscript
>
