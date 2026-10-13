<script>
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
    pengunduran: [WorkflowPage, 'KsppsWorkflow'],
    penyertaan: [WorkflowPage, 'KsppsWorkflow'],
    'finance-ringkasan': [FinanceDashboard, 'KsppsFinance'],
    'finance-rekonsiliasi': [ReconciliationQueue, 'KsppsFinance'],
    'finance-bagi-hasil': [DailyPayout, 'KsppsFinance'],
    'finance-pengembalian': [CapitalReturns, 'KsppsMaturity'],
    'manager-jatuh-tempo': [MaturityReport, 'KsppsMaturity'],
    'manager-pengunduran': [WithdrawalQueue, 'KsppsWithdrawal'],
    'finance-pengunduran': [WithdrawalQueue, 'KsppsWithdrawal'],
    pengajuan: [WithdrawalQueue, 'KsppsWithdrawal'],
    'waktu-kerja': [ManagerActivity, 'KsppsActivity'],
    'manager-laporan': [Reports, 'KsppsReports'],
    'manager-akses': [StaffAccess, 'KsppsStaffAccess'],
    'manager-penawaran': [CapitalOffers, 'KsppsWorkflow'],
  };
</script>

{#if pages[route]}
  {@const Page = pages[route][0]}
  {@const context = window[pages[route][1]].getViewContext()}
  <Page {context} {route} />
{:else}
  <p role="alert">Halaman tidak ditemukan.</p>
{/if}
