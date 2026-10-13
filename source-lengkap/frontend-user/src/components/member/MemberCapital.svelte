<script>
  import CapitalContractCard from './CapitalContractCard.svelte';
  import { workflowService } from '../../../../shared/services/workflow.js';
  import { maturityService } from '../../../../shared/services/maturity.js';
  import Tabs from '../../../../shared/components/Tabs.svelte';

  let { context } = $props();
  let { esc, rupiah, icon, badge, state, savingsState, serviceLocked, currentContracts, heading } =
    $derived(context);
</script>

{#if context}
  {#if !savingsState()?.active}
    {@html serviceLocked('Penyertaan Modal') ?? ''}{@html (maturityService?.reminders() || '') ??
      ''}{@html (workflowService?.memberCapital() || '') ?? ''}
  {:else}
    {@const cs = currentContracts().filter(
      (x) => state.modalTab === 'Semua' || x.status === state.modalTab,
    )}
    {@html heading(
      'Penyertaan Modal',
      'Untuk pengadaan kebutuhan barang Mitra.',
      '<button type="button" class="btn" data-action="apply-capital">' +
        icon('plus') +
        'Pilih penawaran</button>',
    ) ?? ''}{@html (workflowService?.memberOffers() || '') ?? ''}<Tabs
      items={['Semua', 'Aktif', 'Selesai']}
      current={state.modalTab}
      name={'modal'}
    />
    <div class="contract-list">
      {#each cs as contract (contract.id)}
        <CapitalContractCard {contract} {rupiah} />
      {:else}
        <div class="empty-state">Belum ada akad pada status ini.</div>
      {/each}
    </div>
    {@html (workflowService?.memberCapital() || '') ?? ''}
  {/if}
{/if}
