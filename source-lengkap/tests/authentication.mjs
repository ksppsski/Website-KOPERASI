import assert from 'node:assert/strict';
import { resolveSession } from '../backend/src/authentication.js';
import worker from '../backend/src/index.js';

const account = {
  id: 'stable-account-1',
  name: 'Anggota Satu',
  email: 'anggota@example.test',
  emailVerified: true,
};
const request = (headers = {}) =>
  new Request('https://kspps.test/api/workflow/avalist/access', { headers });
const sessionRequest = request({ Cookie: 'kspps-session=opaque' });
const binding = (value = account, status = 200) => ({
  AUTH: { fetch: async () => Response.json(value, { status }) },
});
const forged = {
  Cookie: 'kspps-session=forged',
  Authorization: 'Bearer forged',
  'oai-authenticated-user-id': 'manager',
  'oai-authenticated-user-email': 'manager@example.test',
  'oai-authenticated-user-full-name': 'Manajer',
  'x-kspps-user-id': 'manager',
  'x-kspps-role': 'manager',
  'x-kspps-portal': 'staff',
  'x-kspps-member': 'another-member',
};

assert.equal(await resolveSession(request(forged), {}), null);
assert.equal(await resolveSession(sessionRequest, { AUTH: {} }), null);
assert.equal(await resolveSession(request(), binding()), null);
let calls = 0;
assert.equal(
  await resolveSession(request({ 'oai-authenticated-user-id': 'manager' }), {
    AUTH: {
      fetch() {
        calls++;
        return Response.json(account);
      },
    },
  }),
  null,
);
assert.equal(calls, 0, 'Identity headers cannot initiate a session verification');
for (const status of [401, 403])
  assert.equal(await resolveSession(sessionRequest, binding(null, status)), null);

const verified = await resolveSession(request(forged), {
  AUTH: {
    async fetch(authRequest) {
      assert.equal(authRequest.url, 'https://auth.internal/session');
      assert.equal(authRequest.method, 'GET');
      assert.deepEqual([...authRequest.headers.keys()], ['authorization', 'cookie']);
      assert.equal(authRequest.headers.get('Cookie'), forged.Cookie);
      assert.equal(authRequest.headers.get('Authorization'), forged.Authorization);
      assert.equal(await authRequest.text(), '');
      return Response.json(account);
    },
  },
});
assert.deepEqual(verified, { id: account.id, name: account.name, email: account.email });
assert.deepEqual(
  await resolveSession(sessionRequest, binding({ ...account, emailVerified: false })),
  {
    id: account.id,
    name: account.name,
    email: '',
  },
);
const longName = 'Nama '.repeat(50);
assert.equal(
  (await resolveSession(sessionRequest, binding({ ...account, name: longName }))).name,
  longName.slice(0, 160),
);
assert.equal(
  (await resolveSession(sessionRequest, binding({ ...account, id: 'z'.repeat(200) }))).id.length,
  200,
);

const unavailable = (error) => error.status === 503;
for (const value of [
  null,
  [],
  {},
  ...['', '   ', 'x'.repeat(201), 'user\u0000', 'user\u007f', 'user\u009f'].map((id) => ({
    ...account,
    id,
  })),
  { ...account, id: 1 },
  { ...account, name: null },
  { ...account, name: 'Name\nInjected' },
  { ...account, email: null },
  { ...account, email: 'a'.repeat(201) },
  { ...account, email: 'someone@example.test\nInjected' },
  { ...account, email: 'unverified-address' },
  { ...account, emailVerified: 'true' },
  { ...account, emailVerified: undefined },
])
  await assert.rejects(resolveSession(sessionRequest, binding(value)), unavailable);
for (const AUTH of [
  { fetch: async () => Response.json({}, { status: 500 }) },
  { fetch: async () => new Response('invalid json') },
  { fetch: async () => undefined },
  {
    fetch: async () => {
      throw new Error('Authentication service disconnected');
    },
  },
])
  await assert.rejects(resolveSession(sessionRequest, { AUTH }), unavailable);

const queries = [];
const environment = {
  DB: {
    prepare(sql) {
      queries.push(sql);
      return {
        bind() {
          return {
            first: async () =>
              sql.includes('maintenance_tasks') ? { id: 'already-complete' } : null,
          };
        },
      };
    },
  },
  BUCKET: {},
};
for (const headers of [{}, forged]) {
  queries.length = 0;
  const response = await worker.fetch(request(headers), environment);
  assert.equal(response.status, 401, 'No binding means no authenticated private API access');
  assert.equal((await response.json()).signInRequired, true);
  assert(queries.every((sql) => sql.includes('maintenance_tasks')));
}
for (const status of [401, 403])
  assert.equal(
    (await worker.fetch(sessionRequest, { ...environment, ...binding(null, status) })).status,
    401,
    'Expired and revoked sessions are rejected before private data is read',
  );
const response = await worker.fetch(request(forged), { ...environment, ...binding() });
assert.equal(response.status, 200);
assert.deepEqual(await response.json(), {
  identity: { name: account.name, email: account.email },
  allowed: false,
});
const unverified = await worker.fetch(sessionRequest, {
  ...environment,
  ...binding({ ...account, emailVerified: false }),
});
assert.equal(unverified.status, 200);
assert.equal((await unverified.json()).identity.email, '');
const invalidOrigin = new Request('https://kspps.test/api/workflow/staff/role', {
  method: 'POST',
  headers: { Cookie: 'kspps-session=opaque', Origin: 'https://other.test' },
  body: JSON.stringify({ role: 'manager' }),
});
assert.equal((await worker.fetch(invalidOrigin, { ...environment, ...binding() })).status, 403);
assert.equal(
  (await worker.fetch(sessionRequest, { ...environment, ...binding({ id: 'incomplete' }) })).status,
  503,
);
console.log(
  'PASS: trusted session binding, legacy identity headers rejected, verified email, credential-only forwarding, origin and fail-closed authentication.',
);
