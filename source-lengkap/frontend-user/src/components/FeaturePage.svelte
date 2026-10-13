<script>
  import Reports from '../../../shared/components/reports/Reports.svelte';
  import WorkflowPage from '../../../shared/components/workflow/WorkflowPage.svelte';
  let { route } = $props();
  const pages = {
    laporan: [Reports, 'KsppsReports'],
    pengunduran: [WorkflowPage, 'KsppsWorkflow'],
  };
</script>

{#if pages[route]}
  {@const Page = pages[route][0]}
  {@const context = window[pages[route][1]].getViewContext()}
  <Page {context} {route} />
{:else}
  <p role="alert">Halaman tidak ditemukan.</p>
{/if}
