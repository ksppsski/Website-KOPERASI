<script>
  let { context } = $props();
  let {
    wf,
    esc,
    money,
    date,
    state,
    heading,
    action,
    table,
    loading,
    metrics,
    datePicker,
    detail,
  } = $derived(context);
</script>

{#if context}
  {@const p = state.payout}
  {@html heading(
    'Bagi Hasil Harian',
    'Daftar nominal yang perlu ditransfer ke rekening anggota.',
    datePicker(),
  ) ?? ''}{#if !state.loaded || state.loading || state.error}
    {@html loading() ?? ''}
  {:else}
    {@html metrics() ?? ''}{#if p?.task}
      {@html (window.KsppsActivity?.panel(p.task.targetId, 'payout') || '') ?? ''}
    {/if}{#if p?.task && !p.task.completedAt}
      <div class="wf-actions work-payout-action">
        {@html action('payout-complete', 'Selesaikan persiapan') ?? ''}
      </div>
    {/if}
    <section class="panel">
      <div class="panel-head">
        <h2>Daftar transfer · {date(state.date)}</h2>
        {@html action('csv', 'Unduh CSV', p?.members.length ? '' : 'disabled') ?? ''}
      </div>
      {#if p?.missingAccountCount}
        <p class="form-error">
          Ada rekening yang belum lengkap. Periksa rincian anggota sebelum transfer.
        </p>
      {/if}{@html table(
        ['ANGGOTA', 'REKENING TUJUAN', 'AKAD', 'BAGI HASIL', ''],
        (p?.members || [])
          .map(
            (m, i) =>
              `<tr><td><strong>${esc(m.memberName)}</strong><small>${esc(m.memberId)}</small></td><td>${esc(m.bankName || 'Bank belum tersedia')}<small class="finance-account">${esc(m.bankAccount || 'Rekening belum tersedia')}</small><small>a.n. ${esc(m.accountName)}</small></td><td>${m.contractCount}</td><td class="money"><strong>${money(m.amount)}</strong></td><td>${action('detail', 'Rincian', `data-index="${i}"`)}</td></tr>`,
          )
          .join(''),
        'Tidak ada akad yang terjadwal pada tanggal ini.',
      ) ?? ''}
      <div class="finance-total">
        <span>Total bagi hasil</span><strong>{money(p?.total)}</strong>
      </div>
    </section>
    <details class="panel finance-method">
      <summary>Dasar perhitungan</summary>
      <p>
        Bagi hasil per akad = nominal penyertaan modal × 5%. Sistem memilih tanggal efektif nisbah
        dari 12 bulan sebelumnya, dengan tanggal pembayaran bulanan yang jatuh hari ini. Nilai
        dibulatkan ke rupiah terdekat per akad, lalu dijumlahkan per anggota dan rekening.
      </p>
      <div class="finance-dates">
        {#each p?.referenceDates || [] as x}
          <span>{date(x)}</span>
        {/each}
      </div>
      <p>
        Akad pada bulan berjalan belum masuk. Jadwal berhenti setelah tanggal selesai akad. Untuk
        tanggal 29 atau 30 yang tidak tersedia pada bulan pembayaran, jadwal jatuh pada hari
        terakhir bulan tersebut.
      </p>
    </details>
    <p class="field-hint">
      Daftar ini menyiapkan nominal transfer; tidak mengirim uang atau menandai transaksi bank
      sebagai berhasil.
    </p>
  {/if}
{/if}
