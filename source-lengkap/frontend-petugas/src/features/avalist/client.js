/** API khusus pengelolaan avalist oleh petugas. */
export function createAvalistApi(request) {
  return async function avalistApi(path = '', body = null) {
    const form = body instanceof FormData;
    const r = await request('/api/workflow/avalist' + path, {
      method: body ? 'POST' : 'GET',
      credentials: 'same-origin',
      headers: {
        'X-KSPPS-Portal': 'staff',
        ...(!form ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: form ? body : JSON.stringify(body) } : {}),
    });
    const result = await r.json();
    if (!r.ok) throw new Error(result.error || 'Data avalist belum dapat diproses.');
    return result;
  };
}
