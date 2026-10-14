<script module>
  import Content from '../../../components/Content.svelte';
  import { attributeProps } from '../../../runtime/view.js';
  export {
    ButtonView,
    FieldView,
    Details2View,
    DetailsView,
    Summary2View,
    SummaryView,
    ClosedPageView,
    Eligibility2View,
    EligibilityView,
    Table2View,
    Table3View,
    TableView,
    MemberFinancing2View,
    MemberFinancingView,
  };
</script>

{#snippet ButtonView({ action, id, text })}
  <button type="button" class="btn secondary small-btn" data-resign-action={action} data-id={id}>
    <Content value={text} />
  </button>
{/snippet}

{#snippet FieldView({ label, fieldName, type, extra })}
  <label class="form-field"
    ><span><Content value={label} /> *</span><input
      name={fieldName}
      {type}
      {...attributeProps(extra)}
      required=""
    /></label
  >
{/snippet}

{#snippet Details2View({ k, v })}
  <div>
    <dt><Content value={k} /></dt>
    <dd><Content value={v} /></dd>
  </div>
{/snippet}

{#snippet DetailsView({ rowsRows })}
  <dl class="review-list">
    <Content value={rowsRows} />
  </dl>
{/snippet}

{#snippet Summary2View({ proofUrl })}
  <a class="btn secondary small-btn" href={proofUrl} target="_blank" rel="noopener"
    >Bukti pengembalian</a
  >
{/snippet}

{#snippet SummaryView({
  date,
  paidAtContent,
  money,
  paidAtContent2,
  closedAtContent,
  closedAtContent2,
  proofUrlContent,
})}
  <ol class="timeline">
    <li>
      <span>1</span>
      <div>Admin menyetujui<small><Content value={date} /></small></div>
    </li>
    <li>
      <span>2</span>
      <div>
        <Content value={paidAtContent} /><small
          ><Content value={money} /><Content value={paidAtContent2} /></small
        >
      </div>
    </li>
    <li>
      <span>3</span>
      <div>
        <Content value={closedAtContent} /><small><Content value={closedAtContent2} /></small>
      </div>
    </li>
  </ol>
  <Content value={proofUrlContent} />
{/snippet}

{#snippet ClosedPageView({ memberNumber, date, button })}
  <section class="panel">
    <span class="badge gray">Keanggotaan ditutup</span>
    <h1>Keanggotaan Anda telah berakhir.</h1>
    <p>
      Nomor <strong><Content value={memberNumber} /></strong> dinonaktifkan permanen pada
      <Content value={date} />.
    </p>
    <p>
      Untuk bergabung kembali, lakukan pendaftaran dari awal. Anda akan mendapatkan nomor anggota
      baru, termasuk jika menggunakan data diri yang sama.
    </p>
    <Content value={button} />
    <p id="resign-restart-error" class="form-error" role="alert" hidden=""></p>
  </section>
{/snippet}

{#snippet Eligibility2View({ kindContent, label })}
  <li><Content value={kindContent} /> · <Content value={label} /></li>
{/snippet}

{#snippet EligibilityView({ blockersRows })}
  <div class="info-box status-alert-red">
    <strong>Pengunduran diri belum tersedia.</strong>
    <p>Selesaikan kontrak, pengajuan, atau pengembalian modal berikut:</p>
    <ul>
      <Content value={blockersRows} />
    </ul>
  </div>
{/snippet}

{#snippet Table2View({
  memberName,
  memberNumber,
  financingContent,
  settledAtContent,
  statusLabel,
  button,
})}
  <tr>
    <td>
      <strong><Content value={memberName} /></strong><small><Content value={memberNumber} /></small>
    </td>
    <td><Content value={financingContent} /></td>
    <td>
      <span class={'badge ' + settledAtContent}><Content value={statusLabel} /></span>
    </td>
    <td><Content value={button} /></td>
  </tr>
{/snippet}

{#snippet Table3View()}
  <tr><td colspan="4"><div class="empty-state">Belum ada data.</div></td></tr>
{/snippet}

{#snippet TableView({ financingContent, fallbackView })}
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>ANGGOTA</th>
          <th><Content value={financingContent} /></th>
          <th>STATUS</th>
          <th>TINDAKAN</th>
        </tr>
      </thead>
      <tbody>
        <Content value={fallbackView} />
      </tbody>
    </table>
  </div>
{/snippet}

{#snippet MemberFinancing2View({ number, settledAtContent, status, purpose, money, date, date2 })}
  <article class="wf-card">
    <div class="wf-card-head">
      <strong><Content value={number} /></strong><span class={'badge ' + settledAtContent}
        ><Content value={status} /></span
      >
    </div>
    <p><Content value={purpose} /> · <Content value={money} /></p>
    <p class="field-hint"><Content value={date} /> — <Content value={date2} /></p>
  </article>
{/snippet}

{#snippet MemberFinancingView({ rowsRows })}
  <section class="panel">
    <h2>Kontrak pembiayaan Anda</h2>
    <Content value={rowsRows} />
  </section>
{/snippet}
