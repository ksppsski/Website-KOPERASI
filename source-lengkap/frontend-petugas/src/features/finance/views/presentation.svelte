<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  import { attributeProps } from '../../../../../shared/runtime/view.js';
  export {
    BadgeView,
    HeadingView,
    ActionView,
    Table2View,
    Table3View,
    TableView,
    LoadingView,
    Loading2View,
    MetricsView,
    QueueTable2View,
    QueueTableView,
    DatePickerView,
  };
</script>

{#snippet BadgeView({ statusColor, label })}
  <span class={'badge ' + statusColor}><Content value={label} /></span>
{/snippet}

{#snippet HeadingView({ title, description, action })}
  <div class="page-heading">
    <div>
      <h1><Content value={title} /></h1>
      <p class="subtext"><Content value={description} /></p>
    </div>
    <Content value={action} />
  </div>
{/snippet}

{#snippet ActionView({ a, attrs, label })}
  <button
    type="button"
    class="btn secondary small-btn"
    data-finance-action={a}
    {...attributeProps(attrs)}
  >
    <Content value={label} />
  </button>
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

{#snippet LoadingView({ error, action })}
  <div class="panel">
    <p class="form-error" role="alert"><Content value={error} /></p>
    <Content value={action} />
  </div>
{/snippet}

{#snippet Loading2View()}
  <div class="panel"><p class="muted" role="status">Memuat data Finance…</p></div>
{/snippet}

{#snippet MetricsView({ money, date, memberCount, transferCount, contractCount })}
  <div class="stats finance-stats">
    <div class="stat">
      <div class="stat-top">Total bagi hasil</div>
      <div class="stat-value finance-value"><Content value={money} /></div>
      <div class="stat-bottom"><Content value={date} /> · 5% per akad</div>
    </div>
    <div class="stat">
      <div class="stat-top">Anggota penerima</div>
      <div class="stat-value"><Content value={memberCount} /></div>
      <div class="stat-bottom"><Content value={transferCount} /> rekening tujuan</div>
    </div>
    <div class="stat">
      <div class="stat-top">Akad terjadwal</div>
      <div class="stat-value"><Content value={contractCount} /></div>
      <div class="stat-bottom">Pembayaran bulanan</div>
    </div>
  </div>
{/snippet}

{#snippet QueueTable2View({ projectCode })}
  <small class="offer-code"><Content value={projectCode} /></small>
{/snippet}

{#snippet QueueTableView({ memberName, memberId, label, projectCodeContent, money, badge, action })}
  <tr>
    <td>
      <strong><Content value={memberName} /></strong><small
        ><Content value={memberId} /> · <Content value={label} /></small
      ><Content value={projectCodeContent} />
    </td>
    <td class="money"><Content value={money} /></td>
    <td><Content value={badge} /></td>
    <td>
      <Content value={action} />
    </td>
  </tr>
{/snippet}

{#snippet DatePickerView({ date, action })}
  <div class="finance-date">
    <label for="finance-date">Tanggal pembayaran</label><input
      id="finance-date"
      type="date"
      min="1901-01-01"
      max="9998-12-31"
      value={date}
    /><Content value={action} />
  </div>
{/snippet}
