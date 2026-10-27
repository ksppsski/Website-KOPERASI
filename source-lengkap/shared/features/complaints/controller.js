/** One mounted complaint panel owns its requests, selection, and feedback. */
export function createComplaintsController(app, { staff = false } = {}) {
  const state = app.state({
    loading: false,
    busy: false,
    error: '',
    message: '',
    items: [],
    assignees: [],
    canManage: false,
    detail: null,
  });
  let disposed = false;
  let listGeneration = 0;
  let detailGeneration = 0;
  let accessGeneration = 0;
  let createId = crypto.randomUUID();
  const suffix = staff ? '?view=staff' : '';

  async function api(path = '', body) {
    const headers = { 'x-kspps-portal': staff ? 'staff' : 'member' };
    const options = { method: body === undefined ? 'GET' : 'POST', headers };
    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }
    const response = await app.request('/api/workflow/complaints' + path + suffix, options);
    const data = await response.json();
    if (!response.ok) {
      const error = new Error(data.error || 'Keluhan belum dapat dimuat. Coba lagi.');
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function fail(error) {
    if (disposed) return;
    state.error = error.message || 'Keluhan belum dapat diproses. Coba lagi.';
    if ([401, 403].includes(error.status)) {
      accessGeneration++;
      listGeneration++;
      detailGeneration++;
      state.loading = false;
      state.items = [];
      state.assignees = [];
      state.detail = null;
      state.canManage = false;
    }
  }

  async function load(refreshDetail = true) {
    const generation = ++listGeneration;
    if (disposed) return false;
    state.loading = true;
    state.error = '';
    try {
      const data = await api();
      if (disposed || generation !== listGeneration) return false;
      state.items = data.items || [];
      state.assignees = data.assignees || [];
      state.canManage = data.canManage === true;
      if (refreshDetail && state.detail) return await open(state.detail.item.id, false);
      return true;
    } catch (error) {
      if (generation === listGeneration) fail(error);
      return false;
    } finally {
      if (!disposed && generation === listGeneration) state.loading = false;
    }
  }

  async function open(id, clearMessage = true) {
    const generation = ++detailGeneration;
    if (disposed) return false;
    state.loading = true;
    state.error = '';
    if (clearMessage) {
      state.message = '';
      state.detail = null;
    }
    try {
      const detail = await api('/' + encodeURIComponent(id));
      if (disposed || generation !== detailGeneration) return false;
      state.detail = detail;
      return true;
    } catch (error) {
      if (generation === detailGeneration) fail(error);
      return false;
    } finally {
      if (!disposed && generation === detailGeneration) state.loading = false;
    }
  }

  async function write(path, body, success, creating = false) {
    if (disposed || state.busy) return false;
    const access = accessGeneration;
    state.busy = true;
    state.error = '';
    state.message = '';
    try {
      const result = await api(path, body);
      if (disposed || access !== accessGeneration) return false;
      state.message = success;
      if (creating) createId = crypto.randomUUID();
      const id = result.item.id;
      // Show the saved number/status even when the next read loses its connection.
      state.items = [result.item, ...state.items.filter((item) => item.id !== id)];
      state.detail = result.events
        ? result
        : {
            item: result.item,
            events: state.detail?.item.id === id ? state.detail.events : [],
            canManage: false,
            canReply: false,
            canResolve: false,
            canClose: false,
          };
      await load(false);
      if (!disposed && access === accessGeneration) await open(id, false);
      return true;
    } catch (error) {
      fail(error);
      return false;
    } finally {
      if (!disposed) state.busy = false;
    }
  }

  function closeDetail() {
    if (state.busy) return;
    detailGeneration++;
    state.detail = null;
    state.message = '';
    state.error = '';
    state.loading = false;
  }

  function dispose() {
    disposed = true;
    listGeneration++;
    detailGeneration++;
  }
  const release = app.scope.add(dispose);
  const itemPath = () => '/' + encodeURIComponent(state.detail?.item.id || '');
  return {
    state,
    load: () => load(),
    open,
    closeDetail,
    dispose: release,
    create: (body) => write('', { ...body, id: body.id || createId }, 'Keluhan terkirim.', true),
    assign: (body) => write(itemPath() + '/assign', body, 'Penugasan tersimpan.'),
    reply: (body) => write(itemPath() + '/reply', body, 'Tanggapan terkirim.'),
    changeStatus: (body) =>
      write(
        itemPath() + '/status',
        body,
        body.status === 'closed'
          ? 'Kasus ditutup.'
          : body.status === 'resolved'
            ? 'Keluhan ditandai selesai.'
            : 'Status keluhan diperbarui.',
      ),
  };
}
