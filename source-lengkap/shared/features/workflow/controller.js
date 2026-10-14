import {
  MountView,
  Mount2View,
  Mount3View,
  ViewsView,
  Views2View,
} from './views/controller.svelte';
import { view, snippetView } from '../../runtime/view.js';

import { createWorkflowPresentation } from './presentation.js';
import { createWorkflowClient } from './client.js';
import { createWorkflowCoordinator } from './coordinator.js';
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
export function initializeWorkflow(app) {
  'use strict';

  const state = app.state({
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
  });

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
        app.ui.render(el, '');
        return;
      }
      if (state.unauthorized) {
        app.ui.render(el, auth());
        return;
      }
      if (!state.loaded && state.loading) {
        app.ui.render(el, snippetView(MountView));
        return;
      }
      if (state.error) {
        app.ui.render(
          el,
          snippetView(Mount2View, {
            error: esc(state.error),
            action: action('refresh', '', 'Coba lagi'),
          }),
        );
        return;
      }
      if (!state.loaded) {
        app.ui.render(el, snippetView(Mount3View));
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
            ? snippetView(ViewsView, {
                fieldName: esc(state.profile.data.name),
                profileStatus: profileStatus(state.profile),
                needsCorrectionContent: needsCorrection(state.profile)
                  ? action('edit-registration', '', 'Perbaiki pendaftaran')
                  : '',
              })
            : snippetView(Views2View),
      };
      app.ui.render(el, (views[el.dataset.workflow] || (() => ''))());
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
  } = createWorkflowPresentation({ app, staff });

  const client = createWorkflowClient({
    staff,
    request: app.request,
    memberForPath: (path) =>
      state.items.find((item) => path.startsWith('/' + item.id + '/'))?.memberProfileId,
  });
  const { scopedFiles } = client;
  async function api(path, options) {
    try {
      return await client.api(path, options);
    } catch (error) {
      if (error.status === 401) {
        state.unauthorized = true;
        mount();
      }
      throw error;
    }
  }
  const { refresh, saveRegistration, setStaffRole } = createWorkflowCoordinator({
    app,
    api,
    staff,
    state,
    mount,
    scheduleOfferExpiry: (...args) => scheduleOfferExpiry(...args),
    ensureReady: (...args) => ensureReady(...args),
    notice: (...args) => notice(...args),
  });

  const { scheduleOfferExpiry, offerCards, offerForm } = createWorkflowOffers({
    app,
    runtime,
    staff,
    state,
    ensureReady: (...args) => ensureReady(...args),
    show: (...args) => show(...args),
  });

  const { memberCards, staffTable, overview } = createWorkflowRequestViews({ app, state, links });

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
    app,
    state,
    ensureReady: (...args) => ensureReady(...args),
    api,
    show: (...args) => show(...args),
    profilePanel: (...args) => profilePanel(...args),
    runtime,
    profileStatus: (...args) => profileStatus(...args),
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
    app,
    state,
    show: (...args) => show(...args),
    staff,
    workPanel,
  });

  const {
    generatedDocuments,
    automaticDates,
    automaticPreview,
    generationForm,
    uploadForm,
    downloadPdf,
  } = createWorkflowDocuments({ app, state });

  const { capitalForm, withdrawalForm } = createWorkflowApplicationForms({
    app,
    ensureReady: (...args) => ensureReady(...args),
    state,
    show: (...args) => show(...args),
    profilePanel,
    checkAccess,
    offerCards,
    runtime,
    financeStatus,
    notice: (...args) => notice(...args),
    api,
  });

  const { reviewDialog } = createWorkflowReviewDialog({
    app,
    state,
    generationForm,
    profileDetails,
    show: (...args) => show(...args),
    workPanel,
    financeStatus,
    links,
    uploadForm,
  });

  const { show, close, notice, ensureReady, setBusy, errorMessage, adopt, mutation } =
    createWorkflowDialogRuntime({ app, runtime, $, state, refresh, mount, api, reviewDialog });

  bindWorkflowInteractions({
    app,
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
    app,
    state,
    staff,
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

  app.scope.interval(() => {
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

  app.scope.listen(window, 'focus', () => {
    if (
      state.loaded &&
      !state.busy &&
      !$('#portal-dialog').open &&
      location.hash !== '#daftar' &&
      document.querySelector('[data-workflow]')
    )
      void refresh();
  });

  app.services.workflow = {
    state,
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
  };
  return app.services.workflow;
}
