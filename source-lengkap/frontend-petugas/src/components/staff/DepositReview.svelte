<script>
  import Icon from '../../../../shared/components/Icon.svelte';

  let { context } = $props();
  let { heading, toolbar, table, depositsTable } = $derived(context);
</script>

{#if context}
  {@html heading(
    'Verifikasi Setoran',
    'Lihat hasil rekonsiliasi Finance sebelum melanjutkan pemeriksaan.',
  ) ?? ''}
  <div class="staff-section-note">
    <Icon name={'info'} /><span
      >Setoran menambah saldo setelah <strong>rekonsiliasi Finance</strong>. Pendaftaran juga
      memerlukan persetujuan Admin.</span
    >
  </div>
  <section class="panel">
    {@html toolbar(['Menunggu verifikasi', 'Perlu perbaikan', 'Terverifikasi']) ?? ''}
    <div id="staff-table">{@html depositsTable() ?? ''}</div>
  </section>
{/if}
