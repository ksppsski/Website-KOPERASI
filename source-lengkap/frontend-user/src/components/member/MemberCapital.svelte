<script>
  import Icon from '../../../../shared/components/Icon.svelte';
  import PageHeading from '../../../../shared/components/PageHeading.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  import { getContext } from 'svelte';
  const app = getContext('kspps-portal');
  import CapitalContractCard from './CapitalContractCard.svelte';
  import Tabs from '../../../../shared/components/Tabs.svelte';

  let { context } = $props();
  let { esc, rupiah, icon, badge, state, savingsState, serviceLocked, currentContracts, heading } =
    $derived(context);
</script>

{#if context}
  {#if !savingsState()?.active}
    <Content value={serviceLocked('Penyertaan Modal') ?? ''} /><Content
      value={(app.services.maturity?.reminders() || '') ?? ''}
    /><Content value={(app.services.workflow?.memberCapital() || '') ?? ''} />
  {:else}
    {@const cs = currentContracts().filter(
      (x) => state.modalTab === 'Semua' || x.status === state.modalTab,
    )}
    <PageHeading title={'Penyertaan Modal'} description={'Untuk pengadaan kebutuhan barang Mitra.'}
      ><button type="button" class="btn" data-action="apply-capital"
        ><Icon name="plus" />Pilih penawaran</button
      ></PageHeading
    ><Content value={(app.services.workflow?.memberOffers() || '') ?? ''} /><Tabs
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
    <Content value={(app.services.workflow?.memberCapital() || '') ?? ''} />
  {/if}
{/if}
