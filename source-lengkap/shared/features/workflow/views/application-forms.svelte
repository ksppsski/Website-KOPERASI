<script module>
  import Content from '../../../components/Content.svelte';
  export {
    CapitalFormView,
    CapitalForm2View,
    CapitalForm4View,
    CapitalForm5View,
    CapitalForm3View,
    WithdrawalFormView,
    WithdrawalForm3View,
    WithdrawalForm2View,
  };
</script>

{#snippet CapitalFormView()}
  <p class="dialog-note">
    Pendaftaran perlu disetujui pada portal petugas sebelum mengajukan penyertaan modal.
  </p>
{/snippet}

{#snippet CapitalForm2View()}
  <p>Kuota penawaran ini sudah terpenuhi. Pilih penawaran lain yang masih dibuka.</p>
{/snippet}

{#snippet CapitalForm4View({ title, projectCode, money })}
  <div class="offer-form-heading">
    <strong><Content value={title} /></strong><span class="offer-code"
      ><Content value={projectCode} /></span
    ><small>Batas nominal pengajuan: <Content value={money} /></small>
  </div>
{/snippet}

{#snippet CapitalForm5View({ note })}
  <div class="wf-note"><Content value={note} /></div>
{/snippet}

{#snippet CapitalForm3View({
  memberName,
  memberId,
  offerContent,
  noteContent,
  statusContent,
  itemContent,
  version,
  id,
  available,
  amount,
})}
  <div class="wf-identity">
    <strong><Content value={memberName} /></strong><span><Content value={memberId} /></span>
  </div>
  <p class="muted small">Untuk pengadaan kebutuhan barang Mitra.</p>
  <Content value={offerContent} /><Content value={noteContent} /><Content value={statusContent} />
  <form id="wf-capital-form" data-revise={itemContent} data-version={version} data-offer-id={id}>
    <label class="form-field"
      ><span>Nominal setoran (Rp) *</span><input
        name="amount"
        type="number"
        min="1"
        max={available}
        step="1"
        inputmode="numeric"
        value={amount}
        placeholder="Contoh: 25000000"
        required=""
      /></label
    >
    <div class="file-picker">
      <label class="field-label" for="wf-proof">Bukti transfer *</label><input
        id="wf-proof"
        type="file"
        name="proof"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        required=""
      />
      <p class="field-hint">JPG, PNG, atau PDF · Maks. 10 MB</p>
    </div>
    <p class="wf-upload-name" id="wf-file-name" aria-live="polite"></p>
    <label class="check"
      ><input type="checkbox" name="signatureConsent" required="" />Saya menyetujui penggunaan tanda
      tangan terdaftar pada akad pengajuan ini.</label
    >
    <p class="form-error" id="wf-error" role="alert" hidden=""></p>
    <p class="dialog-note">Pengajuan dan bukti transfer dikirim kepada petugas koperasi.</p>
    <div class="form-actions">
      <button type="button" class="btn secondary" data-wf-action="close">Batal</button><button
        class="btn"
        type="submit">Kirim ke petugas</button
      >
    </div>
  </form>
{/snippet}

{#snippet WithdrawalFormView()}
  <p>Masih ada kontrak atau pengajuan yang berjalan.</p>
{/snippet}

{#snippet WithdrawalForm3View({ note })}
  <div class="wf-note"><Content value={note} /></div>
{/snippet}

{#snippet WithdrawalForm2View({ memberName, memberId, noteContent, itemContent, version, reason })}
  <div class="wf-identity">
    <strong><Content value={memberName} /></strong><span><Content value={memberId} /></span>
  </div>
  <Content value={noteContent} />
  <p class="field-hint">
    Admin memeriksa permohonan, Finance mengembalikan simpanan pokok Rp100.000, lalu Manajer
    memberikan persetujuan final penutupan keanggotaan.
  </p>
  <form id="wf-withdrawal-form" data-revise={itemContent} data-version={version}>
    <label class="form-field"
      ><span>Alasan pengunduran diri *</span><textarea
        name="reason"
        rows="4"
        minlength="10"
        maxlength="1500"
        required=""
        placeholder="Sampaikan alasan pengunduran diri Anda."
        >&lt;!--<Content value={reason} />--&gt;</textarea
      ></label
    ><label class="check"
      ><input type="checkbox" name="consent" required="" />Saya mengajukan permohonan pengunduran
      diri untuk ditinjau Admin.</label
    >
    <p class="form-error" id="wf-error" role="alert" hidden=""></p>
    <div class="form-actions">
      <button class="btn secondary" type="button" data-wf-action="close">Batal</button><button
        class="btn"
        type="submit">Kirim permohonan</button
      >
    </div>
  </form>
{/snippet}
