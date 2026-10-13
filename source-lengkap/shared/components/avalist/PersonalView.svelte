<script>
  import Badge from '../Badge.svelte';
  import Payments from './Payments.svelte';
  let { data, route } = $props();
  const money = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  let fees = $derived(data.feeSummary);
  let selectedPeriod = $state('');
  let currentMonth = $derived(data.today?.slice(0, 7) || fees?.asOf?.slice(0, 7) || '');
  let period = $derived(selectedPeriod || currentMonth);
  let monthly = $derived(
    data.monthlyFees?.find((row) => row.month === period) || {
      month: period,
      total: 0,
      paid: 0,
      paidForPeriod: 0,
      pending: 0,
      notDueYet: 0,
    },
  );
  let years = $derived(
    [
      ...new Set([
        currentMonth.slice(0, 4),
        period.slice(0, 4),
        ...(data.monthlyFees || []).map((row) => row.month.slice(0, 4)),
      ]),
    ]
      .filter(Boolean)
      .sort()
      .reverse(),
  );
  const monthNames = [
    'Januari',
    'Februari',
    'Maret',
    'April',
    'Mei',
    'Juni',
    'Juli',
    'Agustus',
    'September',
    'Oktober',
    'November',
    'Desember',
  ];
  const monthLabel = (value) => `${monthNames[Number(value.slice(5, 7)) - 1]} ${value.slice(0, 4)}`;
  const dateLabel = (value) =>
    new Date(value + 'T00:00:00+08:00').toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    });
  let visibleHistory = $derived((data?.history || []).filter((p) => p.status === 'paid'));
</script>

