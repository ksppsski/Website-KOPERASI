<script>
  import { activityService } from '../../../../shared/services/activity.js';
  let { context } = $props();
  let { wf, date, state, badge, heading, loading, metrics, queueTable } = $derived(context);
</script>

{#if context}
  {@const pending = state.items.filter((x) => x.reconciliation.status !== 'approved').length}
  {@html heading(
    'Ringkasan Finance',
    'Rekonsiliasi setoran dan siapkan bagi hasil anggota.',
    `<span class="date-label">${date(state.date)}</span>`,
  ) ?? ''}{@html (activityService?.queue() || '') ??
    ''}{#if !state.loaded || state.loading || state.error}
    {@html loading() ?? ''}
  {:else}
    {@html metrics() ?? ''}
    <div class="finance-overview">
      <section class="panel">
        <div class="panel-head">
          <h2>Bukti transfer masuk</h2>
          <span class="badge blue">{pending} perlu diperiksa</span>
        </div>
        {@html queueTable() ?? ''}<a class="link-button" href="#finance-rekonsiliasi"
          >Lihat rekonsiliasi →</a
        >
      </section>
      <section class="panel">
        <div class="panel-head"><h2>Bagi hasil harian</h2></div>
        <p class="subtext">
          Daftar transfer untuk {date(state.date)} sudah dihitung dari akad yang dananya direkonsiliasi.
        </p>
        <div class="wf-actions">
          <a class="btn" href="#finance-bagi-hasil">Buka daftar bagi hasil</a>
        </div>
        <p class="field-hint">
          Acuan: tanggal efektif nisbah. Pembayaran pertama satu bulan setelah tanggal efektif.
        </p>
      </section>
    </div>
  {/if}
{/if}
