<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  import { attributeProps } from '../../../../../shared/runtime/view.js';
  export {
    IconView,
    BadgeView,
    StripView,
    HeadingView,
    Review2View,
    ReviewView,
    ButtonView,
    Toolbar2View,
    ToolbarView,
    Table2View,
    Table3View,
    TableView,
    Checks2View,
    ChecksView,
    StatusHeadView,
  };
</script>

{#snippet IconView({ content })}
  <svg class="icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d={content}></path>
  </svg>
{/snippet}

{#snippet BadgeView({ statusColor, s })}
  <span class={'badge ' + statusColor}><Content value={s} /></span>
{/snippet}

{#snippet StripView({ icon })}
  <div class="prototype-strip">
    <Content value={icon} /><strong>Portal Petugas</strong><span
      >Akses sesuai akun yang disetujui Manajer</span
    >
  </div>
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

{#snippet Review2View({ a, b })}
  <div>
    <dt><Content value={a} /></dt>
    <dd><Content value={b} /></dd>
  </div>
{/snippet}

{#snippet ReviewView({ join })}
  <dl class="review-list">
    <Content value={join} />
  </dl>
{/snippet}

{#snippet ButtonView({ action, id, label, icon })}
  <button type="button" class="btn secondary small-btn" data-action={action} data-id={id}>
    <Content value={label} />
    <Content value={icon} />
  </button>
{/snippet}

{#snippet Toolbar2View({ filterContent, s })}
  <option {...attributeProps(filterContent)}><Content value={s} /></option>
{/snippet}

{#snippet ToolbarView({ statusesRows })}
  <div class="toolbar">
    <select class="filter-select" id="staff-filter" aria-label="Filter status">
      <option value="">Semua status</option>
      <Content value={statusesRows} />
    </select>
  </div>
{/snippet}

{#snippet Table2View({ h })}
  <th><Content value={h} /></th>
{/snippet}

{#snippet Table3View({ length })}
  <tr>
    <td colspan={length}>
      <div class="empty-state">Tidak ada data yang sesuai.</div>
    </td>
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

{#snippet Checks2View({ fieldName, text })}
  <label class="check"
    ><input type="checkbox" name={fieldName} required="" /><Content value={text} /></label
  >
{/snippet}

{#snippet ChecksView({ itemsRows })}
  <div class="review-checks">
    <h3>Daftar pemeriksaan</h3>
    <Content value={itemsRows} />
  </div>
{/snippet}

{#snippet StatusHeadView({ id, badge })}
  <div class="status-head">
    <span class="eyebrow"><Content value={id} /></span><Content value={badge} />
  </div>
{/snippet}
