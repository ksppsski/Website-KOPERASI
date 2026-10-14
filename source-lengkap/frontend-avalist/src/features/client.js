export function createAvalistClient(request) {
  async function get(path) {
    const r = await request('/api/workflow/avalist' + path, {
      credentials: 'same-origin',
      headers: { 'X-KSPPS-Portal': 'avalist' },
    });
    const result = await r.json();
    if (!r.ok)
      throw Object.assign(new Error(result.error || 'Data belum dapat dimuat.'), {
        status: r.status,
      });
    return result;
  }
  return { get };
}
