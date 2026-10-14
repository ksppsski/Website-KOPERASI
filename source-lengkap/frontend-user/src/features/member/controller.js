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
export function initializeMemberPortal(app) {
  const renderView = app.render;

  const $ = (s, root = document) => root.querySelector(s);

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
    runtime.toastTimer = app.scope.timeout(() => (t.hidden = true), 4500);
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
    else disposeSignature();
    if (route === 'daftar' && state.registrationStep === 2) {
      updateSavingsForm($('#registration-form'));
      updateRegistrationProofView();
    }
    if (runtime.lastRoute !== route) {
      window.scrollTo(0, 0);
      runtime.lastRoute = route;
    }
    app.services.workflow?.mount();
    app.services.reports?.mount();
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
  } = createMemberPresentation({ app });

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
  } = createMemberQueries({ app, heading, rupiah, activity, esc });

  const {
    registrationKtpInput,
    registrationKtpStatus,
    resetRegistrationKtp,
    updateRegistrationKtpView,
    selectRegistrationKtp,
    requireRegistrationKtp,
  } = createRegistrationIdentity({
    app,
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
  } = createRegistrationProof({ app, state, esc, icon, $, runtime, render });

  const {
    specialFirst,
    registrationTotal,
    saveRegistration,
    updateSavingsForm,
    setupSignature,
    disposeSignature,
  } = createRegistrationForm({ app, state, $, rupiah });

  const { savingsRows, requestPanel, documentCards } = createMemberHistoryViews({
    app,
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
    app,
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
    app,
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
    app,
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

  bindMemberProfileEvents({ app, state, render, runtime, toast, resetRegistrationKtp, modal, go });

  app.scope.listen(window, 'hashchange', render);

  render();
}
