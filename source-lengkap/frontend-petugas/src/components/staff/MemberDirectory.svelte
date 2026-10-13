<script>
  let { context } = $props();
  let { heading, toolbar, table, membersTable } = $derived(context);
</script>

{#if context}
  {@html heading('Data Anggota', 'Identitas dan posisi keuangan anggota yang sudah aktif.') ?? ''}
  <section class="panel">
    {@html toolbar([], 'Cari nama atau nomor anggota…') ?? ''}
    <div id="staff-table">{@html membersTable() ?? ''}</div>
  </section>
{/if}
