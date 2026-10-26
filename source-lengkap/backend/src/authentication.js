import { Problem } from './membership.js';

const unavailable = () => new Problem(503, 'Layanan akun belum tersedia. Coba lagi sebentar.');
const controlCharacters = /[\u0000-\u001f\u007f-\u009f]/;

function sessionIdentity(value) {
  if (
    !value ||
    Array.isArray(value) ||
    typeof value.id !== 'string' ||
    !value.id.trim() ||
    value.id.length > 200 ||
    controlCharacters.test(value.id) ||
    typeof value.name !== 'string' ||
    controlCharacters.test(value.name) ||
    typeof value.email !== 'string' ||
    value.email.length > 200 ||
    controlCharacters.test(value.email) ||
    typeof value.emailVerified !== 'boolean' ||
    (value.emailVerified && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))
  )
    throw unavailable();
  const email = value.emailVerified ? value.email : '';
  return { id: value.id, name: (value.name || email || 'Akun KSPPS').slice(0, 160), email };
}

/** Only the trusted server binding may turn session credentials into an identity. */
export async function resolveSession(request, env) {
  if (!env.AUTH || typeof env.AUTH.fetch !== 'function') return null;
  const headers = new Headers();
  for (const name of ['Cookie', 'Authorization']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  if (![...headers].length) return null;
  try {
    const response = await env.AUTH.fetch(
      new Request('https://auth.internal/session', { method: 'GET', headers }),
    );
    if (response.status === 401 || response.status === 403) return null;
    if (!response.ok) throw unavailable();
    return sessionIdentity(await response.json());
  } catch {
    throw unavailable();
  }
}
