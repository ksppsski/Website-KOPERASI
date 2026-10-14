<script module>
  import Content from '../../../components/Content.svelte';
  import { attributeProps } from '../../../runtime/view.js';
  export {
    ShowView,
    Decide2View,
    Decide3View,
    DecideView,
    ReturnDialog2View,
    ReturnDialog3View,
    ReturnDialog4View,
    ReturnDialog5View,
    ReturnDialogView,
  };
</script>

{#snippet ShowView({ title, btn, body })}
  <div class="dialog-inner">
    <div class="dialog-head">
      <h2 id="dialog-title"><Content value={title} /></h2>
      <Content value={btn} />
    </div>
    <Content value={body} />
  </div>
{/snippet}

{#snippet Decide2View({ activeContent })}
  <p class="field-hint">
    <Content value={activeContent} />
  </p>
{/snippet}

{#snippet Decide3View({ id, projectCode, title })}
  <option value={id}>
    <Content value={projectCode} /> · <Content value={title} />
  </option>
{/snippet}

{#snippet DecideView({
  projectCode,
  contractNumber,
  money,
  date,
  id,
  canExtendContent,
  canExtendContent2,
  choicesRows,
  date2,
})}
  <div class="wf-identity">
    <strong><Content value={projectCode} /></strong><span><Content value={contractNumber} /></span>
  </div>
  <dl class="review-list">
    <div>
      <dt>Modal</dt>
      <dd><Content value={money} /></dd>
    </div>
    <div>
      <dt>Jatuh tempo</dt>
      <dd><Content value={date} /></dd>
    </div>
  </dl>
  <form id="maturity-choice-form" data-id={id}>
    <fieldset class="maturity-options">
      <legend>Pilih satu</legend>
      <label class="check"
        ><input
          type="radio"
          name="choice"
          value="extend"
          required=""
          {...attributeProps(canExtendContent)}
        />Lanjut ke project baru</label
      ><label class="check"
        ><input type="radio" name="choice" value="return" required="" />Pengembalian modal</label
      >
    </fieldset>
    <Content value={canExtendContent2} />
    <div id="maturity-project" hidden="">
      <label class="form-field"
        ><span>Project baru *</span><select name="offerId">
          <option value="">Pilih project</option>
          <Content value={choicesRows} />
        </select></label
      >
      <p class="field-hint">
        Modal yang sama dialihkan tanpa setoran baru dan tanpa tambahan masa tunggu 10 hari. Efektif
        pada jatuh tempo; jika konfirmasi terlambat, efektif sejak tanggal konfirmasi. Tanggal 31
        dialihkan ke tanggal 1.
      </p>
      <label class="check"
        ><input type="checkbox" name="signatureConsent" />Saya menyetujui penggunaan tanda tangan
        terdaftar pada akad lanjutan.</label
      >
    </div>
    <p id="maturity-return-note" class="info-box" hidden="">
      Pengembalian tetap dijadwalkan pada <Content value={date2} />, meskipun dikonfirmasi lebih
      awal.
    </p>
    <label class="check"
      ><input type="checkbox" name="confirm" required="" />Saya memahami pilihan ini hanya dapat
      dikonfirmasi satu kali dan tidak dapat diganti.</label
    >
    <p class="form-error" id="maturity-error" role="alert" hidden=""></p>
    <div class="form-actions">
      <button class="btn" type="submit">Konfirmasi pilihan</button>
    </div>
  </form>
{/snippet}

{#snippet ReturnDialog2View({ k, v })}
  <div>
    <dt><Content value={k} /></dt>
    <dd><Content value={v} /></dd>
  </div>
{/snippet}

{#snippet ReturnDialog3View({ date })}
  <p class="info-box">Dapat diproses mulai <Content value={date} />.</p>
{/snippet}

{#snippet ReturnDialog4View({ date, reference, proofUrl })}
  <p class="info-box">
    Pengembalian dicatat <Content value={date} />. Referensi: <Content value={reference} />.
  </p>
  <a class="btn secondary" href={proofUrl} target="_blank" rel="noopener"
    >Lihat bukti pengembalian</a
  >
{/snippet}

{#snippet ReturnDialog5View({ id, amount, dueDate, today, todayValue })}
  <form id="maturity-return-form" data-id={id}>
    <label class="form-field"
      ><span>Nominal pengembalian (Rp)</span><input
        type="number"
        name="amount"
        value={amount}
        readonly=""
        required=""
      /></label
    ><label class="form-field"
      ><span>Tanggal transfer *</span><input
        type="date"
        name="transferDate"
        min={dueDate}
        max={today}
        value={todayValue}
        required=""
      /></label
    ><label class="form-field"
      ><span>Referensi transfer *</span><input
        name="reference"
        minlength="3"
        maxlength="160"
        required=""
      /></label
    ><label class="form-field"
      ><span>Bukti pengembalian *</span><input
        type="file"
        name="proof"
        accept=".jpg,.jpeg,.png,.pdf"
        required=""
      /></label
    >
    <p class="field-hint">JPG, PNG, atau PDF · Maks. 10 MB</p>
    <label class="check"
      ><input type="checkbox" name="confirm" required="" />Modal sudah ditransfer ke rekening
      anggota sesuai nominal dan bukti.</label
    >
    <p class="form-error" id="maturity-error" role="alert" hidden=""></p>
    <button class="btn" type="submit">Catat pengembalian selesai</button>
  </form>
{/snippet}

{#snippet ReturnDialogView({ statusContent, Rows, statusContent2 })}
  <Content value={statusContent} />
  <dl class="review-list">
    <Content value={Rows} />
  </dl>
  <Content value={statusContent2} />
{/snippet}
