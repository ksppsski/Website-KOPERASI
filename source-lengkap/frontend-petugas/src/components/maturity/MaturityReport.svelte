<script>
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
      {@html table(
        ['ANGGOTA / AKAD', 'PROJECT', 'BERAKHIR', 'MODAL', 'PILIHAN', 'PENGEMBALIAN'],
        r.items
          .map(
            (x) =>
              `<tr><td><strong>${esc(x.memberName)}</strong><small>${esc(x.memberNumber)}<br>${esc(x.contractNumber)}</small></td><td>${esc(x.projectCode || '—')}</td><td>${date(x.endDate)}</td><td class="money">${money(x.amount)}</td><td>${labels[x.choice]}<small>${x.confirmedAt ? date(x.confirmedAt) : ''}</small></td><td>${x.choice === 'return' ? (x.paidAt ? 'Selesai · ' + date(x.paidAt) : 'Terjadwal') : '—'}</td></tr>`,
          )
          .join(''),
        'Tidak ada akad berakhir pada periode ini.',
      ) ?? ''}
    </section>
  {/if}
{/if}
