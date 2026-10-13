import { registerWorkflow } from '../../services/workflow.js';

import { createWorkflowPresentation } from './presentation.js';
import { createWorkflowClient } from './client.js';
import { createWorkflowOffers } from './offers.js';
import { createWorkflowRequestViews } from './request-views.js';
import { createWorkflowSavings } from './savings.js';
import { createWorkflowRegistration } from './registration.js';
import { createWorkflowDocuments } from './documents.js';
import { createWorkflowApplicationForms } from './application-forms.js';
import { createWorkflowReviewDialog } from './review-dialog.js';
import { createWorkflowDialogRuntime } from './dialog-runtime.js';
import { bindWorkflowInteractions } from './interaction-events.js';
import { bindWorkflowSubmissions } from './submission-events.js';

/**
 * Inisialisasi workflow: state, perakitan modul, dan lifecycle halaman.
 * Tampilan, formulir, dan handler berada pada file yang disebut di import.
 */
export function initializeWorkflow() {
  'use strict';

  const state = {
    staff: { role: null, accountRole: null, allowedRoles: [] },
    members: [],
    profiles: [],
    profile: null,
    withdrawal: null,
    financing: [],
    offers: [],
    items: [],
    loaded: false,
    loading: false,
    error: '',
    unauthorized: false,
    filters: {},
    busy: false,
  };

  const staff = location.pathname.endsWith('petugas.html');

  const runtime = {
    lastFocus: undefined,
    formId: null,
    offerExpiryTimer: undefined,
  };

  const $ = (selector) => document.querySelector(selector);

  function mount() {
    const panels = document.querySelectorAll('[data-workflow]');
    panels.forEach((el) => {
      if (el.dataset.workflow === 'page-access' && panels.length > 1) {
        el.innerHTML = '';
        return;
      }
      if (state.unauthorized) {
        el.innerHTML = auth();
        return;
      }
      if (!state.loaded && state.loading) {
        el.innerHTML = '<p class="muted" role="status">Memuat pengajuan…</p>';
        return;
      }
      if (state.error) {
        el.innerHTML = /* HTML */ `<div class="wf-empty" role="alert">
          <p>${esc(state.error)}</p>
          ${action('refresh', '', 'Coba lagi')}
        </div>`;
        return;
      }
      if (!state.loaded) {
        el.innerHTML = '<p class="muted" role="status">Memuat pengajuan…</p>';
        return;
      }
      const views = {
        'member-offers': () => offerCards(false),
        'manager-offers': () => offerCards(true),
        'member-savings-deposits': () => memberCards('savings'),
        'member-summary': memberSummary,
        'member-savings': memberSavings,
        'staff-members': staffRegistrationPanel,
        'member-capital': () => memberCards('capital'),
        'member-withdrawal': () => memberCards('withdrawal'),
        'staff-capital': () => staffTable('capital'),
        'staff-withdrawal': () => staffTable('withdrawal'),
        'staff-documents': () => staffTable('capital', true),
        'member-documents': generatedDocuments,
        'staff-overview': overview,
        'member-profile': profilePanel,
        'staff-registration': staffRegistrationPanel,
        'registration-access': () =>
          state.profile
            ? /* HTML */ `<p class="field-hint">
                  Pendaftaran ${esc(state.profile.data.name)}: ${profileStatus(state.profile)}
                </p>
                <a class="btn secondary small-btn" href="#profil">Lihat data tersimpan</a
                >${needsCorrection(state.profile) ? action('edit-registration', '', 'Perbaiki pendaftaran') : ''}`
            : '<p class="field-hint">Data pendaftaran akan tersimpan di akun Anda.</p>',
      };
      el.innerHTML = (views[el.dataset.workflow] || (() => ''))();
    });
    const open = state.items.find(
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
    );
    document.querySelectorAll('[data-wf-action="withdrawal"]').forEach((button) => {
      button.disabled =
        !!open || !!state.withdrawal?.blockers?.length || state.profile?.status === 'closed';
      button.textContent = open
        ? 'Permohonan sedang diproses'
        : state.withdrawal?.blockers?.length
          ? 'Masih ada kontrak / pengajuan'
          : 'Ajukan pengunduran diri';
    });
    if (
      document.querySelector('[data-workflow]') &&
      !state.loaded &&
      !state.loading &&
      !state.error &&
      !state.unauthorized
    )
      void refresh();
  }

  const {
    esc,
    money,
    date,
    shortId,
    workPanel,
    workStage,
    needsCorrection,
    status,
    action,
    auth,
    frame,
    empty,
    links,
    checks,
    input,
  } = createWorkflowPresentation({
    staff,
  });

  const { api, scopedFiles, refresh, saveRegistration, setStaffRole } = createWorkflowClient({
    staff,
    state,
    mount,
    scheduleOfferExpiry: (...args) => scheduleOfferExpiry(...args),
    ensureReady: (...args) => ensureReady(...args),
    notice: (...args) => notice(...args),
  });

  const { scheduleOfferExpiry, offerCards, offerForm } = createWorkflowOffers({
    runtime,
    staff,
    state,
    empty,
    esc,
    money,
    date,
    ensureReady: (...args) => ensureReady(...args),
    show: (...args) => show(...args),
    action,
  });

  const { memberCards, staffTable, overview } = createWorkflowRequestViews({
    state,
    empty,
    shortId,
    date,
    status,
    money,
    esc,
    links,
    needsCorrection,
    action,
  });

  const {
    savingsEntries,
    corrections,
    savingsNotice,
    accessPanel,
    checkAccess,
    savingsForm,
    memberSummary,
    memberSavings,
  } = createWorkflowSavings({
    state,
    needsCorrection,
    esc,
    action,
    shortId,
    money,
    date,
    ensureReady: (...args) => ensureReady(...args),
    api,
    show: (...args) => show(...args),
    profilePanel: (...args) => profilePanel(...args),
    runtime,
    profileStatus: (...args) => profileStatus(...args),
    status,
    empty,
  });

  const {
    profileStatus,
    profileDetails,
    identityMedia,
    completeKtpDialog,
    profilePanel,
    staffRegistrationPanel,
    financeStatus,
    registrationReview,
  } = createWorkflowRegistration({
    needsCorrection,
    esc,
    date,
    state,
    show: (...args) => show(...args),
    staff,
    action,
    empty,
    workPanel,
    checks,
  });

  const {
    generatedDocuments,
    automaticDates,
    automaticPreview,
    generationForm,
    uploadForm,
    downloadPdf,
  } = createWorkflowDocuments({
    state,
    esc,
    status,
    money,
    date,
    empty,
    input,
  });

  const { capitalForm, withdrawalForm } = createWorkflowApplicationForms({
    ensureReady: (...args) => ensureReady(...args),
    state,
    show: (...args) => show(...args),
    profilePanel,
    checkAccess,
    offerCards,
    runtime,
    esc,
    money,
    financeStatus,
    notice: (...args) => notice(...args),
    api,
  });

  const { reviewDialog } = createWorkflowReviewDialog({
    state,
    shortId,
    date,
    money,
    status,
    esc,
    checks,
    generationForm,
    profileDetails,
    show: (...args) => show(...args),
    workPanel,
    workStage,
    financeStatus,
    links,
    uploadForm,
  });

  const { show, close, notice, ensureReady, setBusy, errorMessage, adopt, mutation } =
    createWorkflowDialogRuntime({
      runtime,
      $,
      state,
      refresh,
      auth,
      esc,
      action,
      mount,
      api,
      reviewDialog,
    });

  bindWorkflowInteractions({
    close,
    refresh,
    capitalForm,
    offerForm,
    withdrawalForm,
    savingsForm,
    reviewDialog,
    state,
    registrationReview,
    completeKtpDialog,
    mutation,
    show,
    action,
    setBusy,
    $,
    api,
    adopt,
    notice,
    errorMessage,
    automaticPreview,
    mount,
  });

  bindWorkflowSubmissions({
    state,
    staff,
    workStage,
    runtime,
    setBusy,
    api,
    close,
    mount,
    notice,
    registrationReview,
    adopt,
    reviewDialog,
    downloadPdf,
    errorMessage,
  });

  setInterval(() => {
    if (
      !staff &&
      document.visibilityState === 'visible' &&
      state.loaded &&
      !state.busy &&
      !$('#portal-dialog').open &&
      location.hash !== '#daftar' &&
      document.querySelector('[data-workflow]') &&
      !document.activeElement?.matches('input,textarea,select')
    )
      void refresh();
  }, 60000);

  window.addEventListener('focus', () => {
    if (
      state.loaded &&
      !state.busy &&
      !$('#portal-dialog').open &&
      location.hash !== '#daftar' &&
      document.querySelector('[data-workflow]')
    )
      void refresh();
  });

  registerWorkflow({
    getViewContext: () => ({ automaticPreview, action, frame, staff }),
    getWithdrawal: () => state.withdrawal,
    getFinancing: () => state.financing,
    getProfiles: () => state.profiles,
    getMembers: () => state.members,
    memberOffers: () => frame('member-offers', 'Penawaran penyertaan modal'),
    getOffers: () => state.offers,
    needsCorrection,
    corrections,
    savingsNotice,
    accessPanel,
    checkAccess,
    savingsForm,
    getSavings: () => state.profile?.savings,
    savingsDeposits: () => frame('member-savings-deposits', 'Setoran simpanan wajib'),
    identityMedia,
    api,
    refresh,
    setStaffRole,
    getStaff: () => state.staff,
    mount,
    getProfile: () => state.profile,
    getItems: () => state.items,
    getSavingsEntries: savingsEntries,
    memberSummary: () => frame('member-summary', 'Keanggotaan Anda'),
    memberSavings: () => frame('member-savings', 'Simpanan tercatat'),
    staffMembers: () => frame('staff-members', 'Anggota aktif'),
    capitalForm,
    saveRegistration,
    memberProfile: () => frame('member-profile', 'Data pendaftaran dan akad'),
    staffRegistration: () => frame('staff-registration', 'Pendaftaran dari portal anggota'),
    registrationAccess: () => frame('registration-access', 'Pendaftaran Anda'),
    memberCapital: () => frame('member-capital', 'Pengajuan penyertaan modal Anda'),
    memberDocuments: () => frame('member-documents', 'Akad dari pengajuan Anda'),
    staffDocuments: () => frame('staff-documents', 'Draf dari portal anggota'),
    staffOverview: () => frame('staff-overview', 'Pengajuan dari portal anggota'),
  });
}
