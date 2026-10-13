/**
 * Simpanan anggota, koreksi, status aktif, dan formulir setoran.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../lib/status-colors.js';
export function createWorkflowSavings({
  state,
  needsCorrection,
  esc,
  action,
  shortId,
  money,
  date,
  ensureReady,
  api,
  show,
  profilePanel,
  runtime,
  profileStatus,
  status,
  empty,
}) {
  function savingsEntries() {
    const p = state.profile,
      d = p?.data || {},
      v = p?.savings;
    if (!v) return [];
    const special =
      d.special === 'Ya'
        ? Math.ceil(
            d.specialAmount / (d.specialPayment === 'Angsur' ? Math.max(1, d.installments) : 1),
          )
        : 0;
    return [
      ['Simpanan pokok', v.basic],
      ['Simpanan wajib', v.paid],
      ['Simpanan transaksi', v.other ? d.transactionSaving : 0],
      ['Simpanan khusus', v.other ? special : 0],
    ].filter(([, n]) => n > 0);
  }

  function corrections() {
    const p = state.profile,
      items = state.items.filter(needsCorrection);
    if (!needsCorrection(p) && !items.length) return '';
    return /* HTML */ `<section
      class="panel savings-alert status-alert-red"
      aria-label="Perbaikan yang diperlukan"
    >
      <div class="panel-head"><h2>Perlu perbaikan</h2></div>
      ${
        needsCorrection(p)
          ? /* HTML */ `<div class="wf-card">
              <strong>Pendaftaran anggota</strong
              >${p.note ? /* HTML */ `<p>Admin: ${esc(p.note)}</p>` : ''}${
                p.finance?.status === 'correction'
                  ? /* HTML */ `<p>Finance: ${esc(p.finance.note)}</p>`
                  : ''
              }${action('edit-registration', '', 'Perbaiki pendaftaran', true)}
            </div>`
          : ''
      }${items
        .map(
          (item) =>
            /* HTML */ `<div class="wf-card">
              <strong
                >${
                  item.kind === 'capital'
                    ? 'Penyertaan modal'
                    : item.kind === 'savings'
                      ? 'Setoran simpanan wajib'
                      : 'Pengunduran diri'
                }
                · ${shortId(item)}</strong
              >${item.note ? /* HTML */ `<p>Admin: ${esc(item.note)}</p>` : ''}${
                item.finance?.status === 'correction'
                  ? /* HTML */ `<p>Finance: ${esc(item.finance.note)}</p>`
                  : ''
              }${action('revise', item.id, 'Perbaiki pengajuan', true)}
            </div>`,
        )
        .join('')}
    </section>`;
  }

  function savingsNotice() {
    const v = state.profile?.savings;
    if (!v || !state.profile) return '';
    if (state.profile.status !== 'approved') return '';
    return /* HTML */ `<div
      class="info-box savings-alert ${!v.active || v.low || v.arrears > 0 ? 'status-alert-red' : 'status-alert-blue'}"
      role="status"
    >
      <strong
        >Simpanan
        ${v.active ? 'aktif' : 'tidak aktif'}${v.low ? ' · Segera setor simpanan wajib' : ''}</strong
      >
      <p>
        Sisa saldo di muka
        ${money(v.remaining)}.${v.arrears ? ' Kewajiban belum terpenuhi ' + money(v.arrears) + '.' : ' Alokasi berikutnya ' + date(v.nextDue + 'T12:00:00Z') + '.'}
      </p>
      ${v.low ? /* HTML */ `<div class="wf-actions">${action('savings', '', 'Setor simpanan wajib', true)}</div>` : ''}
    </div>`;
  }

  function accessPanel() {
    return /* HTML */ `<section class="panel">
      <h2>Simpanan belum aktif</h2>
      <p>
        Lengkapi pendaftaran dan setoran simpanan wajib sebelum mengajukan penyertaan modal atau
        pembiayaan.
      </p>
      <a class="btn" href="#simpanan">Buka Simpanan Saya</a>${
        !state.profile
          ? '<a class="btn secondary" href="#daftar">Daftar anggota</a>'
          : state.profile.status !== 'approved'
            ? '<a class="btn secondary" href="#profil">Status pendaftaran</a>'
            : ''
      }
    </section>`;
  }

  async function checkAccess() {
    if (!(await ensureReady())) return false;
    try {
      await api('/eligibility');
      return true;
    } catch (error) {
      show('Simpanan belum aktif', accessPanel());
      return false;
    }
  }

  async function savingsForm(item = null) {
    if (!(await ensureReady())) return;
    if (!item && state.profile?.status !== 'approved') {
      show('Lengkapi pendaftaran', profilePanel());
      return;
    }
    runtime.formId = item?.id || crypto.randomUUID();
    show(
      item ? 'Perbaiki setoran simpanan wajib' : 'Setor simpanan wajib',
      /* HTML */ `<p>Simpanan pokok Rp100.000 dibayar sekali saat mendaftar.</p>
        ${item?.finance?.note ? /* HTML */ `<div class="wf-note">${esc(item.finance.note)}</div>` : ''}
        <form
          id="wf-savings-form"
          data-revise="${item ? 'yes' : ''}"
          data-version="${item?.version || 0}"
        >
          <label class="form-field"
            ><span>Pilihan setoran *</span
            ><select name="amount" required>
              <option value="10000" ${item?.amount === 10000 ? 'selected' : ''}>
                Bulanan · Rp10.000
              </option>
              <option value="120000" ${item?.amount === 120000 ? 'selected' : ''}>
                Tahunan · Rp120.000
              </option>
            </select></label
          ><label class="form-field"
            ><span>Bukti transfer *</span
            ><input
              type="file"
              name="proof"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              required
          /></label>
          <p class="field-hint">
            JPG, PNG, atau PDF · Maks. 10 MB. Saldo bertambah setelah rekonsiliasi Finance.
          </p>
          <p class="form-error" id="wf-error" role="alert" hidden></p>
          <div class="form-actions">
            <button class="btn secondary" type="button" data-wf-action="close">Batal</button
            ><button class="btn" type="submit">Kirim setoran</button>
          </div>
        </form>`,
    );
  }

  function memberSummary() {
    const p = state.profile,
      total = savingsEntries().reduce((sum, [, n]) => sum + n, 0),
      signed = state.items.filter((x) => x.kind === 'capital' && x.status === 'signed');
    return /* HTML */ `${
        p
          ? /* HTML */ `<div class="wf-card-head">
                <strong>${esc(p.data.name)}</strong
                ><span class="badge ${statusColor(profileStatus(p))}">${profileStatus(p)}</span>
              </div>
              <p class="field-hint">
                ${esc(p.memberNumber || '—')} · Terdaftar ${date(p.createdAt)}
              </p>`
          : /* HTML */ `<div class="wf-empty">
              <strong>Belum terdaftar sebagai anggota</strong>
              <p>Mulai dengan melengkapi data, bukti setoran, dan tanda tangan.</p>
              <a class="btn" href="#daftar">Daftar anggota</a>
            </div>`
      }
      <div class="wf-overview">
        <a href="#simpanan"><strong>${money(total)}</strong><span>Simpanan tercatat</span></a
        ><a href="#modal"
          ><strong>${money(signed.reduce((sum, x) => sum + x.amount, 0))}</strong
          ><span>Penyertaan berakad lengkap</span></a
        ><a href="#dokumen"><strong>${signed.length}</strong><span>Dokumen akad lengkap</span></a>
      </div>
      <h3>Aktivitas pengajuan</h3>
      ${
        state.items.length
          ? /* HTML */ `<div class="wf-cards">
              ${state.items
                .slice(0, 5)
                .map(
                  (item) =>
                    /* HTML */ `<div class="wf-card">
                      <div class="wf-card-head">
                        <strong
                          >${item.kind === 'capital' ? 'Penyertaan modal' : 'Pengunduran diri'}</strong
                        >${status(item)}
                      </div>
                      <p class="small muted">
                        ${date(item.createdAt)}${item.kind === 'capital' ? ' · ' + money(item.amount) : ''}
                      </p>
                    </div>`,
                )
                .join('')}
            </div>`
          : empty('Belum ada aktivitas pengajuan.')
      }`;
  }

  function memberSavings() {
    const entries = savingsEntries();
    return entries.length
      ? /* HTML */ `<div class="balance-breakdown">
            ${entries
              .map(
                ([label, n]) =>
                  /* HTML */ `<div class="stat">
                    <div class="stat-top">${label}</div>
                    <div class="stat-value">${money(n)}</div>
                    <div class="stat-bottom">Setoran awal terverifikasi</div>
                  </div>`,
              )
              .join('')}
          </div>
          <p class="field-hint">Tercatat dari pendaftaran yang disetujui petugas.</p>`
      : empty('Belum ada simpanan terverifikasi.');
  }
  return {
    savingsEntries,
    corrections,
    savingsNotice,
    accessPanel,
    checkAccess,
    savingsForm,
    memberSummary,
    memberSavings,
  };
}
