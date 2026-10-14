/** Transport only: request headers, error decoding and member-owned file URLs. */
export function createWorkflowClient({ staff, request, memberForPath }) {
  async function api(path = '', options = {}) {
    const { memberId: explicitMember, ...init } = options;
    const memberId = staff ? explicitMember || memberForPath(path) || '' : '';
    const response = await request('/api/workflow' + path, {
      ...init,
      credentials: 'same-origin',
      headers: {
        ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(staff ? { 'X-KSPPS-Portal': 'staff' } : {}),
        ...(memberId ? { 'X-KSPPS-Member': memberId } : {}),
        ...init.headers,
      },
    });
    let data;
    try {
      data = await response.json();
    } catch {
      throw new Error('Layanan pengajuan belum tersedia. Silakan coba lagi.');
    }
    if (!response.ok) {
      const error = new Error(data.error || 'Pengajuan belum dapat diproses.');
      error.status = response.status;
      throw error;
    }
    return scopedFiles(data, memberId);
  }

  function scopedFiles(value, memberId) {
    if (!staff || !memberId) return value;
    if (Array.isArray(value)) return value.map((entry) => scopedFiles(entry, memberId));
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).map(([key, entry]) => [key, scopedFiles(entry, memberId)]),
      );
    }
    if (
      typeof value === 'string' &&
      value.startsWith('/api/workflow/') &&
      !value.includes('/reports/') &&
      !value.includes('/member/')
    ) {
      return value.replace(
        '/api/workflow/',
        '/api/workflow/member/' + encodeURIComponent(memberId) + '/',
      );
    }
    return value;
  }
  return { api, scopedFiles };
}
