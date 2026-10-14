import {
  GeneratedDocuments2View,
  GeneratedDocumentsView,
  AutomaticPreviewView,
  AutomaticPreview2View,
  GenerationFormView,
  UploadFormView,
} from './views/documents.svelte';
import { esc, status, money, date, empty, input } from './presentation.js';
import { view, snippetView } from '../../runtime/view.js';

/**
 * Daftar dokumen, pratinjau tanggal akad, generate, unggah, dan unduh PDF.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWorkflowDocuments({ app, state }) {
  function generatedDocuments() {
    const items = state.items.filter((x) => x.status === 'signed' && x.signedUrl);
    return items.length
      ? snippetView(GeneratedDocumentsView, {
          itemsRows: items.map((item) =>
            snippetView(GeneratedDocuments2View, {
              documentName: esc(item.documentName || 'Akad Penyertaan Modal'),
              status: status(item),
              contractNumber: esc(item.contractNumber),
              money: money(item.amount),
              date: date(item.signedAt),
              signedUrl: item.signedUrl,
              signedUrlValue: item.signedUrl,
            }),
          ),
        })
      : empty(
          'Akad lengkap akan tampil setelah petugas mengunggah PDF yang ditandatangani kedua pihak.',
        );
  }

  function automaticDates(value) {
    const d = new Date(value + 'T12:00:00Z');
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      !Number.isFinite(d.getTime()) ||
      d.toISOString().slice(0, 10) !== value
    )
      return null;
    const month = d.getUTCMonth() + 1,
      roman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'][month - 1],
      code = `SPK-SKI-MRBH-${month}/${roman}/${d.getUTCFullYear()}`;
    d.setUTCDate(d.getUTCDate() + 10);
    if (d.getUTCDate() === 31) d.setUTCDate(d.getUTCDate() + 1);
    const effectiveDate = d.toISOString().slice(0, 10);
    d.setUTCDate(d.getUTCDate() + 365);
    return { code, effectiveDate, endDate: d.toISOString().slice(0, 10) };
  }

  function automaticPreview(value, item) {
    const d = automaticDates(value);
    if (d && item?.renewalEffectiveDate) {
      d.effectiveDate = item.renewalEffectiveDate;
      const end = new Date(d.effectiveDate + 'T12:00:00Z');
      end.setUTCDate(end.getUTCDate() + 365);
      d.endDate = end.toISOString().slice(0, 10);
    }
    return d
      ? snippetView(AutomaticPreviewView, {
          code: esc(d.code),
          renewalOfContent: item?.renewalOf ? 'tanpa +10 hari' : '+10 hari',
          date: date(d.effectiveDate + 'T12:00:00Z'),
          date2: date(d.endDate + 'T12:00:00Z'),
        })
      : snippetView(AutomaticPreview2View);
  }

  function generationForm(item) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Makassar' });
    return snippetView(GenerationFormView, {
      id: item.id,
      version: item.version,
      input: input('Tanggal akad', 'agreementDate', today, 'date', {
        min: '1900-01-01',
        max: '9998-12-20',
      }),
      automaticPreview: automaticPreview(today, item),
    });
  }

  function uploadForm(item) {
    return snippetView(UploadFormView, {
      id: item.id,
      version: item.version,
      contractNumber: esc(item.contractNumber),
    });
  }

  async function downloadPdf(item) {
    const response = await app.request(item.contractUrl + '?download=1', {
      credentials: 'same-origin',
    });
    if (!response.ok)
      throw new Error('PDF tersimpan, tetapi unduh otomatis gagal. Gunakan tombol Unduh PDF awal.');
    const blob = await response.blob(),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = item.documentFilename || 'SPK.pdf';
    document.body.append(a);
    a.click();
    a.remove();
    app.scope.timeout(() => URL.revokeObjectURL(url), 60000);
  }
  return {
    generatedDocuments,
    automaticDates,
    automaticPreview,
    generationForm,
    uploadForm,
    downloadPdf,
  };
}
