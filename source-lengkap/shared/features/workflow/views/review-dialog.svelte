<script module>
  import Content from '../../../components/Content.svelte';
  import { attributeProps } from '../../../runtime/view.js';
  export {
    Details2View,
    DetailsView,
    Form2View,
    Form3View,
    FormView,
    ReadyView,
    Ready2View,
    SignatureView,
    ReviewDialog2View,
    ReviewDialog3View,
    ReviewDialog4View,
    ReviewDialogView,
  };
</script>

{#snippet Details2View({ a, b })}
  <div>
    <dt><Content value={a} /></dt>
    <dd><Content value={b} /></dd>
  </div>
{/snippet}

{#snippet DetailsView({ status, rowsRows })}
  <div class="status-head"><Content value={status} /></div>
  <dl class="review-list">
    <Content value={rowsRows} />
  </dl>
{/snippet}

{#snippet Form2View()}
  <button type="submit" class="btn secondary" name="action" value="return" formnovalidate=""
    >Minta perbaikan</button
  >
{/snippet}

{#snippet Form3View()}
  <button type="submit" class="btn secondary" name="action" value="reject" formnovalidate=""
    >Tolak</button
  >
{/snippet}

{#snippet FormView({
  id,
  version,
  capitalContent,
  capitalContent2,
  note,
  capitalContent3,
  capitalContent4,
  capitalContent5,
  capitalContent6,
})}
  <form id="wf-review-form" data-id={id} data-version={version}>
    <Content value={capitalContent} /><label class="form-field"
      ><span>Catatan petugas</span><textarea
        name="note"
        rows="3"
        maxlength="1500"
        placeholder={capitalContent2}>&lt;!--<Content value={note} />--&gt;</textarea
      >
    </label>
    <p id="wf-error" class="form-error" role="alert" hidden=""></p>
    <div class="wf-actions">
      <Content value={capitalContent3} /><Content value={capitalContent4} /><button
        type="submit"
        class="btn"
        name="action"
        value="approve"
        {...attributeProps(capitalContent5)}
      >
        <Content value={capitalContent6} />
      </button>
    </div>
  </form>
{/snippet}

{#snippet ReadyView()}
  <p class="wf-note">Pembuatan PDF menunggu rekonsiliasi Finance.</p>
{/snippet}

{#snippet Ready2View()}
  <p class="wf-note">
    Pengajuan lama belum memiliki data pendaftaran dan tanda tangan. Buat pengajuan baru setelah
    pendaftaran disetujui.
  </p>
{/snippet}

{#snippet SignatureView({ profileDetails, signatureUrl })}
  <details class="wf-detail">
    <summary>Data anggota dan tanda tangan</summary>
    <Content value={profileDetails} />
    <div class="wf-signature">
      <img src={signatureUrl} alt="Tanda tangan anggota untuk akad ini" width="250" height="85" />
    </div>
  </details>
{/snippet}

{#snippet ReviewDialog2View({ note })}
  <div class="wf-note"><Content value={note} /></div>
{/snippet}

{#snippet ReviewDialog3View({ date })}
  <p class="field-hint">Keputusan tersimpan · <Content value={date} /></p>
{/snippet}

{#snippet ReviewDialog4View({ date })}
  <p class="wf-note">
    Akad lengkap diunggah <Content value={date} /> dan tersedia di Dokumen Akad anggota.
  </p>
{/snippet}

{#snippet ReviewDialogView({
  workPanel,
  details,
  capitalContent,
  signature,
  links,
  noteContent,
  kindContent,
  ready,
  statusContent,
  statusContent2,
})}
  <Content value={workPanel} /><Content value={details} /><Content value={capitalContent} /><Content
    value={signature}
  />
  <div class="wf-actions"><Content value={links} /></div>
  <Content value={noteContent} /><Content value={kindContent} /><Content value={ready} /><Content
    value={statusContent}
  /><Content value={statusContent2} />
{/snippet}