{#if !data.person}<section class="panel av-form-panel">
    <h2>Profil avalist belum ditetapkan</h2>
    <p>Minta Manajer mendaftarkan email akun ini melalui Daftar Avalist, lalu perbarui halaman.</p>
  </section>
{:else if route === 'avalist-ringkasan'}
  <section class="av-monthly" aria-labelledby="avalist-monthly-fee">
    <div class="av-month-heading">
      <div>
        <h2 id="avalist-monthly-fee">Fee bulanan</h2>
        <p class="subtext">{monthLabel(period)}</p>
      </div>
      <div class="av-month-controls">
        <label
          >Bulan<select
            value={period.slice(5, 7)}
            onchange={(e) => (selectedPeriod = period.slice(0, 4) + '-' + e.currentTarget.value)}
          >
            {#each monthNames as name, i}<option value={String(i + 1).padStart(2, '0')}
                >{name}</option
              >{/each}
          </select></label
        >
        <label
          >Tahun<select
            value={period.slice(0, 4)}
            onchange={(e) => (selectedPeriod = e.currentTarget.value + period.slice(4))}
          >
            {#each years as year}<option value={year}>{year}</option>{/each}
          </select></label
        >
      </div>
    </div>
    <div class="av-metrics av-month-metrics" aria-live="polite" aria-atomic="true">
      <section class="panel av-month-total">
        <span>{period === currentMonth ? 'Total fee bulan ini' : 'Total fee bulan terpilih'}</span>
        <strong>{money(monthly.total)}</strong>
        <small>Seluruh jadwal bagi hasil {monthLabel(period)}, termasuk penyesuaian</small>
        {#if monthly.notDueYet}<small>Belum jatuh tempo: {money(monthly.notDueYet)}</small>{/if}
      </section>
      <section class="panel av-month-paid">
        <span
          >{monthly.paid < 0
            ? period === currentMonth
              ? 'Pengembalian bersih bulan ini'
              : 'Pengembalian bersih bulan terpilih'
            : period === currentMonth
              ? 'Fee sudah dibayar bulan ini'
              : 'Fee sudah dibayar bulan terpilih'}</span
        >
        <strong>{money(Math.abs(monthly.paid))}</strong>
        <small>Nilai bersih berdasarkan tanggal transfer {monthLabel(period)}</small>
      </section>
      <section class="panel av-month-pending">
        <span
          >{monthly.pending < 0
            ? 'Fee periode ini perlu dikembalikan'
            : 'Fee periode ini belum dibayar'}</span
        >
        <strong>{money(Math.abs(monthly.pending))}</strong>
        <small
          >{monthly.pending < 0
            ? 'Saldo pengembalian ke koperasi setelah koreksi'
            : 'Sisa hak bulan terpilih, termasuk yang belum jatuh tempo'}</small
        >
      </section>
    </div>
    <p class="field-hint av-month-note">
      Total fee mengikuti bulan jadwal bagi hasil. Pembayaran mengikuti tanggal transfer dan dapat
      mencakup fee dari bulan lain.
    </p>
  </section>
  <details class="av-cumulative">
    <summary>Akumulasi hingga hari ini</summary>
    <div class="av-cumulative-content">
      {#if fees}
        <section class="panel av-fee-total" aria-labelledby="avalist-total-fee">
          <div>
            <h2 id="avalist-total-fee">Total fee diperoleh</h2>
            <p>Akumulasi sampai {dateLabel(fees.asOf)}</p>
          </div>
          <strong>{money(fees.total)}</strong>
          <p class="av-fee-explanation">
            Fee yang sudah dibayarkan + saldo fee belum diselesaikan. Termasuk penyesuaian yang
            disetujui Manajer; periode mendatang belum dihitung.
          </p>
        </section>
      {/if}
      <div class="av-metrics av-cumulative-metrics">
        <section class="panel">
          <span>{fees?.pending < 0 ? 'Fee perlu dikembalikan' : 'Fee belum dibayarkan'}</span
          ><strong>{fees ? money(Math.abs(fees.pending)) : '—'}</strong>
          <small
            >{fees?.pending < 0
              ? 'Saldo pengembalian ke koperasi setelah koreksi'
              : 'Hak sampai hari ini, setelah koreksi'}</small
          >
          {#if fees?.pendingAdjustments}<small
              >Penyesuaian belum diselesaikan: {money(fees.pendingAdjustments)}</small
            >{/if}
        </section>
        <section class="panel">
          <span>Fee sudah dibayarkan</span><strong>{fees ? money(fees.paid) : '—'}</strong><small
            >Termasuk penyesuaian dan pengembalian</small
          >
        </section>
        <section class="panel">
          <span>Anggota referensi</span><strong>{data.members.length}</strong><small
            >Periode yang menjadi hak Anda</small
          >
        </section>
      </div>
    </div>
  </details>
  <section class="panel av-form-panel">
    <h2>{data.person.name}</h2>
    {#if data.person.bankName && data.person.bankAccount && data.person.accountName}
      <p>{data.person.bankName} · {data.person.bankAccount} · a.n. {data.person.accountName}</p>
    {:else}<p class="field-hint">
        Rekening belum lengkap. Hubungi Manajer untuk melengkapi data pembayaran.
      </p>{/if}
    <Badge
      text={data.person.active ? 'Avalist aktif' : 'Avalist nonaktif'}
      variant={data.person.active ? 'green' : 'gray'}
    />
    <p class="field-hint">Jika data rekening atau penetapan perlu diperbaiki, hubungi Manajer.</p>
  </section>
{:else if route === 'avalist-anggota'}
  <section class="panel av-form-panel">
    <h2>Anggota yang memiliki periode hak Anda</h2>
    {#each data.members as m}<div class="av-person">
        <strong>{m.name}</strong><span>{m.number}</span>
      </div>{:else}<p class="empty-state">
        Belum ada anggota referensi dengan akad yang memenuhi syarat bagi hasil.
      </p>{/each}
  </section>
{:else if route === 'avalist-rincian'}
  <section class="panel">
    <div class="av-table-wrap">
      <table class="data-table av-table">
        <thead
          ><tr><th>Anggota / akad</th><th>Periode</th><th>Bagian Anda</th><th>Status</th></tr
          ></thead
        ><tbody
          >{#each data.items as x}<tr
              ><td><strong>{x.memberName}</strong><small>{x.contractNumber}</small></td><td
                >{x.date}<small>Periode {x.period}</small></td
              ><td>{money(x.amount)}<small>{x.rate}%</small></td><td
                ><Badge
                  text={x.status === 'paid'
                    ? 'Sudah dibayar'
                    : x.blocked
                      ? 'Perlu pemeriksaan'
                      : 'Terjadwal'}
                  variant={x.blocked ? 'red' : x.status === 'paid' ? 'green' : 'blue'}
                /></td
              ></tr
            >{:else}<tr
              ><td colspan="4" class="empty-state"
                >Belum ada periode bagi hasil yang menjadi hak Anda.</td
              ></tr
            >{/each}</tbody
        >
      </table>
    </div>
  </section>
{:else}<section class="panel">
    <Payments rows={visibleHistory} personal={true} />
  </section>{/if}
