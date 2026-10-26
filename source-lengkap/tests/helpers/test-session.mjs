/** Test-only service binding. Its identity is selected by the test, never by a request header. */
export function withTestSession(env, identity) {
  const account =
    typeof identity === 'string'
      ? { id: identity, name: identity, email: '', emailVerified: false }
      : identity;
  return {
    ...env,
    AUTH: {
      async fetch(request) {
        if (request.headers.get('Cookie') !== 'kspps-test-session=opaque' || !account?.id)
          return new Response(null, { status: 401 });
        return Response.json({ name: '', email: '', emailVerified: false, ...account });
      },
    },
  };
}

export const testSessionCookie = 'kspps-test-session=opaque';
