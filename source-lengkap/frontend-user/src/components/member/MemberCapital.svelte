<script>
  import Tabs from '../../../../shared/components/Tabs.svelte';

  let { context } = $props();
  let { esc, rupiah, icon, badge, state, savingsState, serviceLocked, currentContracts, heading } =
    $derived(context);
</script>

{#if context}
  {#if !savingsState()?.active}
    {@html serviceLocked('Penyertaan Modal') ?? ''}{@html (window.KsppsMaturity?.reminders() ||
      '') ??
      ''}{@html (window.KsppsWorkflow?.memberCapital() || '') ?? ''}
  {:else}
    {@const cs = currentContracts().filter(
      (x) => state.modalTab === 'Semua' || x.status === state.modalTab,
    )}
    {@html heading(
      'Penyertaan Modal',
      'Untuk pengadaan kebutuhan barang Mitra.',
      '<button type="button" class="btn" data-action="apply-capital">' +
        icon('plus') +
        'Pilih penawaran</button>',
    ) ?? ''}{@html (window.KsppsWorkflow?.memberOffers() || '') ?? ''}<Tabs
      items={['Semua', 'Aktif', 'Selesai']}
      current={state.modalTab}
      name={'modal'}
    />
    <div class="contract-list">
      {@html (cs
        .map(
          (x) =>
            `<article class="contract"><div class="contract-top"><span class="eyebrow">${esc(x.number)}</span>${badge(x.status === 'Selesai' ? 'Periode selesai' : x.status, x.status === 'Aktif' ? 'green' : 'gray')}</div><h2>${x.title}</h2><p class="small muted">Penyertaan modal sesuai akad kerja sama.</p><div class="amount">${rupiah(x.amount)}</div><dl class="contract-meta"><div><dt>Tanggal mulai</dt><dd>${x.start}</dd></div><div><dt>Akhir periode</dt><dd>${x.end}</dd></div></dl><div class="progress" role="progressbar" aria-label="Periode akad" aria-valuenow="${x.progress}" aria-valuemin="0" aria-valuemax="100"><span style="width:${x.progress}%"></span></div><div class="split-line muted"><span>Periode akad</span><span>${x.progress}% berlalu</span></div><div class="contract-footer"><button class="link-button" type="button" data-action="capital-detail" data-id="${x.id}">Rincian akad ↗</button><a href="#dokumen" class="small">Dokumen akad</a></div></article>`,
        )
        .join('') ||
        '<div class="empty-state">Belum ada akad pada status ini.</div>') ??
        ''}
    </div>
    {@html (window.KsppsWorkflow?.memberCapital() || '') ?? ''}
  {/if}
{/if}
