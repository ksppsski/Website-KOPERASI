<script>
  import { workflowService } from '../../../../shared/services/workflow.js';
  import Badge from '../../../../shared/components/Badge.svelte';
  import Icon from '../../../../shared/components/Icon.svelte';
  import StatCard from '../../../../shared/components/StatCard.svelte';

  let { context, route } = $props();
  let {
    esc,
    rupiah,
    icon,
    state,
    savingsEntries,
    shortDate,
    savingsState,
    memberAlerts,
    currentContracts,
    recentActivity,
    heading,
    activity,
  } = $derived(context);
</script>

{#if context}
  {@const p = workflowService?.getProfile()}
  {@const active = currentContracts().filter((x) => x.status === 'Aktif')}
  {@const total = savingsEntries().reduce((n, [, v]) => n + v, 0)}
  {@html heading(
    'Assalamu’alaikum' + (state.profile.name ? ', ' + esc(state.profile.name) : '') + '.',
    'Berikut ringkasan keanggotaan Anda.',
    '<span class="date-label">' + shortDate(new Date()) + '</span>',
  ) ?? ''}
  <section class="summary-banner">
    <div>
      <div class="eyebrow">Keanggotaan KSPPS</div>
      <h2>Syirkah Kebaikan Indonesia</h2>
      <Badge
        text={p
          ? workflowService?.needsCorrection(p)
            ? 'Perlu perbaikan'
            : {
                approved: 'Anggota terdaftar',
                pending: 'Menunggu pemeriksaan',
                correction: 'Perlu perbaikan',
              }[p.status]
          : 'Belum terdaftar'}
        variant={p?.status === 'approved' ? 'green' : 'amber'}
      />{#if p?.status === 'approved'}
        <Badge
          text={'Simpanan ' + (savingsState()?.active ? 'aktif' : 'tidak aktif')}
          variant={savingsState()?.active ? 'blue' : 'red'}
        />
      {/if}{#if !p}
        <p><a href="#daftar" class="btn secondary small-btn">Daftar anggota</a></p>
      {/if}
    </div>
    <div class="member-card-meta">
      <div><span>Nomor anggota</span><strong>{p?.memberNumber || '—'}</strong></div>
      <div><span>Bergabung sejak</span><strong>{shortDate(p?.createdAt)}</strong></div>
      <Icon name={'card'} />
    </div>
  </section>
  {@html memberAlerts() ?? ''}{@html (workflowService?.memberOffers() || '') ?? ''}
  <div class="stats">
    <StatCard
      label={'Total simpanan'}
      value={rupiah(total)}
      icon={'wallet'}
      note={'Setoran terverifikasi'}
      route={'simpanan'}
    /><StatCard
      label={'Penyertaan modal aktif'}
      value={rupiah(active.reduce((n, x) => n + x.amount, 0))}
      icon={'sprout'}
      note={active.length + ' akad berjalan'}
      route={'modal'}
    /><StatCard
      label={'Sisa tagihan pembiayaan'}
      value={rupiah(0)}
      icon={'store'}
      note={'Belum ada tagihan'}
      route={'pembiayaan'}
    />
  </div>
  <div class="content-grid">
    <section class="panel">
      <div class="panel-head">
        <h2>Aktivitas terbaru</h2>
        <a href="#simpanan">Lihat riwayat</a>
      </div>
      <ul class="activity-list">{@html recentActivity() ?? ''}</ul>
    </section>
    <aside>
      <section class="panel">
        <div class="panel-head"><h2>Akses cepat</h2></div>
        <div class="quick-actions">
          <button type="button" class="quick-action" data-action="deposit"
            ><Icon name={'upload'} />Konfirmasi<br />setoran</button
          ><button type="button" class="quick-action" data-action="apply-finance"
            ><Icon name={'plus'} />Ajukan<br />pembiayaan</button
          ><a class="quick-action" href="#dokumen"><Icon name={'file'} />Lihat<br />dokumen</a>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <h2>Tagihan berikutnya</h2>
          <Badge text={'Belum ada'} variant={'gray'} />
        </div>
        <div class="next-payment">
          <span class="small muted">Belum ada angsuran terjadwal.</span><strong>{rupiah(0)}</strong>
          <div class="split-line">
            <span class="muted">Pembiayaan</span><a href="#pembiayaan">Rincian ↗</a>
          </div>
        </div>
      </section>
    </aside>
  </div>
{/if}
