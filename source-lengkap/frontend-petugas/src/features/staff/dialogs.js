/**
 * Dialog pemeriksaan petugas dan detail dokumen.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createStaffDialogs({
  runtime,
  $,
  icon,
  modal,
  checks,
  statusHead,
  review,
  rupiah,
  esc,
  name,
  member,
  canDraft,
  toast,
  logo,
}) {
  function dialog(title, body) {
    runtime.lastFocus = document.activeElement;
    $('#dialog-content').innerHTML = /* HTML */ `<div class="dialog-inner">
      <div class="dialog-head">
        <h2 id="dialog-title">${title}</h2>
        <button type="button" class="icon-btn" data-action="close" aria-label="Tutup">
          ${icon('close')}
        </button>
      </div>
      ${body}
    </div>`;
    modal.showModal();
  }

  function closeDialog() {
    modal.close();
    if (runtime.lastFocus?.isConnected) runtime.lastFocus.focus();
  }

  function decisionForm(kind, id, items, label) {
    return /* HTML */ `<form
      class="decision-form"
      id="decision-form"
      data-kind="${kind}"
      data-id="${id}"
    >
      ${checks(items)}<label class="form-field"
        ><span>Catatan petugas</span
        ><textarea name="note" placeholder="Wajib diisi jika meminta perbaikan"></textarea>
      </label>
      <p class="form-error" id="decision-error" role="alert" hidden></p>
      <div class="decision-actions">
        <button type="submit" class="btn secondary" name="decision" value="return" formnovalidate>
          Minta perbaikan</button
        ><button type="submit" class="btn" name="decision" value="approve">${label}</button>
      </div>
      <p class="dialog-note">Perubahan ini hanya berlaku pada data contoh di portal petugas.</p>
    </form>`;
  }

  function candidateDialog(id) {
    const x = runtime.state.candidates.find((x) => x.id === id);
    if (!x) return;
    dialog(
      'Pemeriksaan calon anggota',
      `${statusHead(x)}${review([
        ['Nama lengkap', x.name],
        ['Nomor identitas', x.identity],
        ['WhatsApp', x.phone],
        ['Email', x.email],
        ['Alamat domisili', x.address],
        ['Pekerjaan', x.job],
        ['Ahli waris', x.heir],
        ['Setoran awal (contoh)', rupiah(x.amount)],
      ])}${x.note ? /* HTML */ `<div class="info-box">Catatan: ${esc(x.note)}</div>` : ''}${
        x.status === 'Disetujui'
          ? /* HTML */ `<div class="info-box">
              Keanggotaan contoh aktif dengan nomor <strong>${x.memberId}</strong>.
            </div>`
          : decisionForm(
              'candidate',
              id,
              [
                ['identity', 'Data identitas dan persyaratan sesuai.'],
                ['funds', 'Setoran keanggotaan sudah dicocokkan.'],
              ],
              'Setujui keanggotaan',
            )
      }`,
    );
  }

  function depositDialog(id) {
    const x = runtime.state.deposits.find((x) => x.id === id);
    if (!x) return;
    dialog(
      'Pemeriksaan setoran',
      /* HTML */ `${statusHead(x)}${review([
          ['Anggota', name(x.member)],
          ['Nomor anggota', x.member],
          ['Jenis setoran', x.type],
          ['Periode / referensi', x.period],
          ['Nominal pengajuan', rupiah(x.amount)],
        ])}
        <div class="staff-proof">
          <div class="eyebrow">Bukti pembayaran · Contoh</div>
          <h3>${esc(name(x.member))}</h3>
          <div class="proof-amount">${rupiah(x.proof)}</div>
          <div class="proof-status">
            <span>Nominal pada pencatatan dana</span
            ><strong>${x.amount === x.proof ? 'Sesuai' : 'Berbeda'}</strong>
          </div>
        </div>
        ${x.note ? /* HTML */ `<div class="info-box">Catatan: ${esc(x.note)}</div>` : ''}${
          x.status === 'Terverifikasi'
            ? '<div class="info-box">Setoran contoh sudah diverifikasi. Pemeriksaan tidak dapat diulang.</div>'
            : decisionForm(
                'deposit',
                id,
                [
                  ['memberMatch', 'Pengirim dan data anggota cocok.'],
                  ['amountMatch', 'Nominal sesuai dengan pengajuan.'],
                  ['reconciled', 'Dana masuk sudah direkonsiliasi.'],
                ],
                'Verifikasi setoran',
              )
        }`,
    );
  }

  function requestDialog(id) {
    const x = runtime.state.requests.find((x) => x.id === id);
    if (!x) return;
    dialog(
      'Tinjauan pengajuan layanan',
      /* HTML */ `${statusHead(x)}${review([
          ['Anggota', name(x.member)],
          ['Layanan', x.type],
          ['Kebutuhan', x.purpose],
          ['Nilai pengajuan', rupiah(x.amount)],
          ['Usulan periode', x.period],
          ...(x.type === 'Penyertaan Modal'
            ? [['Status dana', x.funds ? 'Terverifikasi' : 'Menunggu verifikasi']]
            : []),
        ])}${x.note ? /* HTML */ `<div class="info-box">Catatan: ${esc(x.note)}</div>` : ''}${
          x.status === 'Disetujui'
            ? /* HTML */ `<div class="info-box">
                  Pengajuan sudah disetujui untuk proses penyiapan
                  akad.${
                    x.type === 'Penyertaan Modal' && !x.funds
                      ? ' Verifikasi setoran diperlukan sebelum draf dibuat.'
                      : ''
                  }
                </div>
                <div class="form-actions">
                  <a href="#akad" class="btn full">Lihat penyiapan akad ${icon('arrow')}</a>
                </div>`
            : decisionForm(
                'request',
                id,
                [
                  ['memberActive', 'Keanggotaan pemohon aktif.'],
                  ['purposeChecked', 'Kebutuhan dan rincian pengajuan sudah ditinjau.'],
                ],
                'Setujui pengajuan',
              )
        }
        <p class="staff-dialog-note">
          ${
            x.type === 'Pembiayaan'
              ? 'Harga jual, margin, dan jadwal final tetap memerlukan kesepakatan dalam akad.'
              : 'Penyertaan modal untuk pengadaan kebutuhan barang Mitra sesuai akad.'
          }
        </p>`,
    );
  }

  function memberDialog(id) {
    const x = member(id);
    if (!x) return;
    dialog(
      'Rincian anggota',
      /* HTML */ `${statusHead({ ...x, status: 'Aktif' })}
        <h3>${esc(x.name)}</h3>
        ${review([
          ['Nomor anggota', x.id],
          ['Tanggal bergabung', x.since],
          ['Status keanggotaan', 'Aktif'],
        ])}
        <div class="member-ledger">
          <div>
            <span>Simpanan pokok & wajib</span><strong>${rupiah(x.pokok + x.wajib)}</strong>
          </div>
          <div><span>Penyertaan modal aktif</span><strong>${rupiah(x.modal)}</strong></div>
          <div><span>Sisa tagihan pembiayaan</span><strong>${rupiah(x.tagihan)}</strong></div>
          <div><span>Status akses portal</span><strong>Aktif</strong></div>
        </div>
        <p class="staff-dialog-note">
          Ini gambaran data yang dikelola petugas untuk masing-masing anggota. Penyertaan modal dan
          pengunduran diri dapat dicoba melalui alur pengajuan yang tersambung. Saldo pada ringkasan
          ini tetap data contoh.
        </p>`,
    );
  }

  function draftDialog(id) {
    const x = runtime.state.requests.find((x) => x.id === id);
    if (!x) return;
    if (!canDraft(x)) {
      toast('Pengajuan atau verifikasi dana belum memenuhi syarat.');
      return;
    }
    dialog(
      'Siapkan draf akad',
      /* HTML */ `${review([
          ['Referensi pengajuan', x.id],
          ['Anggota', name(x.member)],
          ['Jenis akad', x.type === 'Pembiayaan' ? 'Murabahah' : 'Penyertaan Modal'],
          ['Nilai pengajuan', rupiah(x.amount)],
          ['Usulan periode', x.period],
        ])}
        <form id="draft-form" data-id="${id}">
          ${checks([['finalCheck', 'Data anggota dan rincian pengajuan sudah diperiksa.']])}
          <p class="form-error" id="decision-error" role="alert" hidden></p>
          <div class="decision-actions">
            <button type="button" class="btn secondary" data-action="close">Batal</button
            ><button type="submit" class="btn">Buat draf contoh</button>
          </div>
        </form>
        <p class="dialog-note">Draf ini hanya ringkasan contoh, bukan naskah akad resmi.</p>`,
    );
  }

  function contractDialog(id) {
    const x = runtime.state.contracts.find((x) => x.id === id);
    if (!x) return;
    dialog(
      'Pratinjau dokumen akad',
      /* HTML */ `<article class="document-preview">
          ${logo()}
          <div class="watermark">Dokumen contoh · Tidak berlaku sebagai akad</div>
          <h3>${x.type === 'Pembiayaan' ? 'Akad Murabahah' : 'Akad Penyertaan Modal'}</h3>
          ${review([
            ['Nomor dokumen', x.id],
            ['Anggota', name(x.member)],
            ['Referensi pengajuan', x.request || 'PM-2026-001'],
            ['Nilai', rupiah(x.amount)],
            ['Tanggal', x.date],
            ['Status', x.status],
          ])}
          <p>Naskah dan ketentuan akad resmi akan disusun serta diperiksa oleh tim koperasi.</p>
        </article>
        <div class="form-actions">
          <button type="button" class="btn secondary full" data-action="close">
            Tutup pratinjau
          </button>
        </div>`,
    );
  }
  return {
    dialog,
    closeDialog,
    decisionForm,
    candidateDialog,
    depositDialog,
    requestDialog,
    memberDialog,
    draftDialog,
    contractDialog,
  };
}
