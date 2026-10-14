<script>
  import PageHeading from '../../../../shared/components/PageHeading.svelte';
  import Region from '../../../../shared/components/Region.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  let { context } = $props();
  let { state, heading, action, table, loading, queueTable } = $derived(context);
</script>

{#if context}
  <PageHeading
    title={'Rekonsiliasi'}
    description={'Cocokkan bukti transfer anggota dengan mutasi rekening.'}
    action={action('refresh', 'Perbarui')}
  />{#if !state.loaded || state.loading || state.error}
    <Content value={loading() ?? ''} />
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
      <div id="finance-queue-table">
        <Region name="finance-queue-table" value={queueTable() ?? ''} />
      </div>
    </section>
    <p class="field-hint">
      Admin hanya dapat melanjutkan persetujuan atau pembuatan akad setelah Finance menyelesaikan
      rekonsiliasi.
    </p>
  {/if}
{/if}
