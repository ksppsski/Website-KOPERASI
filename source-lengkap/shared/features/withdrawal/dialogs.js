import { activityService } from '../../services/activity.js';
/**
 * Dialog pengembalian simpanan pokok dan pencatatan pembiayaan.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWithdrawalDialogs({
  $,
  button,
  state,
  details,
  money,
  summary,
  esc,
  field,
  wf,
  date,
}) {
  function show(title, body) {
    const modal = $('#portal-dialog');
    if (modal.open) modal.close();
    $('#dialog-content').innerHTML = /* HTML */ `<div class="dialog-inner">
      <div class="dialog-head">
        <h2 id="dialog-title">${title}</h2>
        ${button('close', 'Tutup')}
      </div>
      ${body}
    </div>`;
    modal.showModal();
    activityService?.mount();
  }

  const errorBlock = '<p id="resign-error" class="form-error" role="alert" hidden></p>';

  function detail(id) {
    const x = state.items.find((x) => x.id === id);
    if (!x) return;
    const s = x.settlement,
      manager = location.hash === '#manager-pengunduran',
      can = manager ? x.status === 'manager_pending' : x.status === 'finance_pending';
    show(
      manager ? 'Persetujuan final' : 'Pengembalian simpanan pokok',
      `${!manager && can ? activityService?.panel(id, 'withdrawal-return') || '' : ''}${details([
        ['Anggota', x.memberName],
        ['Nomor anggota', x.memberNumber],
        ['Alasan pengunduran diri', x.reason],
        ['Bank tujuan', s?.bankName],
        ['Nomor rekening', s?.bankAccount],
        ['Atas nama', s?.accountName],
        ['Nominal pengembalian', money(s?.amount)],
      ])}${summary(x)}${
        can
          ? /* HTML */ `<form
              id="resign-${manager ? 'close' : 'pay'}-form"
              data-id="${esc(id)}"
              data-version="${x.version}"
            >
              ${
                manager
                  ? '<p class="info-box">Persetujuan ini menutup keanggotaan dan menonaktifkan nomor anggota secara permanen.</p>'
                  : /* HTML */ `${field('Nominal (Rp)', 'amount', 'number', 'value="100000" readonly')}${field(
                        'Tanggal transfer',
                        'transferDate',
                        'date',
                        `min="${s.adminAt.slice(0, 10)}" max="${state.today}" value="${state.today}"`,
                      )}${field('Referensi transfer', 'reference', 'text', 'minlength="3" maxlength="160"')}${field(
                        'Bukti transfer (JPG, PNG, PDF)',
                        'proof',
                        'file',
                        'accept=".jpg,.jpeg,.png,.pdf"',
                      )}
                      <p class="field-hint">Maksimal 10 MB. Catat setelah transfer berhasil.</p>`
              }<label class="check"
                ><input name="confirm" type="checkbox" required />${
                  manager
                    ? 'Saya telah memeriksa persetujuan Admin dan bukti pengembalian Finance, serta menyetujui penutupan permanen keanggotaan.'
                    : 'Saya memastikan Rp100.000 sudah dikembalikan ke rekening anggota di atas.'
                }</label
              >${errorBlock}
              <div class="form-actions">
                <button class="btn" type="submit">
                  ${
                    manager
                      ? 'Setujui final & tutup keanggotaan'
                      : 'Simpan pengembalian & kirim ke Manajer'
                  }
                </button>
              </div>
            </form>`
          : ''
      }`,
    );
  }

  function record() {
    const ps = (wf()?.getProfiles() || []).filter((p) => p.status === 'approved');
    show(
      'Catat kontrak pembiayaan',
      /* HTML */ `<form id="resign-financing-form">
        <label class="form-field"
          ><span>Anggota *</span
          ><select name="profileId" required>
            <option value="">Pilih anggota</option>
            ${ps
              .map(
                (p) =>
                  /* HTML */ `<option value="${esc(p.id)}">
                    ${esc(p.memberNumber)} · ${esc(p.data.name)}
                  </option>`,
              )
              .join('')}
          </select></label
        >${field('Nomor kontrak', 'number', 'text', 'maxlength="120"')}${field('Kebutuhan barang', 'purpose', 'text', 'minlength="3" maxlength="200"')}${field(
          'Nilai kontrak (Rp)',
          'amount',
          'number',
          'min="1" max="1000000000000" step="1"',
        )}
        <div class="form-row">
          ${field('Tanggal mulai', 'startDate', 'date')}${field('Tanggal selesai', 'endDate', 'date')}
        </div>
        <label class="check"
          ><input type="checkbox" name="confirm" required />Data sesuai kontrak pembiayaan yang
          telah disepakati anggota.</label
        >
        <p class="field-hint">
          Anggota tidak dapat mengundurkan diri sampai kontrak dicatat lunas, termasuk jika sudah
          lewat jatuh tempo.
        </p>
        ${errorBlock}<button class="btn" type="submit">Simpan kontrak</button>
      </form>`,
    );
  }

  function financingDetail(id) {
    const x = state.items.find((x) => x.id === id);
    if (!x) return;
    show(
      'Kontrak pembiayaan',
      `${details([
        ['Anggota', x.memberName],
        ['Nomor kontrak', x.number],
        ['Kebutuhan barang', x.purpose],
        ['Nilai kontrak', money(x.amount)],
        ['Tanggal mulai', date(x.startDate)],
        ['Tanggal selesai', date(x.endDate)],
        ['Status', x.status],
      ])}${
        x.settledAt
          ? /* HTML */ `<p class="info-box">
              Dicatat lunas ${date(x.settledAt)} · ${esc(x.settlementNote)}
            </p>`
          : /* HTML */ `<form id="resign-settle-form" data-id="${esc(id)}">
              <label class="form-field"
                ><span>Referensi pemeriksaan pelunasan *</span
                ><textarea name="note" minlength="5" maxlength="1500" required></textarea></label
              ><label class="check"
                ><input type="checkbox" name="confirm" required />Seluruh kewajiban kontrak telah
                lunas dan sudah diperiksa.</label
              >${errorBlock}<button class="btn" type="submit">Catat lunas</button>
            </form>`
      }`,
    );
  }
  return { show, errorBlock, detail, record, financingDetail };
}
