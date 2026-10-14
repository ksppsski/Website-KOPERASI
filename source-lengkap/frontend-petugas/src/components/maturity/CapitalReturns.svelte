<script>
  import PageHeading from '../../../../shared/components/PageHeading.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  import DataTable from '../../../../shared/components/DataTable.svelte';
  import EmptyTableRow from '../../../../shared/components/EmptyTableRow.svelte';
  let { context } = $props();
  let { esc, money, date, state, btn, heading, table, stats, loading, error } = $derived(context);
</script>

{#if context}
  {@const r = state.returns}
  <PageHeading
    action={btn('refresh', 'Perbarui')}
    title={'Pengembalian Modal'}
    description={'Jadwal pengembalian berdasarkan pilihan anggota.'}
  />{#if !state.loaded || state.error}
    <Content value={loading() ?? ''} />
  {:else}
    <Content
      value={stats([
        ['Jatuh tempo / tertunda', r.totalDue, 'Siap diproses Finance'],
        ['Terjadwal', r.totalScheduled, 'Menunggu tanggal jatuh tempo'],
      ]) ?? ''}
    />
    <section class="panel">
      <div class="toolbar">
        <label class="form-field"
          ><span>Status</span><select id="maturity-return-filter" class="filter-select"
            ><option value="">Semua jadwal</option
            >{#each [['due', 'Jatuh tempo'], ['scheduled', 'Terjadwal'], ['paid', 'Sudah dikembalikan']] as [v, l]}
              <option value={v} {...state.filter === v ? { selected: true } : {}}>{l}</option>
            {/each}</select
          ></label
        >
      </div>
      <DataTable headers={['ANGGOTA / PROJECT', 'JATUH TEMPO', 'MODAL', 'STATUS', 'TINDAKAN']}>
        {#each r.items.filter((x) => !state.filter || x.status === state.filter) as x}
          <tr
            ><td
              ><strong>{x.memberName}</strong><small
                >{x.memberNumber} · {x.projectCode || '—'}</small
              ></td
            ><td>{date(x.dueDate)}</td><td class="money">{money(x.amount)}</td><td
              ><span
                class="badge {x.status === 'paid' ? 'green' : x.status === 'due' ? 'red' : 'blue'}"
                >{{ paid: 'Sudah dikembalikan', due: 'Jatuh tempo', scheduled: 'Terjadwal' }[
                  x.status
                ]}</span
              ></td
            ><td
              ><button
                type="button"
                class="btn secondary small-btn"
                data-maturity-action={'return-detail'}
                data-id={x.id}>{x.status === 'due' ? 'Proses pengembalian' : 'Rincian'}</button
              ></td
            ></tr
          >
        {:else}
          <EmptyTableRow columns={5} message={'Belum ada pengembalian modal.'} />
        {/each}
      </DataTable>
    </section>
  {/if}
{/if}
