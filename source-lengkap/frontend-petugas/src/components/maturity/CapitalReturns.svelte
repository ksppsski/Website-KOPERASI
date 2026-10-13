<script>
  let { context } = $props();
  let { esc, money, date, state, btn, heading, table, stats, loading, error } = $derived(context);
</script>

{#if context}
  {@const r = state.returns}
  {@html heading('Pengembalian Modal', 'Jadwal pengembalian berdasarkan pilihan anggota.') ??
    ''}{#if !state.loaded || state.error}
    {@html loading() ?? ''}
  {:else}
    {@html stats([
      ['Jatuh tempo / tertunda', r.totalDue, 'Siap diproses Finance'],
      ['Terjadwal', r.totalScheduled, 'Menunggu tanggal jatuh tempo'],
    ]) ?? ''}
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
      {@html table(
        ['ANGGOTA / PROJECT', 'JATUH TEMPO', 'MODAL', 'STATUS', 'TINDAKAN'],
        r.items
          .filter((x) => !state.filter || x.status === state.filter)
          .map(
            (x) =>
              `<tr><td><strong>${esc(x.memberName)}</strong><small>${esc(x.memberNumber)} · ${esc(x.projectCode || '—')}</small></td><td>${date(x.dueDate)}</td><td class="money">${money(x.amount)}</td><td><span class="badge ${x.status === 'paid' ? 'green' : x.status === 'due' ? 'red' : 'blue'}">${{ paid: 'Sudah dikembalikan', due: 'Jatuh tempo', scheduled: 'Terjadwal' }[x.status]}</span></td><td>${btn('return-detail', x.status === 'due' ? 'Proses pengembalian' : 'Rincian', x.id)}</td></tr>`,
          )
          .join(''),
        'Belum ada pengembalian modal.',
      ) ?? ''}
    </section>
  {/if}
{/if}
