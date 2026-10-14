<script module>
  import Content from '../../../components/Content.svelte';
  import { attributeProps } from '../../../runtime/view.js';
  export {
    ProfileDetails2View,
    ProfileDetailsView,
    IdentityMedia2View,
    IdentityMedia3View,
    IdentityMedia4View,
    IdentityMedia5View,
    IdentityMediaView,
    CompleteKtpDialogView,
    ProfilePanelView,
    AdminNoteView,
    LetterLinkView,
    ReviewRegistrationView,
    ProfilePanel2View,
    StaffRegistrationPanelView,
    FinanceStatus2View,
    FinanceStatus3View,
    FinanceStatusView,
    RegistrationReview2View,
    RegistrationReview3View,
    RegistrationReview4View,
    RegistrationReviewView,
  };
</script>

{#snippet ProfileDetails2View({ a, b })}
  <div>
    <dt><Content value={a} /></dt>
    <dd><Content value={b} /></dd>
  </div>
{/snippet}

{#snippet ProfileDetailsView({ Rows })}
  <dl class="review-list">
    <Content value={Rows} />
  </dl>
{/snippet}

{#snippet IdentityMedia2View({ sig })}
  <div class="wf-media-image">
    <img src={sig} alt="Tanda tangan anggota" width="250" height="85" />
  </div>
{/snippet}

{#snippet IdentityMedia3View()}
  <p class="field-hint">Belum tersedia.</p>
{/snippet}

{#snippet IdentityMedia4View({ ktp, ktpValue, ktpCheckedAtContent })}
  <a
    class="wf-media-image"
    href={ktp}
    target="_blank"
    rel="noopener"
    aria-label="Lihat foto KTP ukuran penuh"
    ><img src={ktpValue} alt="Foto KTP anggota" width="400" height="252" /></a
  >
  <p class="field-hint">
    <Content value={ktpCheckedAtContent} />
  </p>
{/snippet}

{#snippet IdentityMedia5View()}
  <p class="field-hint">Foto KTP belum diunggah.</p>
{/snippet}

{#snippet IdentityMediaView({ sigContent, ktpContent })}
  <div class="wf-identity-media">
    <div class="wf-signature">
      <span>Tanda tangan anggota</span><Content value={sigContent} />
    </div>
    <div class="wf-ktp">
      <span>Foto KTP</span><Content value={ktpContent} />
    </div>
  </div>
{/snippet}

{#snippet CompleteKtpDialogView({ version })}
  <p class="subtext">Setelah diunggah, pendaftaran masuk kembali ke pemeriksaan Admin.</p>
  <form id="wf-ktp-form" data-version={version}>
    <label class="form-field"
      ><span>Foto KTP *</span><input
        type="file"
        name="ktp"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        required=""
      /></label
    >
    <p class="field-hint">JPG atau PNG · Maks. 10 MB · Seluruh KTP terlihat jelas.</p>
    <p class="form-error" id="wf-error" role="alert" hidden=""></p>
    <div class="form-actions"><button type="submit" class="btn">Unggah KTP</button></div>
  </form>
{/snippet}

{#snippet ProfilePanelView()}
  <div class="wf-empty">
    <strong>Data akad belum tersedia</strong>
    <p>Lengkapi pendaftaran beserta rekening dan tanda tangan.</p>
    <a class="btn" href="anggota.html#daftar">Daftar anggota</a>
  </div>
{/snippet}

{#snippet AdminNoteView({ note })}
  <p class="wf-note"><Content value={note} /></p>
{/snippet}

{#snippet LetterLinkView({ url })}
  <div class="wf-actions">
    <a class="btn secondary" href={url + '?download=1'}> Unduh surat keanggotaan </a>
  </div>
{/snippet}

{#snippet ReviewRegistrationView({ action })}
  <div class="wf-actions">
    <Content value={action} />
  </div>
{/snippet}

{#snippet ProfilePanel2View({
  fieldName,
  statusColor,
  profileStatus,
  adminNote,
  financeNote,
  profileDetails,
  identityMedia,
  letterLink,
  completeIdentity,
  correctRegistration,
  reviewRegistration,
})}
  <div class="wf-profile">
    <div class="wf-card-head">
      <strong><Content value={fieldName} /></strong><span class={'badge ' + statusColor}
        ><Content value={profileStatus} /></span
      >
    </div>
    <Content value={adminNote} /><Content value={financeNote} /><Content
      value={profileDetails}
    /><Content value={identityMedia} />
    <Content value={letterLink} /><Content value={completeIdentity} /><Content
      value={correctRegistration}
    /><Content value={reviewRegistration} />
  </div>
{/snippet}

{#snippet StaffRegistrationPanelView({ fieldName, memberNumber, date, profileStatus, action })}
  <div class="wf-card-head">
    <div>
      <strong><Content value={fieldName} /></strong>
      <p class="field-hint">
        <Content value={memberNumber} /> · Dikirim <Content value={date} /> ·
        <Content value={profileStatus} />
      </p>
    </div>
    <Content value={action} />
  </div>
{/snippet}

{#snippet FinanceStatus2View({ reference, date })}
  <p>Referensi <Content value={reference} /> · <Content value={date} /></p>
{/snippet}

{#snippet FinanceStatus3View({ note })}
  <p><Content value={note} /></p>
{/snippet}

{#snippet FinanceStatusView({ label, referenceContent, noteContent })}
  <div class="wf-note">
    <strong>Rekonsiliasi Finance: <Content value={label} /></strong><Content
      value={referenceContent}
    /><Content value={noteContent} />
  </div>
{/snippet}

{#snippet RegistrationReview2View({ note })}
  <p class="wf-note"><Content value={note} /></p>
{/snippet}

{#snippet RegistrationReview3View({ id, version, checks, statusContent, ktpUrlContent })}
  <form id="wf-registration-review" data-id={id} data-version={version}>
    <Content value={checks} /><label class="form-field"
      ><span>Catatan perbaikan</span><textarea name="note" maxlength="1500"></textarea>
    </label>
    <p id="wf-error" class="form-error" hidden="" role="alert"></p>
    <div class="wf-actions">
      <button class="btn secondary" type="submit" name="action" value="return" formnovalidate="">
        Minta perbaikan</button
      ><button
        class="btn"
        type="submit"
        name="action"
        value="approve"
        {...attributeProps(statusContent)}
      >
        <Content value={ktpUrlContent} />
      </button>
    </div>
  </form>
{/snippet}

{#snippet RegistrationReview4View({ profileStatus })}
  <p class="wf-note"><Content value={profileStatus} /></p>
{/snippet}

{#snippet RegistrationReviewView({
  workPanel,
  profileDetails,
  identityMedia,
  proofUrl,
  noteContent,
  financeStatus,
  statusContent,
})}
  <Content value={workPanel} /><Content value={profileDetails} /><Content value={identityMedia} /><a
    class="btn secondary small-btn"
    href={proofUrl}
    target="_blank"
    rel="noopener">Lihat bukti simpanan</a
  ><Content value={noteContent} /><Content value={financeStatus} /><Content value={statusContent} />
{/snippet}
