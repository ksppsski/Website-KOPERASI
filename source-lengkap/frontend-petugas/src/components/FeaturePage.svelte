<script>
  import { getContext } from 'svelte';
  const app = getContext('kspps-portal');
  import FinanceDashboard from './finance/FinanceDashboard.svelte';
  import ReconciliationQueue from './finance/ReconciliationQueue.svelte';
  import DailyPayout from './finance/DailyPayout.svelte';
  import ManagerActivity from './activity/ManagerActivity.svelte';
  import CapitalReturns from './maturity/CapitalReturns.svelte';
  import MaturityReport from './maturity/MaturityReport.svelte';
  import WithdrawalQueue from './withdrawal/WithdrawalQueue.svelte';
  import Reports from '../../../shared/components/reports/Reports.svelte';
  import StaffAccess from './staff-access/StaffAccess.svelte';
  import WorkflowPage from '../../../shared/components/workflow/WorkflowPage.svelte';
  import CapitalOffers from './workflow/CapitalOffers.svelte';

  let { route } = $props();
  const pages = {
    pengunduran: [WorkflowPage, () => app.services.workflow.getViewContext()],
    penyertaan: [WorkflowPage, () => app.services.workflow.getViewContext()],
    'finance-ringkasan': [FinanceDashboard, () => app.services.finance.getViewContext()],
    'finance-rekonsiliasi': [ReconciliationQueue, () => app.services.finance.getViewContext()],
    'finance-bagi-hasil': [DailyPayout, () => app.services.finance.getViewContext()],
    'finance-pengembalian': [CapitalReturns, () => app.services.maturity.getViewContext()],
    'manager-jatuh-tempo': [MaturityReport, () => app.services.maturity.getViewContext()],
    'manager-pengunduran': [WithdrawalQueue, () => app.services.withdrawal.getViewContext()],
    'finance-pengunduran': [WithdrawalQueue, () => app.services.withdrawal.getViewContext()],
    pengajuan: [WithdrawalQueue, () => app.services.withdrawal.getViewContext()],
    'waktu-kerja': [ManagerActivity, () => app.services.activity.getViewContext()],
    'manager-laporan': [Reports, () => app.services.reports.getViewContext()],
    'manager-akses': [StaffAccess, () => app.services.staffAccess.getViewContext()],
    'manager-penawaran': [CapitalOffers, () => app.services.workflow.getViewContext()],
  };
</script>

{#if pages[route]}
  {@const Page = pages[route][0]}
  {@const context = pages[route][1]()}
  <Page {context} {route} />
{:else}
  <p role="alert">Halaman tidak ditemukan.</p>
{/if}
