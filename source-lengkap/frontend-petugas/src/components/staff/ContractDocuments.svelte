<script>
  import DataTable from '../../../../shared/components/DataTable.svelte';
  import EmptyTableRow from '../../../../shared/components/EmptyTableRow.svelte';
  import Badge from '../../../../shared/components/Badge.svelte';
  import ReviewAction from '../../../../shared/components/ReviewAction.svelte';
  import { workflowService } from '../../../../shared/services/workflow.js';
  let { context } = $props();
  let { esc, badge, workflowItems, dateLabel, reviewButton, heading, table } = $derived(context);
</script>

{#if context}
  {@const items = workflowItems().filter((x) => x.kind === 'capital')}
  {@const ready = items.filter((x) => x.status === 'ready')}
  {@const documents = items.filter((x) => x.contractNumber)}
  {@html heading('Dokumen Akad', 'Siapkan draf setelah data pengajuan dan setoran diperiksa.') ??
    ''}{@html (workflowService?.staffDocuments() || '') ?? ''}
  <section class="panel">
    <div class="panel-head">
      <h2>Penyiapan akad</h2>
      {@html badge(ready.length + ' pengajuan') ?? ''}
    </div>
    <DataTable headers={['PENGAJUAN', 'ANGGOTA', 'PEMERIKSAAN', '']}>
      {#each ready as x}
        <tr
          ><td
            ><strong>Penyertaan Modal</strong><small>PM-{x.id.slice(0, 8).toUpperCase()}</small></td
          ><td>{x.memberName}</td><td><Badge text={'Siap dibuat'} /></td><td
            ><ReviewAction id={x.id} label={'Buat PDF'} /></td
          ></tr
        >
      {:else}
        <EmptyTableRow columns={4} message={'Tidak ada data yang sesuai.'} />
      {/each}
    </DataTable>
  </section>
  <section class="panel">
    <div class="panel-head">
      <h2>Daftar dokumen</h2>
      {@html badge(documents.length + ' dokumen') ?? ''}
    </div>
    <DataTable headers={['NOMOR AKAD', 'ANGGOTA', 'JENIS', 'STATUS', '']}>
      {#each documents as x}
        <tr
          ><td
            ><strong>{x.contractNumber}</strong><small
              >{dateLabel(x.contractData?.agreementDate + 'T12:00:00Z')}</small
            ></td
          ><td>{x.memberName}</td><td>Penyertaan Modal</td><td><Badge text={x.statusLabel} /></td
          ><td><ReviewAction id={x.id} label={'Lihat'} /></td></tr
        >
      {:else}
        <EmptyTableRow columns={5} message={'Tidak ada data yang sesuai.'} />
      {/each}
    </DataTable>
  </section>
{/if}
