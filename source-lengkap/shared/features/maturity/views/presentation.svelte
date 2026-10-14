<script module>
  import Content from '../../../components/Content.svelte';
  import { attributeProps } from '../../../runtime/view.js';
  export {
    BtnView,
    HeadingView,
    Table2View,
    Table3View,
    TableView,
    Reminders2View,
    RemindersView,
    Summary2View,
    Summary3View,
    SummaryView,
    Stats2View,
    StatsView,
    LoadingView,
  };
</script>

{#snippet BtnView({ action, id, extra, label })}
  <button
    type="button"
    class="btn secondary small-btn"
    data-maturity-action={action}
    data-id={id}
    {...attributeProps(extra)}
  >
    <Content value={label} />
  </button>
{/snippet}

{#snippet HeadingView({ title, description, btn })}
  <div class="page-heading">
    <div>
      <h1><Content value={title} /></h1>
      <p class="subtext"><Content value={description} /></p>
    </div>
    <Content value={btn} />
  </div>
{/snippet}

{#snippet Table2View({ h })}
  <th><Content value={h} /></th>
{/snippet}

{#snippet Table3View({ length, empty })}
  <tr>
    <td colspan={length}><div class="empty-state"><Content value={empty} /></div></td>
  </tr>
{/snippet}

{#snippet TableView({ join, content })}
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <Content value={join} />
        </tr>
      </thead>
      <tbody>
        <Content value={content} />
      </tbody>
    </table>
  </div>
{/snippet}

{#snippet Reminders2View({ projectCode, money, date, contractNumber, btn })}
  <div class="wf-card">
    <strong><Content value={projectCode} /></strong>
    <p><Content value={money} /> · Berakhir <Content value={date} /></p>
    <p class="field-hint"><Content value={contractNumber} /></p>
    <Content value={btn} />
  </div>
{/snippet}

{#snippet RemindersView({ length, rowsRows })}
  <section class="panel maturity-reminders status-alert-red" aria-label="Pengingat akad berakhir">
    <div class="panel-head">
      <h2>Konfirmasi kelanjutan modal</h2>
      <span class="badge red"><Content value={length} /> akad</span>
    </div>
    <Content value={rowsRows} />
  </section>
{/snippet}

{#snippet Summary2View({ choiceContent, date })}
  <p>
    <Content value={choiceContent} />.
  </p>
  <small>Pilihan dikonfirmasi <Content value={date} /> dan tidak dapat diganti.</small>
{/snippet}

{#snippet Summary3View({ date })}
  <small>Pilihan tersedia mulai <Content value={date} />.</small>
{/snippet}

{#snippet SummaryView({ status, date, dContent })}
  <div class="wf-note">
    <strong><Content value={status} /></strong>
    <p>Akad berakhir <Content value={date} />.</p>
    <Content value={dContent} />
  </div>
{/snippet}

{#snippet Stats2View({ label, money, detail })}
  <div class="stat">
    <div class="stat-top"><Content value={label} /></div>
    <div class="stat-value finance-value"><Content value={money} /></div>
    <div class="stat-bottom"><Content value={detail} /></div>
  </div>
{/snippet}

{#snippet StatsView({ itemsRows })}
  <div class="stats maturity-stats">
    <Content value={itemsRows} />
  </div>
{/snippet}

{#snippet LoadingView({ errorContent, error })}
  <section class="panel">
    <p {...attributeProps(errorContent)}>
      <Content value={error} />
    </p>
  </section>
{/snippet}
