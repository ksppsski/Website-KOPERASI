import {
  MemberCards4View,
  MemberCards3View,
  MemberCards5View,
  MemberCards6View,
  MemberCards7View,
  MemberCards8View,
  MemberCards2View,
  MemberCardsView,
  StaffTable2View,
  StaffTable5View,
  StaffTable6View,
  StaffTable4View,
  StaffTable3View,
  StaffTableView,
  OverviewView,
} from './views/request-views.svelte';
import {
  empty,
  shortId,
  date,
  status,
  money,
  esc,
  needsCorrection,
  action,
} from './presentation.js';
import { view, snippetView } from '../../runtime/view.js';

/**
 * Daftar pengajuan anggota serta antrean pemeriksaan petugas.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWorkflowRequestViews({ app, state, links }) {
  function memberCards(kind) {
    const items = state.items.filter((x) => x.kind === kind);
    if (!items.length)
      return empty(
        kind === 'capital'
          ? 'Belum ada pengajuan penyertaan modal.'
          : kind === 'savings'
            ? 'Belum ada setoran simpanan wajib lanjutan.'
            : 'Belum ada permohonan pengunduran diri.',
      );
    return snippetView(MemberCardsView, {
      itemsRows: items.map((item) =>
        snippetView(MemberCards2View, {
          shortId: shortId(item),
          date: date(item.createdAt),
          status: status(item),
          includesContent: ['capital', 'savings'].includes(kind)
            ? snippetView(MemberCards3View, {
                money: money(item.amount),
                proofName: esc(item.proofName),
                projectCodeContent: item.projectCode
                  ? snippetView(MemberCards4View, {
                      projectCode: esc(item.projectCode),
                      offerTitle: esc(item.offerTitle),
                    })
                  : '',
              })
            : snippetView(MemberCards5View, { reason: esc(item.reason) }),
          statusContent:
            item.finance?.status === 'correction'
              ? snippetView(MemberCards6View, { note: esc(item.finance.note) })
              : '',
          noteContent: item.note
            ? snippetView(MemberCards7View, {
                kindContent:
                  kind === 'withdrawal' && item.status === 'rejected'
                    ? 'Alasan penolakan'
                    : 'Catatan Admin',
                note: esc(item.note),
              })
            : '',
          kindContent:
            kind === 'capital'
              ? app.services.maturity?.summary(item) || ''
              : kind === 'withdrawal'
                ? app.services.withdrawal?.summary(item) || ''
                : '',
          kindContent2:
            kind === 'withdrawal' && ['approved', 'rejected'].includes(item.status)
              ? snippetView(MemberCards8View, { date: date(item.updatedAt) })
              : '',
          links: links(item),
          needsCorrectionContent: needsCorrection(item)
            ? action('revise', item.id, 'Perbaiki pengajuan')
            : '',
          kindContent3:
            kind === 'withdrawal' && ['pending', 'correction'].includes(item.status)
              ? action('cancel', item.id, 'Batalkan permohonan')
              : '',
        }),
      ),
    });
  }

  function staffTable(kind, documents = false) {
    let items = state.items.filter((x) => x.kind === kind);
    const filter = state.filters[documents ? 'documents' : kind] || '';
    if (filter) items = items.filter((x) => x.status === filter);
    const filterKey = documents ? 'documents' : kind;
    const statuses =
      kind === 'capital'
        ? [
            ['pending', 'Menunggu pemeriksaan'],
            ['reviewing', 'Dalam pemeriksaan'],
            ['correction', 'Perlu perbaikan'],
            ['ready', 'Siap dibuat'],
            ['generated', 'Menunggu tanda tangan koperasi'],
            ['signed', 'Akad lengkap'],
          ]
        : [
            ['pending', 'Menunggu keputusan Admin'],
            ['reviewing', 'Dalam peninjauan Admin'],
            ['correction', 'Perlu perbaikan'],
            ['approved', 'Disetujui'],
            ['rejected', 'Ditolak'],
            ['cancelled', 'Dibatalkan'],
          ];
    return snippetView(StaffTableView, {
      filterKey: filterKey,
      statusesRows: statuses.map(([value, label]) =>
        snippetView(StaffTable2View, {
          fieldValue: value,
          valueContent: value === filter ? { selected: true } : {},
          label: label,
        }),
      ),
      lengthContent: items.length
        ? snippetView(StaffTable3View, {
            kindContent: kind === 'capital' ? 'NOMINAL' : 'DITERIMA',
            itemsRows: items.map((item) =>
              snippetView(StaffTable4View, {
                memberName: esc(item.memberName),
                shortId: shortId(item),
                memberId: item.memberId,
                projectCodeContent: item.projectCode
                  ? snippetView(StaffTable5View, { projectCode: esc(item.projectCode) })
                  : '',
                kindContent: kind === 'capital' ? money(item.amount) : date(item.createdAt),
                status: status(item),
                kindContent2:
                  kind === 'capital'
                    ? snippetView(StaffTable6View, {
                        label: esc(item.finance?.label || 'Menunggu Finance'),
                      })
                    : '',
                action: action(
                  'review',
                  item.id,
                  ['generated', 'signed'].includes(item.status) ? 'Lihat akad' : 'Periksa',
                ),
              }),
            ),
          })
        : empty('Belum ada pengajuan yang sesuai.'),
    });
  }

  function overview() {
    const capital = state.items.filter(
      (x) => x.kind === 'capital' && !['signed', 'rejected', 'cancelled'].includes(x.status),
    ).length;
    const withdrawal = state.items.filter(
      (x) => x.kind === 'withdrawal' && !['completed', 'rejected', 'cancelled'].includes(x.status),
    ).length;
    return snippetView(OverviewView, { capital: capital, withdrawal: withdrawal });
  }
  return { memberCards, staffTable, overview };
}
