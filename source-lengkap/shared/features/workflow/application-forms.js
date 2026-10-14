import {
  CapitalFormView,
  CapitalForm2View,
  CapitalForm4View,
  CapitalForm5View,
  CapitalForm3View,
  WithdrawalFormView,
  WithdrawalForm3View,
  WithdrawalForm2View,
} from './views/application-forms.svelte';
import { esc, money } from './presentation.js';
import { view, fallbackView, snippetView } from '../../runtime/view.js';

/**
 * Form penyertaan modal dan permohonan pengunduran diri.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWorkflowApplicationForms({
  app,
  ensureReady,
  state,
  show,
  profilePanel,
  checkAccess,
  offerCards,
  runtime,
  financeStatus,
  notice,
  api,
}) {
  async function capitalForm(item = null, offerId = '') {
    if (!(await ensureReady())) return;
    if (!item && (!state.profile || state.profile.status !== 'approved')) {
      show('Lengkapi pendaftaran', [profilePanel(), snippetView(CapitalFormView)]);
      return;
    }
    if (!item && !(await checkAccess())) return;
    const offer = state.offers.find((o) => o.id === (item?.offerId || offerId));
    if (!item && !offer) {
      show('Pilih penawaran', offerCards());
      return;
    }
    if (!item && offer.remaining <= 0) {
      show('Kuota penuh', snippetView(CapitalForm2View));
      return;
    }
    const available = offer ? offer.remaining + (item?.amount || 0) : 1000000000000;
    runtime.formId = item?.id || crypto.randomUUID();
    show(
      item ? 'Perbaiki penyertaan modal' : 'Ajukan penyertaan modal',
      snippetView(CapitalForm3View, {
        memberName: esc(item?.memberName || state.profile?.data.name || 'Anggota'),
        memberId: esc(item?.memberId || state.profile?.memberNumber || 'Nomor belum tersedia'),
        offerContent:
          offer || item?.projectCode
            ? snippetView(CapitalForm4View, {
                title: esc(offer?.title || item.offerTitle),
                projectCode: esc(offer?.projectCode || item.projectCode),
                money: money(available),
              })
            : '',
        noteContent: item?.note ? snippetView(CapitalForm5View, { note: esc(item.note) }) : '',
        statusContent: item?.finance?.status === 'correction' ? financeStatus(item) : '',
        itemContent: item ? 'yes' : '',
        version: item?.version || 0,
        id: esc(offer?.id || item?.offerId || ''),
        available: available,
        amount: item?.amount || '',
      }),
    );
  }

  async function withdrawalForm(item = null) {
    if (!(await ensureReady())) return;
    if (!item && (!state.profile || state.profile.status !== 'approved')) {
      show('Lengkapi pendaftaran', profilePanel());
      return;
    }
    if (
      !item &&
      state.items.some(
        (x) =>
          x.kind === 'withdrawal' &&
          [
            'pending',
            'reviewing',
            'correction',
            'approved',
            'finance_pending',
            'manager_pending',
          ].includes(x.status),
      )
    ) {
      notice('Masih ada permohonan yang sedang diproses.');
      return;
    }
    try {
      state.withdrawal = await api('/withdrawal/eligibility');
      if (state.withdrawal.blockers?.length) {
        show(
          'Selesaikan kontrak terlebih dahulu',
          fallbackView(app.services.withdrawal?.eligibility(), snippetView(WithdrawalFormView)),
        );
        return;
      }
    } catch (e) {
      notice(e.message);
      return;
    }
    runtime.formId = item?.id || crypto.randomUUID();
    show(
      item ? 'Perbaiki permohonan' : 'Pengunduran diri anggota',
      snippetView(WithdrawalForm2View, {
        memberName: esc(item?.memberName || state.profile?.data.name || 'Anggota'),
        memberId: esc(item?.memberId || state.profile?.memberNumber || 'Nomor belum tersedia'),
        noteContent: item?.note ? snippetView(WithdrawalForm3View, { note: esc(item.note) }) : '',
        itemContent: item ? 'yes' : '',
        version: item?.version || 0,
        reason: esc(item?.reason || ''),
      }),
    );
  }
  return { capitalForm, withdrawalForm };
}
