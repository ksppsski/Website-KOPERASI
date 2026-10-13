<script>
  import { workflowService } from '../../../shared/services/workflow.js';
  import { activityService } from '../../../shared/services/activity.js';
  import { financeService } from '../../../shared/services/finance.js';
  import { maturityService } from '../../../shared/services/maturity.js';
  import { withdrawalService } from '../../../shared/services/withdrawal.js';
  import { reportsService } from '../../../shared/services/reports.js';
  import { staffAccessService } from '../../../shared/services/staff-access.js';
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
    pengunduran: [WorkflowPage, () => workflowService.getViewContext()],
    penyertaan: [WorkflowPage, () => workflowService.getViewContext()],
    'finance-ringkasan': [FinanceDashboard, () => financeService.getViewContext()],
    'finance-rekonsiliasi': [ReconciliationQueue, () => financeService.getViewContext()],
    'finance-bagi-hasil': [DailyPayout, () => financeService.getViewContext()],
    'finance-pengembalian': [CapitalReturns, () => maturityService.getViewContext()],
    'manager-jatuh-tempo': [MaturityReport, () => maturityService.getViewContext()],
    'manager-pengunduran': [WithdrawalQueue, () => withdrawalService.getViewContext()],
    'finance-pengunduran': [WithdrawalQueue, () => withdrawalService.getViewContext()],
    pengajuan: [WithdrawalQueue, () => withdrawalService.getViewContext()],
    'waktu-kerja': [ManagerActivity, () => activityService.getViewContext()],
    'manager-laporan': [Reports, () => reportsService.getViewContext()],
    'manager-akses': [StaffAccess, () => staffAccessService.getViewContext()],
    'manager-penawaran': [CapitalOffers, () => workflowService.getViewContext()],
  };
</script>

{#if pages[route]}
  {@const Page = pages[route][0]}
  {@const context = pages[route][1]()}
  <Page {context} {route} />
{:else}
  <p role="alert">Halaman tidak ditemukan.</p>
{/if}
