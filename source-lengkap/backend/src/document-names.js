export function contractDocumentName(row) {
  const member = row.member_snapshot ? JSON.parse(row.member_snapshot).data : {};
  const details = JSON.parse(row.contract_data || '{}');
  const serial = details.serial || String(row.contract_number || '').split('/')[0] || row.id;
  return `SPK ${row.project_code || details.code || 'Penyertaan Modal'} / ${serial} a.n ${member.name || row.member_name}`;
}
export const safeFilename = (name) =>
  String(name)
    .normalize('NFC')
    .replace(/[\\/:*?"<>|\u0000-\u001f\u007f]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 220);
export function disposition(name, download = false) {
  const filename = safeFilename(name),
    ascii = filename.replace(/[^\x20-\x7e]/g, '_');
  const encoded = encodeURIComponent(filename).replace(
    /[!'()*]/g,
    (character) => '%' + character.charCodeAt(0).toString(16).toUpperCase(),
  );
  const mode = download ? 'attachment' : 'inline';
  return `${mode}; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}
