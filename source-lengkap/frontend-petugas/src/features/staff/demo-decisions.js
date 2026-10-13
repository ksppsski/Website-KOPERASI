/**
 * Keputusan simulasi lokal; transaksi nyata tetap melalui API workflow.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createStaffDemoDecisions({ runtime, log, member, rupiah, canDraft }) {
  function decide(kind, id, decision, values) {
    const list =
      kind === 'candidate'
        ? runtime.state.candidates
        : kind === 'deposit'
          ? runtime.state.deposits
          : runtime.state.requests;
    const item = list.find((x) => x.id === id);
    if (!runtime.state.signedIn || !item) return { ok: false, error: 'Data tidak ditemukan.' };
    if (['Disetujui', 'Terverifikasi'].includes(item.status))
      return { ok: false, error: 'Pemeriksaan sudah selesai.' };
    const note = String(values.note || '').trim();
    if (decision === 'return') {
      if (!note) return { ok: false, error: 'Tuliskan alasan data perlu diperbaiki.' };
      item.status = 'Perlu perbaikan';
      item.note = note;
      log(`${id} dikembalikan untuk perbaikan.`);
      return { ok: true, message: 'Catatan perbaikan tersimpan pada data contoh.' };
    }
    const required =
      kind === 'candidate'
        ? ['identity', 'funds']
        : kind === 'deposit'
          ? ['memberMatch', 'amountMatch', 'reconciled']
          : ['memberActive', 'purposeChecked'];
    if (!required.every((key) => values[key]))
      return { ok: false, error: 'Lengkapi semua pemeriksaan terlebih dahulu.' };
    if (kind === 'deposit' && item.amount !== item.proof)
      return { ok: false, error: 'Nominal bukti dan pengajuan belum sesuai.' };
    item.note = note;
    if (kind === 'candidate') {
      item.status = 'Disetujui';
      item.memberId = 'SKI-2026-' + String(runtime.state.members.length + 1).padStart(3, '0');
      runtime.state.members.push({
        id: item.memberId,
        name: item.name,
        since: '16 Sep 2026',
        pokok: 100000,
        wajib: 10000,
        modal: 0,
        tagihan: 0,
      });
      log(`${item.name} disetujui. Keanggotaan ${item.memberId} aktif.`);
    }
    if (kind === 'deposit') {
      item.status = 'Terverifikasi';
      const m = member(item.member);
      if (item.type === 'Simpanan Wajib') m.wajib += item.amount;
      if (item.type === 'Angsuran Murabahah') m.tagihan = Math.max(0, m.tagihan - item.amount);
      if (item.request) {
        const r = runtime.state.requests.find((r) => r.id === item.request);
        if (r) r.funds = true;
      }
      log(`Setoran ${item.id} sebesar ${rupiah(item.amount)} diverifikasi.`);
    }
    if (kind === 'request') {
      item.status = 'Disetujui';
      log(`Pengajuan ${item.id} disetujui untuk penyiapan akad.`);
    }
    return {
      ok: true,
      message:
        kind === 'candidate'
          ? 'Keanggotaan contoh sudah aktif.'
          : kind === 'deposit'
            ? 'Setoran contoh berhasil diverifikasi.'
            : 'Pengajuan contoh disetujui.',
    };
  }

  function makeDraft(id, checked) {
    const r = runtime.state.requests.find((x) => x.id === id);
    if (!runtime.state.signedIn || !r || !checked || !canDraft(r)) return false;
    runtime.state.contracts.unshift({
      id: 'DRAF-CONTOH-' + String(runtime.state.contracts.length + 1).padStart(3, '0'),
      member: r.member,
      request: r.id,
      type: r.type,
      amount: r.amount,
      date: '16 Sep 2026',
      status: 'Draf',
    });
    log(`Draf akad untuk ${r.id} dibuat.`);
    return true;
  }
  return { decide, makeDraft };
}
