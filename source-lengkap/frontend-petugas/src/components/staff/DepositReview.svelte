<script>
  import PageHeading from '../../../../shared/components/PageHeading.svelte';
  import Region from '../../../../shared/components/Region.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  import Icon from '../../../../shared/components/Icon.svelte';

  let { context } = $props();
  let { heading, toolbar, table, depositsTable } = $derived(context);
</script>

{#if context}
  <PageHeading
    title={'Verifikasi Setoran'}
    description={'Lihat hasil rekonsiliasi Finance sebelum melanjutkan pemeriksaan.'}
  />
  <div class="staff-section-note">
    <Icon name={'info'} /><span
      >Setoran menambah saldo setelah <strong>rekonsiliasi Finance</strong>. Pendaftaran juga
      memerlukan persetujuan Admin.</span
    >
  </div>
  <section class="panel">
    <Content value={toolbar(['Menunggu verifikasi', 'Perlu perbaikan', 'Terverifikasi']) ?? ''} />
    <div id="staff-table"><Region name="staff-table" value={depositsTable() ?? ''} /></div>
  </section>
{/if}
