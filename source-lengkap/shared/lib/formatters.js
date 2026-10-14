export const displayText = (value) => String(value ?? '');
export const formatMoney = (value) => 'Rp' + Number(value || 0).toLocaleString('id-ID');

export function formatDate(value, month = 'short') {
  if (!value) return '—';
  const source = typeof value === 'string' && value.length === 10 ? value + 'T12:00:00Z' : value;
  return new Date(source).toLocaleDateString('id-ID', {
    day: 'numeric',
    month,
    year: 'numeric',
    timeZone: 'Asia/Makassar',
  });
}
export const formatLongDate = (value) => formatDate(value, 'long');
export function witaDate(value = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(new Date(value))
      .map((part) => [part.type, part.value]),
  );
  return `${parts.year}-${parts.month}-${parts.day}`;
}
