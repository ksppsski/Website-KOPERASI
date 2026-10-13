<script>
  import Icon from '../../../../shared/components/Icon.svelte';

  let { context, route, key = route } = $props();
  let {
    esc,
    icon,
    badge,
    name,
    dateLabel,
    reviewButton,
    activityLogs,
    pending,
    heading,
    table,
    queueRows,
  } = $derived(context);
</script>

{#if context}
  {@const c = pending()}
  {@html heading(
    'Ringkasan pekerjaan',
    'Lihat antrean dan lanjutkan pemeriksaan anggota.',
    '<span class="date-label">' + dateLabel(new Date()) + '</span>',
  ) ?? ''}{@html (window.KsppsWorkflow?.staffOverview() || '') ?? ''}
  <div class="stats">
    {#each [['pendaftaran', 'Pendaftaran anggota', 'Menunggu verifikasi', 'user'], ['setoran', 'Setoran masuk', 'Perlu dicocokkan', 'wallet'], ['pengajuan', 'Pengajuan layanan', 'Menunggu tinjauan', 'sprout'], ['akad', 'Akad siap dibuat', 'Persyaratan terpenuhi', 'file']] as [key, label, note, ico]}
      <a class="stat" href="#{key}"
        ><div class="stat-top">{label}<span class="stat-icon"><Icon name={ico} /></span></div>
        <div class="stat-value">{c[key]}</div>
        <div class="stat-bottom"><span>{note}</span><Icon name={'arrow'} /></div></a
      >
    {/each}
  </div>
  <div class="content-grid">
    <section class="panel">
      <div class="panel-head">
        <h2>Antrean pemeriksaan</h2>
        <span class="field-hint">Terbaru di atas</span>{@html badge(
          queueRows().length + ' menunggu',
        ) ?? ''}
      </div>
      {@html table(
        ['ANGGOTA / PENGAJUAN', 'STATUS', 'TINDAKAN'],
        queueRows()
          .map(
            (x) =>
              `<tr><td><div class="queue-kind"><span class="activity-symbol">${icon(x.icon)}</span><div><strong>${esc(x.name)}</strong><small>${esc(x.reference || x.id)}<br>${x.kind}</small></div></div></td><td>${badge(x.status)}</td><td>${reviewButton(x.id, 'Periksa', x.registration)}</td></tr>`,
          )
          .join(''),
      ) ?? ''}
    </section>
    <aside>
      <section class="panel">
        <div class="panel-head"><h2>Aktivitas petugas</h2></div>
        {@html activityLogs() ?? ''}
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Alur pemeriksaan</h2></div>
        <ol class="timeline">
          <li>
            <span>1</span>
            <div>Periksa data anggota<small>Identitas dan persyaratan.</small></div>
          </li>
          <li>
            <span>2</span>
            <div>Cocokkan setoran<small>Bukti dan pencatatan dana.</small></div>
          </li>
          <li>
            <span>3</span>
            <div>Siapkan akad<small>Setelah pengajuan memenuhi syarat.</small></div>
          </li>
        </ol>
      </section>
    </aside>
  </div>
{/if}
