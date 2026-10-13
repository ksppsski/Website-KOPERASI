<script>
  let { context, route, key = route } = $props();
  let { wf, state, button, table, record } = $derived(context);
</script>

{#if context}
  {@const financing = key === 'pengajuan'}
  {@const manager = key === 'manager-pengunduran'}
  <div class="page-heading">
    <div>
      <h1>
        {#if financing}
          Kontrak Pembiayaan
        {:else}
          {#if manager}
            Persetujuan Pengunduran Diri
          {:else}
            Pengembalian Simpanan Pokok
          {/if}
        {/if}
      </h1>
      <p class="subtext">
        {#if financing}
          Catat kontrak yang telah disepakati dan pelunasannya.
        {:else}
          {#if manager}
            Tutup keanggotaan setelah persetujuan Admin dan pengembalian Finance.
          {:else}
            Kembalikan Rp100.000 setelah permohonan disetujui Admin.
          {/if}
        {/if}
      </p>
    </div>
    <div class="wf-actions">
      {#if financing}
        {@html button('record', 'Catat kontrak') ?? ''}
      {/if}{@html button('refresh', 'Perbarui') ?? ''}
    </div>
  </div>
  <section class="panel">
    {#if state.error}
      <p class="form-error" role="alert">{state.error}</p>
    {:else}
      {#if !state.loaded}
        <p role="status">Memuat data…</p>
      {:else}
        {@html table(
          manager ? state.items.filter((x) => x.status !== 'finance_pending') : state.items,
          financing,
        ) ?? ''}
      {/if}
    {/if}
  </section>
{/if}
