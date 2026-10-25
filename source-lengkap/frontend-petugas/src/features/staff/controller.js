import { createStaffPresentation } from './presentation.js';
import { createStaffNavigation } from './navigation.js';
import { createStaffQueries } from './queries.js';
import { createStaffTables } from './tables.js';
import { createStaffDialogs } from './dialogs.js';
import { createStaffDemoDecisions } from './demo-decisions.js';
import { bindStaffEvents } from './events.js';

/**
 * Inisialisasi staff: state, perakitan modul, dan lifecycle halaman.
 * Tampilan, formulir, dan handler berada pada file yang disebut di import.
 */
export function initializeStaffPortal(app) {
  const renderView = app.render;

  const $ = (s, root = document) => root.querySelector(s);

  const modal = $('#portal-dialog');

  function seed() {
    return {
      signedIn: false,
      query: '',
      filter: '',
      candidates: [],
      members: [],
      deposits: [],
      requests: [],
      contracts: [],
      logs: [],
    };
  }

  const runtime = {
    state: seed(),
    lastRoute: '',
    lastFocus: undefined,
    toastTimer: undefined,
  };

  function toast(text) {
    const el = $('#toast');
    clearTimeout(runtime.toastTimer);
    el.textContent = text;
    el.hidden = false;
    runtime.toastTimer = app.scope.timeout(() => (el.hidden = true), 4500);
  }

  function go(route) {
    if (location.hash.slice(1) === route) render();
    else location.hash = route;
  }

  function log(text) {
    runtime.state.logs.unshift({ text, time: 'Baru saja · Petugas KSPPS' });
  }

  function render() {
    let route = location.hash.slice(1) || 'masuk';
    if (Object.hasOwn(avalistPages, route)) {
      location.replace('/avalist.html#' + route);
      return;
    }
    if (!runtime.state.signedIn || !app.services.workflow?.getStaff()?.accountRole) {
      runtime.state.signedIn = false;
      route = 'masuk';
    } else if (!menuPages()[route]) route = homeFor(activeRole());
    if (Object.hasOwn(avalistPages, route)) {
      location.replace('/avalist.html#' + route);
      return;
    }
    if (location.hash !== '#' + route) history.replaceState(null, '', '#' + route);
    if (route !== runtime.lastRoute) {
      runtime.state.query = '';
      runtime.state.filter = '';
      window.scrollTo(0, 0);
    }
    if (modal.open && runtime.lastRoute !== route) modal.close();
    renderView({
      role: 'staff',
      route,
      context: {
        esc,
        icon,
        badge,
        name,
        dateLabel,
        reviewButton,
        activityLogs,
        pending,
        heading,
        table,
        queueRows,
        workflowItems,
        toolbar,
        depositsTable,
        candidatesTable,
        membersTable,
        pages,
        activeRole,
        menuPages,
        roleName,
        rolePicker,
        member,
        button,
        state: runtime.state,
        render,
      },
    });
    document.title = (pages[route]?.[0] || 'Masuk') + ' · Portal Petugas KSPPS';
    runtime.lastRoute = route;
    app.services.workflow?.mount();
    app.services.finance?.mount();
    app.services.activity?.mount();
    app.services.reports?.mount();
    app.services.staffAccess?.mount();
    app.services.maturity?.mount();
    app.services.withdrawal?.mount();
  }

  function refreshTable() {
    const fn = tables[location.hash.slice(1)];
    if (fn && $('#staff-table')) app.ui.render($('#staff-table'), fn());
  }

  const {
    esc,
    rupiah,
    paths,
    icon,
    logo,
    badge,
    heading,
    review,
    button,
    filtered,
    toolbar,
    table,
    checks,
    statusHead,
  } = createStaffPresentation({ app, runtime });

  const {
    adminPages,
    financePages,
    managerPages,
    avalistPages,
    pages,
    activeRole,
    menuPages,
    roleName,
    homeFor,
    rolePicker,
  } = createStaffNavigation({ app });

  const {
    member,
    name,
    workflowItems,
    allProfiles,
    dateLabel,
    reviewButton,
    candidateRows,
    activityLogs,
    pending,
    canDraft,
  } = createStaffQueries({ app, runtime, esc, icon });

  const { queueRows, candidatesTable, depositsTable, requestsTable, membersTable, tables } =
    createStaffTables({
      app,
      candidateRows,
      workflowItems,
      table,
      filtered,
      esc,
      rupiah,
      badge,
      reviewButton,
      allProfiles,
      runtime,
      name,
      button,
    });

  const {
    dialog,
    closeDialog,
    decisionForm,
    candidateDialog,
    depositDialog,
    requestDialog,
    memberDialog,
    draftDialog,
    contractDialog,
  } = createStaffDialogs({
    app,
    runtime,
    $,
    icon,
    modal,
    checks,
    statusHead,
    review,
    rupiah,
    esc,
    name,
    member,
    canDraft,
    toast,
    logo,
  });

  const { decide, makeDraft } = createStaffDemoDecisions({
    app,
    runtime,
    log,
    member,
    rupiah,
    canDraft,
  });

  bindStaffEvents({
    app,
    runtime,
    go,
    homeFor,
    seed,
    toast,
    closeDialog,
    candidateDialog,
    depositDialog,
    requestDialog,
    memberDialog,
    draftDialog,
    contractDialog,
    $,
    activeRole,
    refreshTable,
    decide,
    render,
    makeDraft,
    modal,
  });

  app.scope.listen(window, 'hashchange', render);

  render();

  void app.services.staffAccess?.load();
}
