<script>
  let { state, names } = $props();
  let items = $derived(
    state.reports.filter((report) => !state.filter || report.category === state.filter),
  );
</script>

{#if state.error}
  <p class="form-error" role="alert">{state.error}</p>
{:else if !state.loaded}
  <p role="status">Memuat laporan…</p>
{:else if !items.length}
  <div class="empty-state">Belum ada laporan yang diterbitkan.</div>
{:else}
  <div class="offer-grid">
    {#each items as report (report.id)}
      <article class="offer-card">
        <span class="badge gray">{names[report.category]}</span>
        <h3>{report.title}</h3>
        <p class="small muted">
          Periode {report.period}{#if report.projectCode}
            · <span class="offer-code">{report.projectCode}</span>{/if}
        </p>
        <p class="field-hint">
          Diunggah {new Date(report.createdAt).toLocaleDateString('id-ID', {
            timeZone: 'Asia/Makassar',
          })} oleh {report.uploadedBy}
        </p>
        <div class="wf-actions">
          <a class="btn secondary small-btn" href={report.url} target="_blank" rel="noopener"
            >Lihat PDF</a
          >
          <a class="btn small-btn" href={report.url + '?download=1'}>Unduh</a>
        </div>
      </article>
    {/each}
  </div>
{/if}
