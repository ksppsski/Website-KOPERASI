<script>
  import { getContext } from 'svelte';
  const app = getContext('kspps-portal');
  import Reports from '../../../shared/components/reports/Reports.svelte';
  import WorkflowPage from '../../../shared/components/workflow/WorkflowPage.svelte';
  let { route } = $props();
  const pages = {
    laporan: [Reports, () => app.services.reports.getViewContext()],
    pengunduran: [WorkflowPage, () => app.services.workflow.getViewContext()],
  };
</script>

{#if pages[route]}
  {@const Page = pages[route][0]}
  {@const context = pages[route][1]()}
  <Page {context} {route} />
{:else}
  <p role="alert">Halaman tidak ditemukan.</p>
{/if}
