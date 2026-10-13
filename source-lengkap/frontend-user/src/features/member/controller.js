import { workflowService } from '../../../../shared/services/workflow.js';
import { reportsService } from '../../../../shared/services/reports.js';

import { createMemberPresentation } from './presentation.js';
import { createMemberQueries } from './queries.js';
import { createRegistrationIdentity } from './registration-identity.js';
import { createRegistrationProof } from './registration-proof.js';
import { createRegistrationForm } from './registration-form.js';
import { createMemberHistoryViews } from './history-views.js';
import { createMemberDialogs } from './dialogs.js';
import { bindMemberInteractions } from './interaction-events.js';
import { bindMemberSubmissions } from './submission-events.js';
import { bindMemberProfileEvents } from './profile-events.js';

/**
 * Inisialisasi member: state, perakitan modul, dan lifecycle halaman.
 * Tampilan, formulir, dan handler berada pada file yang disebut di import.
 */
export function initializeMemberPortal(renderView) {
  'use strict';

  const $ = (s, root = document) => root.querySelector(s);

  const app = $('#app');

  const modal = $('#portal-dialog');

  const state = {
    signedIn: false,
    registrationId: crypto.randomUUID(),
    registrationVersion: 0,
    registrationStep: 1,
    registrationKtp: null,
    registrationKtpUrl: '',
    registrationKtpBusy: false,
    registrationKtpError: '',
    registrationProof: null,
    registrationProofBusy: false,
    registrationProofError: '',
    registration: {
      office: 'Kantor KSPPS Makassar',
      identityType: 'KTP',
      religion: 'Islam',
      monthly: 10000,
      paymentOption: 'Bulanan',
      basic: 100000,
      transactionSaving: 50000,
      special: 'Tidak',
      specialAmount: 1000000,
      specialPayment: 'Tunai',
      installments: 10,
      admin: 30000,
    },
    signature: false,
    profile: {},
    savedProfile: false,
    requests: [],
    deposits: [],
    requestCounter: 1,
    modalTab: 'Semua',
    financeTab: 'Semua',
  };

  const runtime = {
    toastTimer: undefined,
    lastFocus: undefined,
    lastRoute: '',
    registrationProofSequence: 0,
    registrationKtpSequence: 0,
    editingRegistration: false,
  };

  function toast(message) {
    const t = $('#toast');
    clearTimeout(runtime.toastTimer);
    t.textContent = message;
    t.hidden = false;
    runtime.toastTimer = setTimeout(() => (t.hidden = true), 4500);
  }

  function go(route) {
    if (location.hash.slice(1) === route) render();
    else location.hash = route;
  }

  const pages = {
    ringkasan: ['Ringkasan', 'home'],
    simpanan: ['Simpanan Saya', 'wallet'],
    modal: ['Penyertaan Modal', 'sprout'],
    pembiayaan: ['Pembiayaan', 'store'],
    dokumen: ['Dokumen Akad', 'file'],
    laporan: ['Laporan Koperasi', 'file'],
    profil: ['Profil Anggota', 'user'],
    bantuan: ['Bantuan', 'help'],
    pengunduran: ['Pengunduran Diri', 'logout'],
  };

  function render() {
    let route = location.hash.slice(1) || 'masuk';
    if (pages[route] && !state.signedIn) {
      history.replaceState(null, '', '#masuk');
      route = 'masuk';
    }
    if (!pages[route] && !['masuk', 'daftar', 'lupa-sandi', 'daftar-selesai'].includes(route)) {
      history.replaceState(null, '', '#masuk');
      route = 'masuk';
    }
    if (modal.open && runtime.lastRoute !== route) modal.close();
    renderView({
      role: 'member',
      route,
      context: {
        icon,
        stat,
        demoStrip,
        esc,
        rupiah,
        badge,
        state,
        savingsState,
        serviceLocked,
        currentContracts,
        heading,
        savingsEntries,
        shortDate,
        memberAlerts,
        recentActivity,
        activity,
        documentCards,
        requestPanel,
        navLink,
        pages,
        field,
        registrationKtpInput,
        specialFirst,
        registrationTotal,
        review,
        savingsRows,
        download,
        registrationProofInput,
        render,
      },
    });
    document.title =
      (pages[route]?.[0] ||
        {
          masuk: 'Masuk Anggota',
          daftar: 'Daftar Anggota',
          'lupa-sandi': 'Pemulihan Akun',
          'daftar-selesai': 'Pengajuan Contoh',
        }[route]) + ' · KSPPS Syirkah Kebaikan Indonesia';
    if (route === 'daftar' && state.registrationStep === 1) updateRegistrationKtpView();
    if (route === 'daftar' && state.registrationStep === 3) setupSignature();
    if (route === 'daftar' && state.registrationStep === 2) {
      updateSavingsForm($('#registration-form'));
      updateRegistrationProofView();
    }
    if (runtime.lastRoute !== route) {
      window.scrollTo(0, 0);
      runtime.lastRoute = route;
    }
    workflowService?.mount();
    reportsService?.mount();
  }

  const {
    esc,
    rupiah,
    paths,
    icon,
    logo,
    badge,
    navLink,
    demoStrip,
    field,
    selectField,
    review,
    heading,
    stat,
    activity,
    tabs,
  } = createMemberPresentation({});

  const {
    workflowItems,
    savingsEntries,
    shortDate,
    savingsState,
    savingsHistory,
    memberAlerts,
    serviceLocked,
    currentContracts,
    recentActivity,
  } = createMemberQueries({
    heading,
    rupiah,
    activity,
    esc,
  });

  const {
    registrationKtpInput,
    registrationKtpStatus,
    resetRegistrationKtp,
    updateRegistrationKtpView,
    selectRegistrationKtp,
    requireRegistrationKtp,
  } = createRegistrationIdentity({
    state,
    esc,
    runtime,
    $,
    registrationProofFileError: (...args) => registrationProofFileError(...args),
    saveRegistration: (...args) => saveRegistration(...args),
    render,
  });

  const {
    registrationProofInput,
    registrationProofStatus,
    updateRegistrationProofView,
    registrationProofFileError,
    selectRegistrationProof,
    requireRegistrationProof,
  } = createRegistrationProof({
    state,
    esc,
    icon,
    $,
    runtime,
    render,
  });

  const { specialFirst, registrationTotal, saveRegistration, updateSavingsForm, setupSignature } =
    createRegistrationForm({
      state,
      $,
      rupiah,
    });

  const { savingsRows, requestPanel, documentCards } = createMemberHistoryViews({
    savingsHistory,
    esc,
    rupiah,
    badge,
    state,
    icon,
    workflowItems,
    shortDate,
  });

  const {
    capitalDetail,
    dialog,
    closeDialog,
    proofInput,
    depositDialog,
    applicationDialog,
    download,
    fileValid,
  } = createMemberDialogs({
    currentContracts,
    badge,
    review,
    rupiah,
    workflowItems,
    icon,
    runtime,
    $,
    modal,
    field,
    selectField,
  });

  bindMemberInteractions({
    state,
    render,
    go,
    $,
    toast,
    saveRegistration,
    resetRegistrationKtp,
    updateRegistrationKtpView,
    runtime,
    updateRegistrationProofView,
    closeDialog,
    depositDialog,
    applicationDialog,
    capitalDetail,
    dialog,
    memberAlerts,
    savingsHistory,
    download,
    savingsRows,
    documentCards,
    updateSavingsForm,
    selectRegistrationKtp,
    selectRegistrationProof,
    modal,
  });

  bindMemberSubmissions({
    requireRegistrationKtp,
    state,
    requireRegistrationProof,
    go,
    dialog,
    icon,
    saveRegistration,
    $,
    render,
    toast,
    fileValid,
    closeDialog,
  });

  bindMemberProfileEvents({
    state,
    render,
    runtime,
    toast,
    resetRegistrationKtp,
    modal,
    go,
  });

  window.addEventListener('hashchange', render);

  render();
}
