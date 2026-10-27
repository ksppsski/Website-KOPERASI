import { witaDate } from '../lib/formatters.js';

export const previewMessage =
  'Penyimpanan, unggahan, dan layanan akun tidak tersedia pada alamat ini. Tidak ada data yang dikirim.';

/** Empty, in-memory read models. This adapter never makes a network request. */
export function createPreviewTransport(portal = 'member') {
  let selectedRole = 'manager';
  const staff = () =>
    portal === 'staff'
      ? {
          role: selectedRole,
          accountRole: 'manager',
          allowedRoles: ['manager', 'admin', 'finance'],
          concept: true,
        }
      : { role: null, accountRole: null, allowedRoles: [], concept: true };
  const reply = (data, status = 200) => ({
    ok: status < 400,
    status,
    json: async () => JSON.parse(JSON.stringify(data)),
  });
  return async function previewRequest(input, options = {}) {
    const url = new URL(input, 'https://preview.invalid');
    const path = url.pathname.replace(/^\/api\/workflow/, '') || '/';
    const method = (options.method || 'GET').toUpperCase();
    const today = witaDate();
    // This selects a drawing of a role, never an authenticated account or permission.
    if (path === '/staff/role' && method === 'POST' && portal === 'staff') {
      const role = JSON.parse(options.body || '{}').role;
      if (!['manager', 'admin', 'finance'].includes(role))
        return reply({ error: previewMessage }, 403);
      selectedRole = role;
      return reply({ staff: staff() });
    }
    if (method !== 'GET') return reply({ error: previewMessage }, 503);
    const emptyTotal = { amount: 0, count: 0, memberCount: 0 };
    switch (path) {
      case '/':
        return reply({
          profile: null,
          items: [],
          offers: [],
          members: [],
          profiles: [],
          financing: [],
          withdrawal: null,
          staff: staff(),
        });
      case '/staff/access':
        return reply({
          staff: staff(),
          identity: { name: 'Petugas KSPPS', email: '' },
          configured: true,
        });
      case '/staff/accounts':
        return reply({ accounts: [] });
      case '/complaints':
        return reply({
          items: [],
          assignees: [],
          canManage: portal === 'staff' && selectedRole !== 'finance',
        });
      case '/reports':
        return reply({ reports: [] });
      case '/offers':
        return reply({ offers: [] });
      case '/staff/tasks':
        return reply({ tasks: [] });
      case '/staff/activity':
        return reply({ tasks: [], range: { from: today.slice(0, 7) + '-01', to: today } });
      case '/finance/reconciliations':
        return reply({ items: [] });
      case '/finance/payouts':
        return reply({
          date: url.searchParams.get('date') || today,
          total: 0,
          memberCount: 0,
          transferCount: 0,
          contractCount: 0,
          members: [],
          missingAccountCount: 0,
          referenceDates: [],
          task: null,
        });
      case '/finance/returns':
        return reply({ items: [], today, totalDue: 0, totalScheduled: 0 });
      case '/maturity/report':
        return reply({
          items: [],
          from: today.slice(0, 7) + '-01',
          to: today,
          total: emptyTotal,
          extended: emptyTotal,
          returned: emptyTotal,
          pending: emptyTotal,
        });
      case '/finance/withdrawals':
      case '/manager/withdrawals':
      case '/staff/financing':
        return reply({ items: [], today });
      case '/avalist/access':
        return reply({ allowed: true, identity: { name: 'Avalist', email: '' } });
      case '/avalist':
        return reply(
          url.searchParams.get('view') === 'personal'
            ? {
                personal: true,
                today,
                person: { name: 'Avalist', email: '', active: true },
                feeSummary: {
                  asOf: today,
                  total: 0,
                  paid: 0,
                  pending: 0,
                  scheduledDue: 0,
                  pendingAdjustments: 0,
                },
                monthlyFees: [],
                members: [],
                items: [],
                history: [],
              }
            : {
                people: [],
                members: [],
                contracts: [],
                events: [],
                totals: [],
                proposals: [],
                assignments: [],
                items: [],
                history: [],
                today,
                date: url.searchParams.get('date') || today,
                summary: { total: 0, paid: 0, pending: 0 },
              },
        );
      default:
        return reply({ error: previewMessage }, 503);
    }
  };
}
