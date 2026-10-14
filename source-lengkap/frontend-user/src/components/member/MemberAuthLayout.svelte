<script>
  import Content from '../../../../shared/components/Content.svelte';
  import Brand from '../../../../shared/components/Brand.svelte';
  import Icon from '../../../../shared/components/Icon.svelte';

  let { context, children, wide = false } = $props();
  let { demoStrip } = $derived(context);
</script>

{#if context}
  <Content value={demoStrip() ?? ''} />
  <div class="auth-layout">
    <aside class="auth-aside">
      <a href="index.html"><Brand white={true} /></a>
      <div>
        <div class="eyebrow">Portal anggota</div>
        <h2>Lebih dekat dengan<br /><em>layanan koperasi.</em></h2>
        <p>Satu tempat untuk mengakses keanggotaan, simpanan, dan akad Anda.</p>
        <div class="auth-benefits">
          <span><Icon name={'wallet'} />Simpanan dan riwayat setoran</span><span
            ><Icon name={'sprout'} />Penyertaan modal untuk barang Mitra</span
          ><span><Icon name={'file'} />Dokumen akad dalam satu tempat</span>
        </div>
      </div>
      <div class="auth-aside-bottom">© 2026 KSPPS Syirkah Kebaikan Indonesia</div>
    </aside>
    <main id="page-main" class="auth-main">
      <a class="back-link" href="index.html"><Icon name={'back'} />Kembali ke beranda</a>
      <div class="auth-card {wide ? 'wide' : ''}">{@render children()}</div>
    </main>
  </div>
{/if}
