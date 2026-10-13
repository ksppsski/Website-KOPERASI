<script>
  import DataTable from '../../../../shared/components/DataTable.svelte';
  import EmptyTableRow from '../../../../shared/components/EmptyTableRow.svelte';
  let { context } = $props();
  let { esc, money, date, state, btn, heading, table, stats, loading, error } = $derived(context);
</script>

{#if context}
  {@const r = state.report}
  {@const labels = { extend: 'Lanjut', return: 'Pengembalian', pending: 'Belum memilih' }}
  {@html heading('Akad Jatuh Tempo', 'Ringkasan modal, keputusan anggota, dan pengembalian.') ?? ''}
  <section class="panel">
    <form id="maturity-period-form" class="maturity-period">
      <label class="form-field"
        ><span>Dari tanggal berakhir</span><input
          type="date"
          name="from"
          value={state.from}
          required
        /></label
      ><label class="form-field"
        ><span>Sampai</span><input type="date" name="to" value={state.to} required /></label
      ><button class="btn" type="submit">Tampilkan</button>
    </form>
  </section>
  {#if !state.loaded || state.error}
    {@html loading() ?? ''}
  {:else}
    {@html stats([
      [
        'Total akad berakhir',
        r.total.amount,
        `${r.total.count} akad · ${r.total.memberCount} anggota`,
      ],
      ['Lanjut', r.extended.amount, `${r.extended.count} akad · ${r.extended.memberCount} anggota`],
      [
        'Pengembalian',
        r.returned.amount,
        `${r.returned.count} akad · ${r.returned.memberCount} anggota`,
      ],
      [
        'Belum memilih',
        r.pending.amount,
        `${r.pending.count} akad · ${r.pending.memberCount} anggota`,
      ],
    ]) ?? ''}
    <section class="panel">
      <DataTable
        headers={['ANGGOTA / AKAD', 'PROJECT', 'BERAKHIR', 'MODAL', 'PILIHAN', 'PENGEMBALIAN']}
      >
        {#each r.items as x}
          <tr
            ><td
              ><strong>{x.memberName}</strong><small>{x.memberNumber}<br />{x.contractNumber}</small
              ></td
            ><td>{x.projectCode || '—'}</td><td>{date(x.endDate)}</td><td class="money"
              >{money(x.amount)}</td
            ><td>{labels[x.choice]}<small>{x.confirmedAt ? date(x.confirmedAt) : ''}</small></td><td
              >{x.choice === 'return'
                ? x.paidAt
                  ? 'Selesai · ' + date(x.paidAt)
                  : 'Terjadwal'
                : '—'}</td
            ></tr
          >
        {:else}
          <EmptyTableRow columns={6} message={'Tidak ada akad berakhir pada periode ini.'} />
        {/each}
      </DataTable>
    </section>
  {/if}
{/if}
