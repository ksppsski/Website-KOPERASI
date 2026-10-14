/** Synchronizes workflow state; the HTTP client never renders or publishes events. */
export function createWorkflowCoordinator({
  app,
  state,
  api,
  mount,
  scheduleOfferExpiry,
  ensureReady,
  notice,
}) {
  async function refresh() {
    if (state.loading) return;
    state.loading = true;
    state.error = '';
    mount();
    try {
      const data = await api();
      state.withdrawal = data.withdrawal || null;
      state.financing = data.financing || [];
      state.offers = data.offers || [];
      state.items = data.items;
      state.profile = data.profile;
      state.staff = data.staff || { role: null, accountRole: null, allowedRoles: [] };
      state.members = data.members || [];
      state.profiles = data.profiles || [];
      state.unauthorized = false;
      state.loaded = true;
      app.events.dispatchEvent(new CustomEvent('kspps-profile-loaded', { detail: state.profile }));
    } catch (error) {
      state.error = error.message;
    } finally {
      state.loading = false;
      mount();
      scheduleOfferExpiry();
    }
  }

  async function saveRegistration(data, proof, id, version, ktp) {
    if (!(await ensureReady()))
      throw new Error('Masuk dengan ChatGPT sebelum menyimpan pendaftaran.');
    const form = new FormData();
    form.set('id', id);
    form.set('version', String(version || 0));
    const { signatureImage, ...fields } = data;
    form.set('data', JSON.stringify(fields));
    form.set('proof', proof);
    form.set('ktp', ktp);
    const blob = await (await app.request(data.signatureImage)).blob();
    form.set('signature', blob, 'tanda-tangan.png');
    const r = await api('/profile', { method: 'POST', body: form });
    state.profile = r.profile;
    app.events.dispatchEvent(new CustomEvent('kspps-profile-loaded', { detail: state.profile }));
    mount();
    return r.profile;
  }

  async function setStaffRole(role) {
    if (!(await ensureReady())) return false;
    try {
      const result = await api('/staff/role', { method: 'POST', body: JSON.stringify({ role }) });
      state.staff = result.staff;
      await refresh();
      app.events.dispatchEvent(
        new CustomEvent('kspps-staff-role-changed', { detail: state.staff }),
      );
      return true;
    } catch (error) {
      notice(error.message);
      return false;
    }
  }
  return { refresh, saveRegistration, setStaffRole };
}
