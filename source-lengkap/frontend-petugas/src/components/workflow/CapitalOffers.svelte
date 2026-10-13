<script>
  let { context } = $props();
  let { action, frame } = $derived(context);
</script>

{#if context}
  <div class="page-heading">
    <div>
      <h1>Penawaran Modal</h1>
      <p class="subtext">Buka penerimaan sesuai kebutuhan barang Mitra.</p>
    </div>
    {@html action('new-offer', '', '+ Buat penawaran', true) ?? ''}
  </div>
  {@html frame('manager-offers', 'Penawaran untuk anggota') ?? ''}
  <p class="field-hint">
    Kuota dicadangkan saat pengajuan dikirim, termasuk selama perbaikan. Penawaran tertutup otomatis
    saat penuh.
  </p>
{/if}
