<script>
  import { isStaticPreview } from '../runtime/environment.js';
</script>

{#if isStaticPreview}
  <aside class="static-preview-banner" aria-label="Status layanan">
    <strong>Pratinjau statis</strong>
    <span
      >Anda sedang melihat rancangan portal. Login, unggahan, dan transaksi belum aktif. Tidak ada
      data yang dikirim.</span
    >
  </aside>
{/if}

<style>
  .static-preview-banner {
    padding: 14px 24px;
    background: #eaf3fb;
    color: #183e7c;
    border-bottom: 1px solid #bad5ea;
    font:
      14px/1.5 system-ui,
      sans-serif;
  }
  strong {
    display: block;
  }
</style>
