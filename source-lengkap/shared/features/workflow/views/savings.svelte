<script module>
  import Content from '../../../components/Content.svelte';
  import { attributeProps } from '../../../runtime/view.js';
  export {
    Corrections3View,
    Corrections4View,
    Corrections2View,
    Corrections6View,
    Corrections7View,
    Corrections5View,
    CorrectionsView,
    SavingsNotice2View,
    SavingsNoticeView,
    AccessPanel2View,
    AccessPanel3View,
    AccessPanelView,
    SavingsForm2View,
    SavingsFormView,
    MemberSummary2View,
    MemberSummary3View,
    MemberSummary5View,
    MemberSummary4View,
    MemberSummaryView,
    MemberSavings2View,
    MemberSavingsView,
  };
</script>

{#snippet Corrections3View({ note })}
  <p>Admin: <Content value={note} /></p>
{/snippet}

{#snippet Corrections4View({ note })}
  <p>Finance: <Content value={note} /></p>
{/snippet}

{#snippet Corrections2View({ noteContent, statusContent, action })}
  <div class="wf-card">
    <strong>Pendaftaran anggota</strong><Content value={noteContent} /><Content
      value={statusContent}
    /><Content value={action} />
  </div>
{/snippet}

{#snippet Corrections6View({ note })}
  <p>Admin: <Content value={note} /></p>
{/snippet}

{#snippet Corrections7View({ note })}
  <p>Finance: <Content value={note} /></p>
{/snippet}

{#snippet Corrections5View({ kindContent, shortId, noteContent, statusContent, action })}
  <div class="wf-card">
    <strong
      ><Content value={kindContent} />
      · <Content value={shortId} /></strong
    ><Content value={noteContent} /><Content value={statusContent} /><Content value={action} />
  </div>
{/snippet}

{#snippet CorrectionsView({ needsCorrectionContent, itemsRows })}
  <section class="panel savings-alert status-alert-red" aria-label="Perbaikan yang diperlukan">
    <div class="panel-head"><h2>Perlu perbaikan</h2></div>
    <Content value={needsCorrectionContent} /><Content value={itemsRows} />
  </section>
{/snippet}

{#snippet SavingsNotice2View({ action })}
  <div class="wf-actions"><Content value={action} /></div>
{/snippet}

{#snippet SavingsNoticeView({
  activeContent,
  activeContent2,
  lowContent,
  money,
  arrearsContent,
  lowContent2,
})}
  <div class={'info-box savings-alert ' + activeContent} role="status">
    <strong
      >Simpanan
      <Content value={activeContent2} /><Content value={lowContent} /></strong
    >
    <p>
      Sisa saldo di muka
      <Content value={money} />.<Content value={arrearsContent} />
    </p>
    <Content value={lowContent2} />
  </div>
{/snippet}

{#snippet AccessPanel2View()}
  <a class="btn secondary" href="#daftar">Daftar anggota</a>
{/snippet}

{#snippet AccessPanel3View()}
  <a class="btn secondary" href="#profil">Status pendaftaran</a>
{/snippet}

{#snippet AccessPanelView({ profileContent })}
  <section class="panel">
    <h2>Simpanan belum aktif</h2>
    <p>
      Lengkapi pendaftaran dan setoran simpanan wajib sebelum mengajukan penyertaan modal atau
      pembiayaan.
    </p>
    <a class="btn" href="#simpanan">Buka Simpanan Saya</a><Content value={profileContent} />
  </section>
{/snippet}

{#snippet SavingsForm2View({ note })}
  <div class="wf-note"><Content value={note} /></div>
{/snippet}

{#snippet SavingsFormView({ noteContent, itemContent, version, amountContent, amountContent2 })}
  <p>Simpanan pokok Rp100.000 dibayar sekali saat mendaftar.</p>
  <Content value={noteContent} />
  <form id="wf-savings-form" data-revise={itemContent} data-version={version}>
    <label class="form-field"
      ><span>Pilihan setoran *</span><select name="amount" required="">
        <option value="10000" {...attributeProps(amountContent)}> Bulanan · Rp10.000 </option>
        <option value="120000" {...attributeProps(amountContent2)}> Tahunan · Rp120.000 </option>
      </select></label
    ><label class="form-field"
      ><span>Bukti transfer *</span><input
        type="file"
        name="proof"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        required=""
      /></label
    >
    <p class="field-hint">
      JPG, PNG, atau PDF · Maks. 10 MB. Saldo bertambah setelah rekonsiliasi Finance.
    </p>
    <p class="form-error" id="wf-error" role="alert" hidden=""></p>
    <div class="form-actions">
      <button class="btn secondary" type="button" data-wf-action="close">Batal</button><button
        class="btn"
        type="submit">Kirim setoran</button
      >
    </div>
  </form>
{/snippet}

{#snippet MemberSummary2View({ fieldName, statusColor, profileStatus, memberNumber, date })}
  <div class="wf-card-head">
    <strong><Content value={fieldName} /></strong><span class={'badge ' + statusColor}
      ><Content value={profileStatus} /></span
    >
  </div>
  <p class="field-hint">
    <Content value={memberNumber} /> · Terdaftar <Content value={date} />
  </p>
{/snippet}

{#snippet MemberSummary3View()}
  <div class="wf-empty">
    <strong>Belum terdaftar sebagai anggota</strong>
    <p>Mulai dengan melengkapi data, bukti setoran, dan tanda tangan.</p>
    <a class="btn" href="#daftar">Daftar anggota</a>
  </div>
{/snippet}

{#snippet MemberSummary5View({ kindContent, status, date, kindContent2 })}
  <div class="wf-card">
    <div class="wf-card-head">
      <strong><Content value={kindContent} /></strong><Content value={status} />
    </div>
    <p class="small muted">
      <Content value={date} /><Content value={kindContent2} />
    </p>
  </div>
{/snippet}

{#snippet MemberSummary4View({ sliceRows })}
  <div class="wf-cards">
    <Content value={sliceRows} />
  </div>
{/snippet}

{#snippet MemberSummaryView({ pContent, money, money2, length, lengthContent })}
  <Content value={pContent} />
  <div class="wf-overview">
    <a href="#simpanan"><strong><Content value={money} /></strong><span>Simpanan tercatat</span></a
    ><a href="#modal"
      ><strong><Content value={money2} /></strong><span>Penyertaan berakad lengkap</span></a
    ><a href="#dokumen"
      ><strong><Content value={length} /></strong><span>Dokumen akad lengkap</span></a
    >
  </div>
  <h3>Aktivitas pengajuan</h3>
  <Content value={lengthContent} />
{/snippet}

{#snippet MemberSavings2View({ label, money })}
  <div class="stat">
    <div class="stat-top"><Content value={label} /></div>
    <div class="stat-value"><Content value={money} /></div>
    <div class="stat-bottom">Setoran awal terverifikasi</div>
  </div>
{/snippet}

{#snippet MemberSavingsView({ entriesRows })}
  <div class="balance-breakdown">
    <Content value={entriesRows} />
  </div>
  <p class="field-hint">Tercatat dari pendaftaran yang disetujui petugas.</p>
{/snippet}
