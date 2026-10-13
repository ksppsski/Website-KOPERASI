<script>
  import Badge from '../../../../shared/components/Badge.svelte';
  import Icon from '../../../../shared/components/Icon.svelte';

  let { context } = $props();
  let {
    rupiah,
    icon,
    badge,
    shortDate,
    savingsState,
    field,
    review,
    heading,
    stat,
    savingsRows,
    download,
  } = $derived(context);
</script>

{#if context}
  {@const v = savingsState()}
  {@html heading(
    'Simpanan Saya',
    'Pantau simpanan pokok, wajib, dan riwayat setoran.',
    '<button type="button" class="btn" data-action="deposit">' +
      icon('plus') +
      'Setor simpanan wajib</button>',
  ) ?? ''}{@html (window.KsppsWorkflow?.savingsNotice() || '') ?? ''}
  <div class="balance-breakdown">
    <div class="stat">
      <div class="stat-top">Simpanan pokok</div>
      <div class="stat-value">{rupiah(v?.basic || 0)}</div>
      <div class="stat-bottom">Dibayar sekali saat mendaftar</div>
    </div>
    <div class="stat">
      <div class="stat-top">Sisa simpanan wajib di muka</div>
      <div class="stat-value">{rupiah(v?.remaining || 0)}</div>
      <div class="stat-bottom">Dialokasikan Rp10.000 per bulan</div>
    </div>
  </div>
  <section class="panel">
    <div class="panel-head">
      <h2>Alokasi simpanan wajib</h2>
      <Badge text={v?.active ? 'Aktif' : 'Tidak aktif'} variant={v?.active ? 'blue' : 'red'} />
    </div>
    <dl class="review-list">
      <div>
        <dt>Total setoran wajib terverifikasi</dt>
        <dd>{rupiah(v?.paid || 0)}</dd>
      </div>
      <div>
        <dt>Sudah dialokasikan</dt>
        <dd>{rupiah(v?.allocated || 0)}</dd>
      </div>
      <div>
        <dt>Kewajiban belum terpenuhi</dt>
        <dd>{rupiah(v?.arrears || 0)}</dd>
      </div>
      <div>
        <dt>Jadwal berikutnya</dt>
        <dd>
          {#if v?.nextDue}
            {shortDate(v.nextDue + 'T12:00:00Z')}
          {:else}
            —
          {/if}
        </dd>
      </div>
    </dl>
    <p class="field-hint">
      Rp10.000 dialokasikan sejak bulan pendaftaran. Tanggal yang tidak tersedia memakai hari
      terakhir bulan tersebut. Total simpanan tetap tercatat.
    </p>
    <details class="wf-detail">
      <summary>Riwayat alokasi bulanan</summary>
      <div class="table-scroll">
        <table>
          <thead
            ><tr><th>TANGGAL</th><th>KEWAJIBAN</th><th>TERALOKASI</th><th>STATUS</th></tr></thead
          ><tbody
            >{@html ((v?.periods || [])
              .slice()
              .reverse()
              .map(
                (x) =>
                  `<tr><td>${shortDate(x.date + 'T12:00:00Z')}</td><td>${rupiah(x.amount)}</td><td>${rupiah(x.allocated)}</td><td>${badge(x.status, x.status === 'Terpenuhi' ? 'green' : 'amber')}</td></tr>`,
              )
              .join('') ||
              '<tr><td colspan="4">Belum ada jadwal.</td></tr>') ??
              ''}</tbody
          >
        </table>
      </div>
    </details>
  </section>
  <section class="panel">
    <div class="panel-head">
      <h2>Riwayat setoran</h2>
      <button class="btn secondary small-btn" type="button" data-action="export-savings"
        ><Icon name={'download'} />Unduh CSV</button
      >
    </div>
    <div class="toolbar">
      <label class="search-wrap"
        ><Icon name={'search'} /><input
          class="search-input"
          id="savings-search"
          type="search"
          placeholder="Cari setoran…"
          aria-label="Cari setoran"
        /></label
      ><select class="filter-select" id="savings-filter" aria-label="Filter jenis simpanan"
        ><option value="">Semua simpanan</option><option>Simpanan Pokok</option><option
          >Simpanan Wajib</option
        ><option>Simpanan Lainnya</option></select
      >
    </div>
    <div class="table-scroll">
      <table>
        <thead
          ><tr><th>TANGGAL</th><th>KETERANGAN</th><th class="money">NOMINAL</th><th>STATUS</th></tr
          ></thead
        ><tbody id="savings-rows">{@html savingsRows() ?? ''}</tbody>
      </table>
    </div>
    <p class="table-note">Setoran menambah saldo setelah rekonsiliasi Finance.</p>
  </section>
  {@html (window.KsppsWorkflow?.savingsDeposits() || '') ?? ''}
{/if}
