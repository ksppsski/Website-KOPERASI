/**
 * Ekspor daftar transfer dengan perlindungan sel spreadsheet.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createFinanceExport({ app, state }) {
  function csvCell(value, text = false) {
    let s = String(value ?? '');
    if (text || /^[\s]*[=+@\-]/.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  }

  function exportCsv() {
    const p = state.payout;
    if (!p?.members.length) return;
    const rows = [
      [
        'Tanggal',
        'Nomor anggota',
        'Nama anggota',
        'Bank',
        'Nomor rekening',
        'Nama pemilik rekening',
        'Jumlah akad',
        'Total modal (Rp)',
        'Bagi hasil (Rp)',
      ],
      ...p.members.map((m) => [
        p.date,
        m.memberId,
        m.memberName,
        m.bankName,
        m.bankAccount,
        m.accountName,
        m.contractCount,
        m.principal,
        m.amount,
      ]),
      ['TOTAL', '', '', '', '', '', p.contractCount, '', p.total],
    ];
    const text =
      '\ufeff' +
      rows
        .map((r, i) => r.map((v, j) => csvCell(v, i > 0 && j >= 1 && j <= 5 && v !== '')).join(';'))
        .join('\r\n');
    const blob = new Blob([text], { type: 'text/csv;charset=utf-8' }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'KSPPS-Bagi-Hasil-' + p.date + '.csv';
    document.body.append(a);
    a.click();
    a.remove();
    app.scope.timeout(() => URL.revokeObjectURL(url), 1000);
  }
  return { csvCell, exportCsv };
}
