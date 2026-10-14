<script>
  import PageHeading from '../../../../shared/components/PageHeading.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  import { getContext } from 'svelte';
  const app = getContext('kspps-portal');
  import DataTable from '../../../../shared/components/DataTable.svelte';
  import EmptyTableRow from '../../../../shared/components/EmptyTableRow.svelte';
  import Badge from '../../../../shared/components/Badge.svelte';
  import ReviewAction from '../../../../shared/components/ReviewAction.svelte';
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
  const dashboardMetrics = [
    ['pendaftaran', 'Pendaftaran anggota', 'Menunggu verifikasi', 'user'],
    ['setoran', 'Setoran masuk', 'Perlu dicocokkan', 'wallet'],
    ['pengajuan', 'Pengajuan layanan', 'Menunggu tinjauan', 'sprout'],
    ['akad', 'Akad siap dibuat', 'Persyaratan terpenuhi', 'file'],
  ];
</script>

{#if context}
  {@const c = pending()}
  <PageHeading
    title={'Ringkasan pekerjaan'}
    description={'Lihat antrean dan lanjutkan pemeriksaan anggota.'}
    ><span class="date-label">{dateLabel(new Date())}</span></PageHeading
  ><Content value={(app.services.workflow?.staffOverview() || '') ?? ''} />
  <div class="stats">
    {#each dashboardMetrics as [key, label, note, ico]}
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
        <span class="field-hint">Terbaru di atas</span><Content
          value={badge(queueRows().length + ' menunggu') ?? ''}
        />
      </div>
      <DataTable headers={['ANGGOTA / PENGAJUAN', 'STATUS', 'TINDAKAN']}>
        {#each queueRows() as x}
          <tr
            ><td
              ><div class="queue-kind">
                <span class="activity-symbol"><Icon name={x.icon} /></span>
                <div>
                  <strong>{x.name}</strong><small>{x.reference || x.id}<br />{x.kind}</small>
                </div>
              </div></td
            ><td><Badge text={x.status} /></td><td
              ><ReviewAction id={x.id} label={'Periksa'} registration={x.registration} /></td
            ></tr
          >
        {:else}
          <EmptyTableRow columns={3} message={'Tidak ada data yang sesuai.'} />
        {/each}
      </DataTable>
    </section>
    <aside>
      <section class="panel">
        <div class="panel-head"><h2>Aktivitas petugas</h2></div>
        <Content value={activityLogs() ?? ''} />
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
