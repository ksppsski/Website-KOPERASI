<script>
  import PageHeading from '../../../../shared/components/PageHeading.svelte';
  import Region from '../../../../shared/components/Region.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  let { context } = $props();
  let { heading, toolbar, table, candidatesTable } = $derived(context);
</script>

{#if context}
  <PageHeading
    title={'Pendaftaran Anggota'}
    description={'Periksa data dan setoran sebelum keanggotaan diaktifkan.'}
  />
  <section class="panel">
    <Content value={toolbar(['Menunggu verifikasi', 'Perlu perbaikan', 'Disetujui']) ?? ''} />
    <div id="staff-table"><Region name="staff-table" value={candidatesTable() ?? ''} /></div>
  </section>
{/if}
