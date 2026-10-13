<script>
  import Badge from '../../../../shared/components/Badge.svelte';
  let { contract: x, rupiah } = $props();
</script>

<article class="contract">
  <div class="contract-top">
    <span class="eyebrow">{x.number}</span><Badge
      text={x.status === 'Selesai' ? 'Periode selesai' : x.status}
      variant={x.status === 'Aktif' ? 'green' : 'gray'}
    />
  </div>
  <h2>{x.title}</h2>
  <p class="small muted">Penyertaan modal sesuai akad kerja sama.</p>
  <div class="amount">{rupiah(x.amount)}</div>
  <dl class="contract-meta">
    <div>
      <dt>Tanggal mulai</dt>
      <dd>{x.start}</dd>
    </div>
    <div>
      <dt>Akhir periode</dt>
      <dd>{x.end}</dd>
    </div>
  </dl>
  <div
    class="progress"
    role="progressbar"
    aria-label="Periode akad"
    aria-valuenow={x.progress}
    aria-valuemin="0"
    aria-valuemax="100"
  >
    <span style={'width:' + x.progress + '%'}></span>
  </div>
  <div class="split-line muted"><span>Periode akad</span><span>{x.progress}% berlalu</span></div>
  <div class="contract-footer">
    <button class="link-button" type="button" data-action="capital-detail" data-id={x.id}
      >Rincian akad ↗</button
    ><a href="#dokumen" class="small">Dokumen akad</a>
  </div>
</article>
