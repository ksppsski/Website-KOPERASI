<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  export {
    ShowView,
    ReconciliationDialog2View,
    ReconciliationDialog4View,
    ReconciliationDialog3View,
    ReconciliationDialog5View,
    ReconciliationDialogView,
    Detail3View,
    Detail2View,
    DetailView,
  };
</script>

{#snippet ShowView({ title, action, content })}
  <div class="dialog-inner">
    <div class="dialog-head">
      <h2 id="dialog-title"><Content value={title} /></h2>
      <Content value={action} />
    </div>
    <Content value={content} />
  </div>
{/snippet}

{#snippet ReconciliationDialog2View({ a, b })}
  <div>
    <dt><Content value={a} /></dt>
    <dd><Content value={b} /></dd>
  </div>
{/snippet}

{#snippet ReconciliationDialog4View({ a, b })}
  <div>
    <dt><Content value={a} /></dt>
    <dd><Content value={b} /></dd>
  </div>
{/snippet}

{#snippet ReconciliationDialog3View({ Rows, statusContent })}
  <dl class="review-list">
    <Content value={Rows} />
  </dl>
  <p class="wf-note">
    <Content value={statusContent} />
  </p>
{/snippet}

{#snippet ReconciliationDialog5View({ id, kind, version, sourceVersion, today, todayValue, note })}
  <form
    id="finance-reconcile-form"
    data-id={id}
    data-kind={kind}
    data-version={version}
    data-source-version={sourceVersion}
  >
    <label class="form-field"
      ><span>Nominal masuk di mutasi bank (Rp) *</span><input
        name="receivedAmount"
        type="number"
        min="0"
        max="10000000000000"
        step="1"
        inputmode="numeric"
        required=""
        placeholder="Isi sesuai mutasi bank"
      /></label
    ><label class="form-field"
      ><span>Tanggal dana masuk *</span><input
        name="transferDate"
        type="date"
        min="1901-01-01"
        max={today}
        value={todayValue}
        required=""
      /></label
    ><label class="form-field"
      ><span>Referensi mutasi / transaksi bank *</span><input
        name="reference"
        minlength="3"
        maxlength="160"
        required=""
        placeholder="Nomor referensi atau keterangan mutasi"
      /></label
    ><label class="form-field"
      ><span>Catatan</span><textarea
        name="note"
        maxlength="1500"
        placeholder="Wajib jika meminta perbaikan">&lt;!--<Content value={note} />--&gt;</textarea
      ></label
    ><label class="check"
      ><input type="checkbox" name="confirm" required="" />Bukti transfer cocok dengan mutasi bank
      dan dana sudah diterima.</label
    >
    <p class="form-error" id="finance-error" role="alert" hidden=""></p>
    <div class="decision-actions">
      <button class="btn secondary" type="submit" name="decision" value="return" formnovalidate="">
        Perlu perbaikan</button
      ><button class="btn" type="submit" name="decision" value="approve">
        Simpan rekonsiliasi
      </button>
    </div>
  </form>
{/snippet}

{#snippet ReconciliationDialogView({ panel, badge, Rows, proofUrl, doneContent })}
  <Content value={panel} />
  <div class="status-head"><Content value={badge} /></div>
  <dl class="review-list">
    <Content value={Rows} />
  </dl>
  <div class="wf-actions">
    <a class="btn secondary" href={proofUrl} target="_blank" rel="noopener">Lihat bukti transfer</a>
  </div>
  <Content value={doneContent} />
{/snippet}

{#snippet Detail3View()}
  <br />Menunggu tanda tangan koperasi
{/snippet}

{#snippet Detail2View({ contractNumber, date, contractStatusContent, money, period, money2 })}
  <tr>
    <td>
      <strong><Content value={contractNumber} /></strong><small
        ><Content value={date} /><Content value={contractStatusContent} /></small
      >
    </td>
    <td class="money"><Content value={money} /></td>
    <td><Content value={period} />/12</td>
    <td class="money"><Content value={money2} /></td>
  </tr>
{/snippet}

{#snippet DetailView({ memberName, bankName, bankAccount, date, table, money })}
  <h3><Content value={memberName} /></h3>
  <p class="subtext">
    <Content value={bankName} /> · <Content value={bankAccount} /><br /><Content value={date} />
  </p>
  <Content value={table} />
  <div class="finance-total">
    <span>Total anggota</span><strong><Content value={money} /></strong>
  </div>
{/snippet}
