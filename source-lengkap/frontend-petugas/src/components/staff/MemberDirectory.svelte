<script>
  import PageHeading from '../../../../shared/components/PageHeading.svelte';
  import Region from '../../../../shared/components/Region.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  let { context } = $props();
  let { heading, toolbar, table, membersTable } = $derived(context);
</script>

{#if context}
  <PageHeading
    title={'Data Anggota'}
    description={'Identitas dan posisi keuangan anggota yang sudah aktif.'}
  />
  <section class="panel">
    <Content value={toolbar([], 'Cari nama atau nomor anggota…') ?? ''} />
    <div id="staff-table"><Region name="staff-table" value={membersTable() ?? ''} /></div>
  </section>
{/if}
