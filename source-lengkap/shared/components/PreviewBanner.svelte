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
    padding: 14px 84px 14px 24px;
    background: var(--mist, #eaf3fb);
    color: var(--navy, #183e7c);
    border-bottom: 1px solid var(--line, #bad5ea);
    font:
      14px/1.5 system-ui,
      sans-serif;
  }
  strong {
    display: block;
  }
  @media (max-width: 600px) {
    .static-preview-banner {
      padding-right: 72px;
    }
  }
</style>
