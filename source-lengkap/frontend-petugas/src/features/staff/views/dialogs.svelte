<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  export {
    DialogView,
    DecisionFormView,
    CandidateDialogView,
    CandidateDialog2View,
    DepositDialog2View,
    DepositDialog3View,
    DepositDialogView,
    RequestDialog2View,
    RequestDialog3View,
    RequestDialogView,
    MemberDialogView,
    DraftDialogView,
    ContractDialogView,
  };
</script>

{#snippet DialogView({ title, icon, body })}
  <div class="dialog-inner">
    <div class="dialog-head">
      <h2 id="dialog-title"><Content value={title} /></h2>
      <button type="button" class="icon-btn" data-action="close" aria-label="Tutup">
        <Content value={icon} />
      </button>
    </div>
    <Content value={body} />
  </div>
{/snippet}

{#snippet DecisionFormView({ kind, id, checks, label })}
  <form class="decision-form" id="decision-form" data-kind={kind} data-id={id}>
    <Content value={checks} /><label class="form-field"
      ><span>Catatan petugas</span><textarea
        name="note"
        placeholder="Wajib diisi jika meminta perbaikan"></textarea>
    </label>
    <p class="form-error" id="decision-error" role="alert" hidden=""></p>
    <div class="decision-actions">
      <button type="submit" class="btn secondary" name="decision" value="return" formnovalidate="">
        Minta perbaikan</button
      ><button type="submit" class="btn" name="decision" value="approve"
        ><Content value={label} /></button
      >
    </div>
    <p class="dialog-note">Perubahan ini hanya berlaku pada data contoh di portal petugas.</p>
  </form>
{/snippet}

{#snippet CandidateDialogView({ note })}
  <div class="info-box">Catatan: <Content value={note} /></div>
{/snippet}

{#snippet CandidateDialog2View({ memberId })}
  <div class="info-box">
    Keanggotaan contoh aktif dengan nomor <strong><Content value={memberId} /></strong>.
  </div>
{/snippet}

{#snippet DepositDialog2View({ note })}
  <div class="info-box">Catatan: <Content value={note} /></div>
{/snippet}

{#snippet DepositDialog3View()}
  <div class="info-box">Setoran contoh sudah diverifikasi. Pemeriksaan tidak dapat diulang.</div>
{/snippet}

{#snippet DepositDialogView({
  statusHead,
  review,
  fieldName,
  rupiah,
  amountContent,
  noteContent,
  statusContent,
})}
  <Content value={statusHead} /><Content value={review} />
  <div class="staff-proof">
    <div class="eyebrow">Bukti pembayaran · Contoh</div>
    <h3><Content value={fieldName} /></h3>
    <div class="proof-amount"><Content value={rupiah} /></div>
    <div class="proof-status">
      <span>Nominal pada pencatatan dana</span><strong><Content value={amountContent} /></strong>
    </div>
  </div>
  <Content value={noteContent} /><Content value={statusContent} />
{/snippet}

{#snippet RequestDialog2View({ note })}
  <div class="info-box">Catatan: <Content value={note} /></div>
{/snippet}

{#snippet RequestDialog3View({ typeContent, icon })}
  <div class="info-box">
    Pengajuan sudah disetujui untuk proses penyiapan akad.<Content value={typeContent} />
  </div>
  <div class="form-actions">
    <a href="#akad" class="btn full">Lihat penyiapan akad <Content value={icon} /></a>
  </div>
{/snippet}

{#snippet RequestDialogView({ statusHead, review, noteContent, statusContent, typeContent })}
  <Content value={statusHead} /><Content value={review} /><Content value={noteContent} /><Content
    value={statusContent}
  />
  <p class="staff-dialog-note">
    <Content value={typeContent} />
  </p>
{/snippet}

{#snippet MemberDialogView({
  statusHead,
  fieldName,
  review,
  rupiah,
  rupiahValue,
  rupiahValueValue,
})}
  <Content value={statusHead} />
  <h3><Content value={fieldName} /></h3>
  <Content value={review} />
  <div class="member-ledger">
    <div>
      <span>Simpanan pokok &amp; wajib</span><strong><Content value={rupiah} /></strong>
    </div>
    <div><span>Penyertaan modal aktif</span><strong><Content value={rupiahValue} /></strong></div>
    <div>
      <span>Sisa tagihan pembiayaan</span><strong><Content value={rupiahValueValue} /></strong>
    </div>
    <div><span>Status akses portal</span><strong>Aktif</strong></div>
  </div>
  <p class="staff-dialog-note">
    Ini gambaran data yang dikelola petugas untuk masing-masing anggota. Penyertaan modal dan
    pengunduran diri dapat dicoba melalui alur pengajuan yang tersambung. Saldo pada ringkasan ini
    tetap data contoh.
  </p>
{/snippet}

{#snippet DraftDialogView({ review, id, checks })}
  <Content value={review} />
  <form id="draft-form" data-id={id}>
    <Content value={checks} />
    <p class="form-error" id="decision-error" role="alert" hidden=""></p>
    <div class="decision-actions">
      <button type="button" class="btn secondary" data-action="close">Batal</button><button
        type="submit"
        class="btn">Buat draf contoh</button
      >
    </div>
  </form>
  <p class="dialog-note">Draf ini hanya ringkasan contoh, bukan naskah akad resmi.</p>
{/snippet}

{#snippet ContractDialogView({ logo, typeContent, review })}
  <article class="document-preview">
    <Content value={logo} />
    <div class="watermark">Dokumen contoh · Tidak berlaku sebagai akad</div>
    <h3><Content value={typeContent} /></h3>
    <Content value={review} />
    <p>Naskah dan ketentuan akad resmi akan disusun serta diperiksa oleh tim koperasi.</p>
  </article>
  <div class="form-actions">
    <button type="button" class="btn secondary full" data-action="close"> Tutup pratinjau </button>
  </div>
{/snippet}
