<script>
  let { context } = $props();
  let { state, heading, action, table, loading, queueTable } = $derived(context);
</script>

{#if context}
  {@html heading(
    'Rekonsiliasi',
    'Cocokkan bukti transfer anggota dengan mutasi rekening.',
    action('refresh', 'Perbarui'),
  ) ?? ''}{#if !state.loaded || state.loading || state.error}
    {@html loading() ?? ''}
  {:else}
    <section class="panel">
      <div class="toolbar">
        <select class="filter-select" id="finance-filter" aria-label="Status rekonsiliasi"
          ><option value="">Semua status</option
          >{#each [['pending', 'Menunggu Finance'], ['correction', 'Perlu perbaikan'], ['approved', 'Sudah direkonsiliasi']] as [v, t]}
            <option value={v} {...state.filter === v ? { selected: true } : {}}>{t}</option>
          {/each}</select
        >
      </div>
      <div id="finance-queue-table">{@html queueTable() ?? ''}</div>
    </section>
    <p class="field-hint">
      Admin hanya dapat melanjutkan persetujuan atau pembuatan akad setelah Finance menyelesaikan
      rekonsiliasi.
    </p>
  {/if}
{/if}
