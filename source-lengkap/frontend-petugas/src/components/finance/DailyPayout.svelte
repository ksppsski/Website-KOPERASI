<script>
  import PageHeading from '../../../../shared/components/PageHeading.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  import { getContext } from 'svelte';
  const app = getContext('kspps-portal');
  import DataTable from '../../../../shared/components/DataTable.svelte';
  import EmptyTableRow from '../../../../shared/components/EmptyTableRow.svelte';
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
  <PageHeading
    title={'Bagi Hasil Harian'}
    description={'Daftar nominal yang perlu ditransfer ke rekening anggota.'}
    action={datePicker()}
  />{#if !state.loaded || state.loading || state.error}
    <Content value={loading() ?? ''} />
  {:else}
    <Content value={metrics() ?? ''} />{#if p?.task}
      <Content value={(app.services.activity?.panel(p.task.targetId, 'payout') || '') ?? ''} />
    {/if}{#if p?.task && !p.task.completedAt}
      <div class="wf-actions work-payout-action">
        <Content value={action('payout-complete', 'Selesaikan persiapan') ?? ''} />
      </div>
    {/if}
    <section class="panel">
      <div class="panel-head">
        <h2>Daftar transfer · {date(state.date)}</h2>
        <Content value={action('csv', 'Unduh CSV', { disabled: !p?.members.length }) ?? ''} />
      </div>
      {#if p?.missingAccountCount}
        <p class="form-error">
          Ada rekening yang belum lengkap. Periksa rincian anggota sebelum transfer.
        </p>
      {/if}<DataTable headers={['ANGGOTA', 'REKENING TUJUAN', 'AKAD', 'BAGI HASIL', '']}>
        {#each p?.members || [] as m, i}
          <tr
            ><td><strong>{m.memberName}</strong><small>{m.memberId}</small></td><td
              >{m.bankName || 'Bank belum tersedia'}<small class="finance-account"
                >{m.bankAccount || 'Rekening belum tersedia'}</small
              ><small>a.n. {m.accountName}</small></td
            ><td>{m.contractCount}</td><td class="money"><strong>{money(m.amount)}</strong></td><td
              ><button
                type="button"
                class="btn secondary small-btn"
                data-finance-action="detail"
                data-index={i}>Rincian</button
              ></td
            ></tr
          >
        {:else}
          <EmptyTableRow columns={5} message={'Tidak ada akad yang terjadwal pada tanggal ini.'} />
        {/each}
      </DataTable>
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
