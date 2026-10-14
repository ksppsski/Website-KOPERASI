<script>
  import Icon from '../../../../shared/components/Icon.svelte';
  import PageHeading from '../../../../shared/components/PageHeading.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  import { getContext } from 'svelte';
  const app = getContext('kspps-portal');
  import Tabs from '../../../../shared/components/Tabs.svelte';
  import Badge from '../../../../shared/components/Badge.svelte';

  let { context } = $props();
  let { rupiah, icon, state, savingsState, serviceLocked, heading, requestPanel } =
    $derived(context);
</script>

{#if context}
  {#if !savingsState()?.active}
    <Content value={serviceLocked('Pembiayaan') ?? ''} /><Content
      value={(app.services.withdrawal?.memberFinancing() || '') ?? ''}
    />
  {:else}
    <PageHeading
      title={'Pembiayaan'}
      description={'Rincian pengadaan barang, akad, dan jadwal pembayaran.'}
      ><button type="button" class="btn" data-action="apply-finance"
        ><Icon name="plus" />Ajukan pembiayaan</button
      ></PageHeading
    ><Content value={(app.services.withdrawal?.memberFinancing() || '') ?? ''} /><Tabs
      items={['Semua', 'Aktif', 'Pengajuan']}
      current={state.financeTab}
      name={'finance'}
    />{#if state.financeTab !== 'Pengajuan' && !app.services.workflow?.getFinancing()?.length}
      <div class="content-grid">
        <article class="contract">
          <div class="contract-top">
            <span class="eyebrow">Akad pembiayaan</span><Badge
              text={'Belum ada'}
              variant={'gray'}
            />
          </div>
          <h2>Pengadaan kebutuhan barang</h2>
          <div class="amount">{rupiah(0)}</div>
          <p class="small muted">Belum ada akad pembiayaan aktif.</p>
          <div class="contract-footer">
            <a class="link-button" href="#dokumen">Dokumen akad ↗</a>
          </div>
        </article>
        <section class="panel">
          <div class="panel-head">
            <h2>Angsuran berikutnya</h2>
            <Badge text={'Belum ada'} variant={'gray'} />
          </div>
          <div class="next-payment">
            <span class="small muted">Belum ada jadwal pembayaran.</span><strong>{rupiah(0)}</strong
            >
          </div>
        </section>
      </div>
    {/if}<Content value={requestPanel('Pembiayaan', state.financeTab === 'Pengajuan') ?? ''} />
  {/if}
{/if}
