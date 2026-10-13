<script>
  import { workflowService } from '../../../shared/services/workflow.js';
  import { reportsService } from '../../../shared/services/reports.js';
  import Reports from '../../../shared/components/reports/Reports.svelte';
  import WorkflowPage from '../../../shared/components/workflow/WorkflowPage.svelte';
  let { route } = $props();
  const pages = {
    laporan: [Reports, () => reportsService.getViewContext()],
    pengunduran: [WorkflowPage, () => workflowService.getViewContext()],
  };
</script>

{#if pages[route]}
  {@const Page = pages[route][0]}
  {@const context = pages[route][1]()}
  <Page {context} {route} />
{:else}
  <p role="alert">Halaman tidak ditemukan.</p>
{/if}
