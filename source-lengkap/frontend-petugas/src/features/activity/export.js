/**
 * Ekspor rincian waktu kerja petugas.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createActivityExport({ app, state, wf, filtered, roleLabel, time, statusLabel }) {
  function csv() {
    if (!state.loaded || wf().getStaff()?.role !== 'manager') return;
    const rows = [
      [
        'Tahap',
        'Referensi',
        'Anggota / daftar',
        'Peran',
        'Masuk (WITA)',
        'Mulai (WITA)',
        'Selesai (WITA)',
        'Respons (detik)',
        'Pengerjaan (detik)',
        'Status',
        'ID akun mulai',
        'ID akun selesai',
      ],
      ...filtered().map((t) => [
        t.label,
        t.targetId,
        t.memberName,
        roleLabel(t.role),
        t.receivedAt ? time(t.receivedAt) : '',
        t.startedAt ? time(t.startedAt) : '',
        t.completedAt ? time(t.completedAt) : '',
        t.responseSeconds ?? '',
        t.processingSeconds ?? '',
        statusLabel(t),
        t.startedBy || '',
        t.completedBy || '',
      ]),
    ];
    const cell = (v) => {
      let s = String(v ?? '');
      if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const blob = new Blob(['\ufeff' + rows.map((r) => r.map(cell).join(';')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'KSPPS-Waktu-Kerja.csv';
    document.body.append(a);
    a.click();
    a.remove();
    app.scope.timeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { csv };
}
