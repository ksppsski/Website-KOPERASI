import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkitModule from '@pdf-lib/fontkit';
import { stmt, Problem } from './membership.js';
import { savingsTotal, makassarToday } from './finance.js';
import { safeFilename, disposition } from './document-names.js';

const decode = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const longDate = (value) =>
  new Date(value + 'T12:00:00Z').toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
export async function membershipLetter(env, p) {
  if (!p || ['correction', 'rejected'].includes(p.status)) return null;
  const r = await stmt(
    env,
    "SELECT * FROM finance_reconciliations WHERE owner=? AND target_id=? AND target_kind='registration' AND status='approved'",
    p.owner,
    p.id,
  ).first();
  const data = JSON.parse(p.data);
  if (
    !r ||
    r.proof_key !== p.proof_key ||
    r.expected_amount !== savingsTotal(data) ||
    r.received_amount !== r.expected_amount ||
    Number(data.basic) !== 100000 ||
    Number(data.monthly) !== 10000
  )
    return null;
  const snapshot = JSON.stringify({
    data,
    memberNumber: p.member_number,
    registeredAt: p.created_at,
  });
  await env.DB.batch([
    stmt(
      env,
      `
  INSERT INTO membership_letters (profile_id,owner,reconciled_at,snapshot,created_at) SELECT
  ?,?,?,?,? WHERE NOT EXISTS (SELECT 1 FROM membership_letters WHERE profile_id=?) ON
  CONFLICT(profile_id) DO NOTHING
`,
      p.id,
      p.owner,
      r.checked_at,
      snapshot,
      new Date().toISOString(),
      p.id,
    ),
    stmt(
      env,
      `UPDATE membership_letters SET reconciled_at=?,snapshot=? WHERE profile_id=? AND (reconciled_at<>? OR snapshot<>?)`,
      r.checked_at,
      snapshot,
      p.id,
      r.checked_at,
      snapshot,
    ),
  ]);
  const letter = await stmt(
    env,
    'SELECT * FROM membership_letters WHERE profile_id=?',
    p.id,
  ).first();
  const registered = makassarToday(new Date(p.created_at));
  letter.number = `${String(letter.serial).padStart(4, '0')}/KSPPS-SKI/SPA/${romanMonths[Number(registered.slice(5, 7)) - 1]}/${registered.slice(0, 4)}`;
  letter.filename = safeFilename(`SPA ${p.member_number} a.n ${data.name}`) + '.pdf';
  return letter;
}
export const letterDTO = (letter) =>
  letter
    ? {
        number: letter.number,
        filename: letter.filename,
        effectiveDate: makassarToday(new Date(letter.reconciled_at)),
        url: '/api/workflow/profile/letter',
      }
    : null;

