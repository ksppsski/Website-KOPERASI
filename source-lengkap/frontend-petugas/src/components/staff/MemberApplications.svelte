<script>
  let { context } = $props();
  let { heading, toolbar, table, candidatesTable } = $derived(context);
</script>

{#if context}
  {@html heading(
    'Pendaftaran Anggota',
    'Periksa data dan setoran sebelum keanggotaan diaktifkan.',
  ) ?? ''}
  <section class="panel">
    {@html toolbar(['Menunggu verifikasi', 'Perlu perbaikan', 'Disetujui']) ?? ''}
    <div id="staff-table">{@html candidatesTable() ?? ''}</div>
  </section>
{/if}
