<script>
  let { context } = $props();
  let { state, names, manager, cards, upload } = $derived(context);
</script>

{#if context}
  <div class="page-heading">
    <div>
      <h1>Laporan Koperasi</h1>
      <p class="subtext">Penggunaan dana penyertaan modal dan laporan keuangan.</p>
    </div>
    {#if manager()}
      <button class="btn" data-report-action="upload">+ Unggah laporan</button>
    {/if}
  </div>
  <section class="panel">
    <div class="toolbar">
      <label class="form-field"
        ><span>Jenis laporan</span><select class="filter-select" id="report-filter"
          ><option value="">Semua laporan</option>{#each Object.entries(names) as [v, n]}
            <option value={v} {...state.filter === v ? { selected: true } : {}}>{n}</option>
          {/each}</select
        ></label
      ><button class="btn secondary small-btn" data-report-action="refresh">Perbarui</button>
    </div>
    <div id="report-list">{@html cards() ?? ''}</div>
  </section>
{/if}
