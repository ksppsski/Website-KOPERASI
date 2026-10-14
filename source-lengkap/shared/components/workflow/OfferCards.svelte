<script>
  import { formatDate, formatMoney } from '../../lib/formatters.js';
  import { offerVisibleToMember } from '../../lib/offer-visibility.js';
  let { offers, manager = false, active = false, now = Date.now() } = $props();
  let visible = $derived(
    manager ? offers : offers.filter((offer) => offerVisibleToMember(offer, now)),
  );
</script>

{#if !visible.length}
  <div class="wf-empty">
    <strong
      >{manager
        ? 'Belum ada penawaran. Buat penawaran pertama untuk anggota.'
        : 'Belum ada penawaran penyertaan modal yang dibuka.'}</strong
    >
  </div>
{:else}
  <div class="offer-grid">
    {#each visible as offer (offer.id)}
      {@const full = offer.remaining <= 0}
      {@const percentage = Math.min(100, Math.round((offer.reserved / offer.quota) * 100))}
      <article class="offer-card">
        <div class="wf-card-head">
          <span class="offer-code">{offer.projectCode}</span>
          <span class="badge {full ? 'blue' : 'green'}">{full ? 'Kuota penuh' : 'Dibuka'}</span>
        </div>
        <h3>{offer.title}</h3>
        <div class="offer-remaining">
          <span>Sisa kuota</span><strong>{formatMoney(offer.remaining)}</strong>
        </div>
        <div
          class="progress"
          role="progressbar"
          aria-label="Kuota terisi"
          aria-valuenow={percentage}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span style:width={percentage + '%'}></span>
        </div>
        <div class="split-line small muted">
          <span>{formatMoney(offer.reserved)} terisi</span><span
            >dari {formatMoney(offer.quota)}</span
          >
        </div>
        {#if manager}
          <p class="field-hint">
            Dibuka {formatDate(offer.createdAt)}
            {#if offer.fulfilledAt}<br />Terpenuhi {formatDate(offer.fulfilledAt)}{/if}
            {#if !offerVisibleToMember(offer, now)}<br />Tidak ditampilkan di portal anggota{/if}
          </p>
        {:else}
          <button
            type="button"
            class="btn full"
            data-wf-action="capital"
            data-id={offer.id}
            disabled={full || !active}
          >
            {full ? 'Kuota penuh' : !active ? 'Simpanan belum aktif' : 'Ikuti penawaran'}
          </button>
        {/if}
      </article>
    {/each}
  </div>
{/if}
