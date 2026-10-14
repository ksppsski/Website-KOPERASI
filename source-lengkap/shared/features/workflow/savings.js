import {
  Corrections3View,
  Corrections4View,
  Corrections2View,
  Corrections6View,
  Corrections7View,
  Corrections5View,
  CorrectionsView,
  SavingsNotice2View,
  SavingsNoticeView,
  AccessPanel2View,
  AccessPanel3View,
  AccessPanelView,
  SavingsForm2View,
  SavingsFormView,
  MemberSummary2View,
  MemberSummary3View,
  MemberSummary5View,
  MemberSummary4View,
  MemberSummaryView,
  MemberSavings2View,
  MemberSavingsView,
} from './views/savings.svelte';
import {
  needsCorrection,
  esc,
  action,
  shortId,
  money,
  date,
  status,
  empty,
} from './presentation.js';
import { view, snippetView } from '../../runtime/view.js';

/**
 * Simpanan anggota, koreksi, status aktif, dan formulir setoran.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../lib/status-colors.js';
export function createWorkflowSavings({
  app,
  state,
  ensureReady,
  api,
  show,
  profilePanel,
  runtime,
  profileStatus,
}) {
  function savingsEntries() {
    const p = state.profile,
      d = p?.data || {},
      v = p?.savings;
    if (!v) return [];
    const special =
      d.special === 'Ya'
        ? Math.ceil(
            d.specialAmount / (d.specialPayment === 'Angsur' ? Math.max(1, d.installments) : 1),
          )
        : 0;
    return [
      ['Simpanan pokok', v.basic],
      ['Simpanan wajib', v.paid],
      ['Simpanan transaksi', v.other ? d.transactionSaving : 0],
      ['Simpanan khusus', v.other ? special : 0],
    ].filter(([, n]) => n > 0);
  }

  function corrections() {
    const p = state.profile,
      items = state.items.filter(needsCorrection);
    if (!needsCorrection(p) && !items.length) return '';
    return snippetView(CorrectionsView, {
      needsCorrectionContent: needsCorrection(p)
        ? snippetView(Corrections2View, {
            noteContent: p.note ? snippetView(Corrections3View, { note: esc(p.note) }) : '',
            statusContent:
              p.finance?.status === 'correction'
                ? snippetView(Corrections4View, { note: esc(p.finance.note) })
                : '',
            action: action('edit-registration', '', 'Perbaiki pendaftaran', true),
          })
        : '',
      itemsRows: items.map((item) =>
        snippetView(Corrections5View, {
          kindContent:
            item.kind === 'capital'
              ? 'Penyertaan modal'
              : item.kind === 'savings'
                ? 'Setoran simpanan wajib'
                : 'Pengunduran diri',
          shortId: shortId(item),
          noteContent: item.note ? snippetView(Corrections6View, { note: esc(item.note) }) : '',
          statusContent:
            item.finance?.status === 'correction'
              ? snippetView(Corrections7View, { note: esc(item.finance.note) })
              : '',
          action: action('revise', item.id, 'Perbaiki pengajuan', true),
        }),
      ),
    });
  }

  function savingsNotice() {
    const v = state.profile?.savings;
    if (!v || !state.profile) return '';
    if (state.profile.status !== 'approved') return '';
    return snippetView(SavingsNoticeView, {
      activeContent: !v.active || v.low || v.arrears > 0 ? 'status-alert-red' : 'status-alert-blue',
      activeContent2: v.active ? 'aktif' : 'tidak aktif',
      lowContent: v.low ? ' · Segera setor simpanan wajib' : '',
      money: money(v.remaining),
      arrearsContent: v.arrears
        ? ' Kewajiban belum terpenuhi ' + money(v.arrears) + '.'
        : ' Alokasi berikutnya ' + date(v.nextDue + 'T12:00:00Z') + '.',
      lowContent2: v.low
        ? snippetView(SavingsNotice2View, {
            action: action('savings', '', 'Setor simpanan wajib', true),
          })
        : '',
    });
  }

  function accessPanel() {
    return snippetView(AccessPanelView, {
      profileContent: !state.profile
        ? snippetView(AccessPanel2View)
        : state.profile.status !== 'approved'
          ? snippetView(AccessPanel3View)
          : '',
    });
  }

  async function checkAccess() {
    if (!(await ensureReady())) return false;
    try {
      await api('/eligibility');
      return true;
    } catch (error) {
      show('Simpanan belum aktif', accessPanel());
      return false;
    }
  }

  async function savingsForm(item = null) {
    if (!(await ensureReady())) return;
    if (!item && state.profile?.status !== 'approved') {
      show('Lengkapi pendaftaran', profilePanel());
      return;
    }
    runtime.formId = item?.id || crypto.randomUUID();
    show(
      item ? 'Perbaiki setoran simpanan wajib' : 'Setor simpanan wajib',
      snippetView(SavingsFormView, {
        noteContent: item?.finance?.note
          ? snippetView(SavingsForm2View, { note: esc(item.finance.note) })
          : '',
        itemContent: item ? 'yes' : '',
        version: item?.version || 0,
        amountContent: item?.amount === 10000 ? { selected: true } : {},
        amountContent2: item?.amount === 120000 ? { selected: true } : {},
      }),
    );
  }

  function memberSummary() {
    const p = state.profile,
      total = savingsEntries().reduce((sum, [, n]) => sum + n, 0),
      signed = state.items.filter((x) => x.kind === 'capital' && x.status === 'signed');
    return snippetView(MemberSummaryView, {
      pContent: p
        ? snippetView(MemberSummary2View, {
            fieldName: esc(p.data.name),
            statusColor: statusColor(profileStatus(p)),
            profileStatus: profileStatus(p),
            memberNumber: esc(p.memberNumber || '—'),
            date: date(p.createdAt),
          })
        : snippetView(MemberSummary3View),
      money: money(total),
      money2: money(signed.reduce((sum, x) => sum + x.amount, 0)),
      length: signed.length,
      lengthContent: state.items.length
        ? snippetView(MemberSummary4View, {
            sliceRows: state.items.slice(0, 5).map((item) =>
              snippetView(MemberSummary5View, {
                kindContent: item.kind === 'capital' ? 'Penyertaan modal' : 'Pengunduran diri',
                status: status(item),
                date: date(item.createdAt),
                kindContent2: item.kind === 'capital' ? ' · ' + money(item.amount) : '',
              }),
            ),
          })
        : empty('Belum ada aktivitas pengajuan.'),
    });
  }

  function memberSavings() {
    const entries = savingsEntries();
    return entries.length
      ? snippetView(MemberSavingsView, {
          entriesRows: entries.map(([label, n]) =>
            snippetView(MemberSavings2View, { label: label, money: money(n) }),
          ),
        })
      : empty('Belum ada simpanan terverifikasi.');
  }
  return {
    savingsEntries,
    corrections,
    savingsNotice,
    accessPanel,
    checkAccess,
    savingsForm,
    memberSummary,
    memberSavings,
  };
}
