<script>
  import PageHeading from '../../../../shared/components/PageHeading.svelte';
  import Region from '../../../../shared/components/Region.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  import Icon from '../../../../shared/components/Icon.svelte';

  let { context } = $props();
  let { heading, documentCards } = $derived(context);
</script>

{#if context}
  <PageHeading title={'Dokumen Akad'} description={'Akses dokumen keanggotaan dan layanan Anda.'} />
  <section>
    <div class="toolbar">
      <label class="search-wrap"
        ><Icon name={'search'} /><input
          class="search-input"
          id="document-search"
          type="search"
          placeholder="Cari nama atau nomor dokumen…"
          aria-label="Cari dokumen"
        /></label
      ><select class="filter-select" id="document-filter" aria-label="Jenis dokumen"
        ><option value="">Semua dokumen</option><option>Keanggotaan</option><option
          >Penyertaan Modal</option
        ><option>Pembiayaan</option></select
      >
    </div>
    <div class="document-grid" id="document-list">
      <Region name="document-list" value={documentCards() ?? ''} />
    </div>
  </section>
{/if}
