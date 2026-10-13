import { workflowService } from '../../../../shared/services/workflow.js';
/**
 * Interaksi petugas dan penyegaran halaman saat data fitur berubah.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function bindStaffEvents({
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
}) {
  document.addEventListener('click', async (event) => {
    const b = event.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action,
      id = b.dataset.id;
    if (a === 'enter') {
      b.disabled = true;
      const requested = b.dataset.role || 'admin';
      if (await workflowService.setStaffRole(requested)) {
        runtime.state.signedIn = true;
        go(homeFor(requested));
      }
      if (b.isConnected) b.disabled = false;
    }
    if (a === 'logout') {
      runtime.state = seed();
      go('masuk');
      toast('Anda keluar dari tampilan petugas.');
    }
    if (a === 'close') closeDialog();
    if (a === 'candidate') candidateDialog(id);
    if (a === 'deposit') depositDialog(id);
    if (a === 'request') requestDialog(id);
    if (a === 'member') memberDialog(id);
    if (a === 'draft') draftDialog(id);
    if (a === 'contract') contractDialog(id);
    if (a === 'open-menu') {
      $('#staff-sidebar').classList.add('open');
      $('.mobile-scrim').classList.add('show');
      b.setAttribute('aria-expanded', 'true');
    }
    if (a === 'close-menu') {
      $('#staff-sidebar').classList.remove('open');
      $('.mobile-scrim').classList.remove('show');
      $('[data-action="open-menu"]')?.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('change', async (event) => {
    if (event.target.id === 'staff-role') {
      const select = event.target;
      select.disabled = true;
      if (!(await workflowService.setStaffRole(select.value))) {
        select.value = activeRole();
        select.disabled = false;
      }
      return;
    }
    if (event.target.id === 'staff-filter') {
      runtime.state.filter = event.target.value;
      refreshTable();
    }
  });

  document.addEventListener('submit', (event) => {
    const f = event.target;
    if (!(f instanceof HTMLFormElement)) return;
    event.preventDefault();
    const data = Object.fromEntries(new FormData(f));
    if (f.id === 'decision-form') {
      const action = event.submitter?.value || 'approve';
      if (action === 'approve' && !f.checkValidity()) {
        f.reportValidity();
        return;
      }
      const result = decide(f.dataset.kind, f.dataset.id, action, data);
      if (!result.ok) {
        const el = $('#decision-error');
        el.textContent = result.error;
        el.hidden = false;
        return;
      }
      closeDialog();
      render();
      toast(result.message);
    }
    if (f.id === 'draft-form') {
      if (!f.checkValidity()) {
        f.reportValidity();
        return;
      }
      if (makeDraft(f.dataset.id, data.finalCheck)) {
        closeDialog();
        go('akad');
        toast('Draf akad contoh dibuat.');
      } else {
        const el = $('#decision-error');
        el.textContent = 'Periksa persetujuan pengajuan dan verifikasi dana.';
        el.hidden = false;
      }
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && $('#staff-sidebar')?.classList.contains('open'))
      $('[data-action="close-menu"]').click();
  });

  modal.addEventListener('click', (event) => {
    if (event.target === modal) {
      const r = modal.getBoundingClientRect();
      if (
        event.clientX < r.left ||
        event.clientX > r.right ||
        event.clientY < r.top ||
        event.clientY > r.bottom
      )
        closeDialog();
    }
  });

  modal.addEventListener('close', () => {
    if (runtime.lastFocus?.isConnected) runtime.lastFocus.focus();
  });

  window.addEventListener('kspps-profile-loaded', () => {
    if (runtime.state.signedIn) render();
  });

  window.addEventListener('kspps-staff-role-changed', () => {
    if (runtime.state.signedIn) go(homeFor(activeRole()));
  });

  window.addEventListener('kspps-finance-loaded', () => {
    if (runtime.state.signedIn && activeRole() === 'finance') render();
  });

  window.addEventListener('kspps-activity-loaded', () => {
    if (runtime.state.signedIn && ['#waktu-kerja', '#finance-ringkasan'].includes(location.hash))
      render();
  });

  window.addEventListener('kspps-access-loaded', () => {
    if (!runtime.state.signedIn) render();
  });

  window.addEventListener('kspps-maturity-loaded', () => {
    if (
      runtime.state.signedIn &&
      ['#finance-pengembalian', '#manager-jatuh-tempo'].includes(location.hash)
    )
      render();
  });

  window.addEventListener('kspps-withdrawal-loaded', render);
}
