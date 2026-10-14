export function createStaffAccessClient(request) {
  async function api(path, body) {
    const r = await request('/api/workflow/staff/' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const data = await r.json();
    if (!r.ok) {
      const e = new Error(data.error || 'Akses belum dapat diproses.');
      e.status = r.status;
      throw e;
    }
    return data;
  }
  return { api };
}
