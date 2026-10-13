/**
 * Akses API workflow, pemilihan anggota, dan sinkronisasi data server.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWorkflowClient({
  staff,
  state,
  mount,
  scheduleOfferExpiry,
  ensureReady,
  notice,
}) {
  async function api(path = '', options = {}) {
    const memberId = staff
      ? options.memberId ||
        state.items.find((x) => path.startsWith('/' + x.id + '/'))?.memberProfileId ||
        ''
      : '';
    const response = await fetch('/api/workflow' + path, {
      ...options,
      credentials: 'same-origin',
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(staff
          ? { 'X-KSPPS-Portal': 'staff', ...(memberId ? { 'X-KSPPS-Member': memberId } : {}) }
          : {}),
        ...options.headers,
      },
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('Layanan pengajuan belum tersedia. Silakan coba lagi.');
    }
    if (!response.ok) {
      if (response.status === 401) {
        state.unauthorized = true;
        mount();
      }
      const error = new Error(data.error || 'Pengajuan belum dapat diproses.');
      error.status = response.status;
      throw error;
    }
    return scopedFiles(data, memberId);
  }

  function scopedFiles(value, id) {
    if (!staff || !id) return value;
    if (Array.isArray(value)) return value.map((v) => scopedFiles(v, id));
    if (value && typeof value === 'object')
      return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, scopedFiles(v, id)]));
    if (
      typeof value === 'string' &&
      value.startsWith('/api/workflow/') &&
      !value.includes('/reports/') &&
      !value.includes('/member/')
    )
      return value.replace(
        '/api/workflow/',
        '/api/workflow/member/' + encodeURIComponent(id) + '/',
      );
    return value;
  }

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
      window.dispatchEvent(new CustomEvent('kspps-profile-loaded', { detail: state.profile }));
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
    const blob = await (await fetch(data.signatureImage)).blob();
    form.set('signature', blob, 'tanda-tangan.png');
    const r = await api('/profile', { method: 'POST', body: form });
    state.profile = r.profile;
    window.dispatchEvent(new CustomEvent('kspps-profile-loaded', { detail: state.profile }));
    mount();
    return r.profile;
  }

  async function setStaffRole(role) {
    if (!(await ensureReady())) return false;
    try {
      const result = await api('/staff/role', { method: 'POST', body: JSON.stringify({ role }) });
      state.staff = result.staff;
      await refresh();
      window.dispatchEvent(new CustomEvent('kspps-staff-role-changed', { detail: state.staff }));
      return true;
    } catch (error) {
      notice(error.message);
      return false;
    }
  }
  return { api, scopedFiles, refresh, saveRegistration, setStaffRole };
}