export async function buildMembershipLetter(letter) {
  if (
    typeof PDF_MEMBERSHIP_TEMPLATE === 'undefined' ||
    typeof PDF_MEMBERSHIP_SIGNATURE === 'undefined'
  )
    throw Error('Membership template missing');
  const pdf = await PDFDocument.load(decode(PDF_MEMBERSHIP_TEMPLATE), { updateMetadata: false });
  pdf.registerFontkit(fontkitModule.default || fontkitModule);
  const regular = await pdf.embedFont(
    typeof PDF_FONT_REGULAR === 'undefined' ? StandardFonts.Helvetica : decode(PDF_FONT_REGULAR),
    { subset: true },
  );
  const bold = await pdf.embedFont(
    typeof PDF_FONT_BOLD === 'undefined' ? StandardFonts.HelveticaBold : decode(PDF_FONT_BOLD),
    { subset: true },
  );
  const signature = await pdf.embedPng(decode(PDF_MEMBERSHIP_SIGNATURE));
  const p = pdf.getPages()[0],
    h = p.getHeight(),
    snap = JSON.parse(letter.snapshot),
    d = snap.data,
    effective = longDate(makassarToday(new Date(letter.reconciled_at)));
  const wrap = (text, font, size, width) => {
    const lines = [];
    let line = '';
    for (const word of String(text || '—')
      .replace(/\s+/g, ' ')
      .split(' ')) {
      if (font.widthOfTextAtSize(word, size) > width) {
        if (line) {
          lines.push(line);
          line = '';
        }
        for (const char of word) {
          if (font.widthOfTextAtSize(line + char, size) > width) {
            lines.push(line);
            line = '';
          }
          line += char;
        }
        continue;
      }
      if (line && font.widthOfTextAtSize(line + ' ' + word, size) > width) {
        lines.push(line);
        line = word;
      } else line = line ? line + ' ' + word : word;
    }
    if (line) lines.push(line);
    return lines;
  };
  let commands, chosen;
  for (const size of [11, 10.5, 10, 9.5]) {
    commands = [];
    let y = 151;
    const text = (value, x, width, font = regular, s = size, center = false) => {
      const lines = wrap(value, font, s, width);
      for (const line of lines) {
        commands.push({
          line,
          x: center ? x + (width - font.widthOfTextAtSize(line, s)) / 2 : x,
          y,
          font,
          size: s,
        });
        y += s * 1.35;
      }
      return lines.length;
    };
    text('SURAT PENGESAHAN KEANGGOTAAN', 72, 468, bold, 13, true);
    y += 3;
    text('Nomor : ' + letter.number, 72, 468, regular, 10.5, true);
    y += 19;
    text('Yang bertandatangan dibawah ini:', 72, 468);
    y += 7;
    const row = (label, value, strong = false) => {
      const top = y;
      const labelLines = wrap(label, regular, size, 174);
      labelLines.forEach((line, i) =>
        commands.push({ line, x: 90, y: top + i * size * 1.35, font: regular, size }),
      );
      commands.push({ line: ':', x: 267, y: top, font: regular, size });
      text(value, 278, 262, strong ? bold : regular);
      y = Math.max(y, top + labelLines.length * size * 1.35) + 5;
    };
    row('Nama', 'Muhammad Aqra Wardiansyah', true);
    row('Jabatan', 'Ketua KSPPS Syirkah Kebaikan Indonesia', true);
    row('Bertindak untuk dan atas nama', 'KSPPS Syirkah Kebaikan Indonesia', true);
    y += 7;
    text('Dengan ini menyatakan bahwa:', 72, 468);
    y += 7;
    row('Nama', d.name, true);
    row('NIK', d.identityNumber);
    row(
      'Tempat/Tanggal Lahir',
      [d.birthplace, d.birthdate ? longDate(d.birthdate) : ''].filter(Boolean).join(', '),
    );
    row('Alamat', d.identityAddress);
    row('Nomor Anggota', snap.memberNumber, true);
    y += 8;
    text(
      'Telah resmi disahkan sebagai Anggota KSPPS Syirkah Kebaikan Indonesia ' +
        `terhitung sejak tanggal ${effective} dan berhak memperoleh layanan ` +
        'serta kewajiban sesuai dengan ketentuan yang berlaku di koperasi.',
      72,
      468,
    );
    y += 8;
    text('Demikian surat pengesahan ini dibuat untuk dipergunakan sebagaimana mestinya.', 72, 468);
    y += 20;
    text('Makassar, ' + effective, 72, 468);
    y += 3;
    text('Hormat kami,', 72, 468);
    y += 3;
    text('KSPPS Syirkah Kebaikan Indonesia', 72, 468, bold);
    const dims = signature.scaleToFit(140, 72);
    commands.push({ image: true, x: 72, y: y + 3, width: dims.width, height: dims.height });
    y += dims.height + 12;
    text('Muhammad Aqra Wardiansyah', 72, 468, bold);
    y += 3;
    text('Ketua KSPPS Syirkah Kebaikan Indonesia', 72, 468);
    if (y <= 754) {
      chosen = size;
      break;
    }
  }
  if (!chosen)
    throw new Problem(400, 'Data terlalu panjang untuk surat satu halaman. Periksa data anggota.');
  for (const c of commands) {
    if (c.image)
      p.drawImage(signature, { x: c.x, y: h - c.y - c.height, width: c.width, height: c.height });
    else
      p.drawText(c.line, {
        x: c.x,
        y: h - c.y - c.size,
        font: c.font,
        size: c.size,
        color: rgb(0, 0, 0),
      });
  }
  pdf.setTitle(letter.filename.replace(/\.pdf$/, ''));
  pdf.setAuthor('KSPPS Syirkah Kebaikan Indonesia');
  pdf.setLanguage('id-ID');
  return pdf.save();
}
export async function membershipLetterResponse(env, p, download) {
  const letter = await membershipLetter(env, p);
  if (!letter)
    throw new Problem(
      409,
      'Surat keanggotaan tersedia setelah simpanan pokok dan wajib direkonsiliasi Finance.',
    );
  return new Response(await buildMembershipLetter(letter), {
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': disposition(letter.filename, download),
    },
  });
}
