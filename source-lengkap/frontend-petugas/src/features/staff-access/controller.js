import {
  EntryView,
  Entry2View,
  Entry3View,
  WhoView,
  Entry5View,
  Entry6View,
  Entry4View,
  Entry7View,
  Entry9View,
  Entry10View,
  Entry8View,
  AccountRowsView,
  AccountRows4View,
  AccountRows5View,
  AccountRows3View,
  AccountRows2View,
  AccountRows6View,
  AccountsView,
} from './views/controller.svelte';
import { createStaffAccessClient } from './client.js';
import { displayText } from '../../../../shared/lib/formatters.js';
import { view, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Akses akun petugas dan pergantian role yang diizinkan server.
 * Tampilan halaman berada di frontend-petugas/src/components/staff-access/.
 * Markup Svelte berada di views/; otorisasi dan aturan keuangan diperiksa server.
 */
/* Account permissions are issued by the server, never chosen by a new visitor. */
export function initializeStaffAccess(app) {
  'use strict';
  const esc = displayText;
  let token = new URLSearchParams(location.hash.slice(1)).get('setup') || '';
  if (token) history.replaceState(null, '', '#masuk');
  const state = app.state({
    loaded: false,
    loading: false,
    signedIn: false,
    staff: null,
    identity: null,
    request: null,
    configured: true,
    error: '',
    accounts: [],
    accountsLoaded: false,
    busy: false,
  });
  const names = { manager: 'Manajer', admin: 'Admin', finance: 'Finance', avalist: 'Avalist' };
  const announce = () => app.events.dispatchEvent(new CustomEvent('kspps-access-loaded'));
  const { api } = createStaffAccessClient(app.request);
  async function load() {
    if (state.loading) return;
    state.loading = true;
    state.error = '';
    try {
      const r = await api('access');
      Object.assign(state, r, { loaded: true, signedIn: true });
    } catch (e) {
      state.loaded = true;
      state.signedIn = false;
      if (e.status !== 401) state.error = e.message;
    } finally {
      state.loading = false;
      announce();
    }
  }
  function entry() {
    if (!state.loaded) return snippetView(EntryView);
    if (state.error) return snippetView(Entry2View, { error: esc(state.error) });
    if (!state.signedIn) {
      const target = '/petugas.html' + (token ? '#setup=' + encodeURIComponent(token) : '');
      return snippetView(Entry3View, { encodeURIComponent: encodeURIComponent(target) });
    }
    const who = snippetView(WhoView, {
      slice: esc((state.identity?.name || 'P').slice(0, 1)),
      fieldName: esc(state.identity?.name),
      email: esc(state.identity?.email),
    });
    if (state.staff?.accountRole)
      return [
        who,
        snippetView(Entry4View, {
          allowedRolesRowsRows: state.staff.allowedRoles
            .filter((r) => r !== 'avalist')
            .map((r, i) =>
              snippetView(Entry5View, { iContent: i ? 'secondary ' : '', r: r, rValue: names[r] }),
            ),
          includesContent: state.staff.allowedRoles.includes('avalist')
            ? snippetView(Entry6View)
            : '',
          accountRole: names[state.staff.accountRole],
        }),
      ];
    if (token && !state.configured) return [who, snippetView(Entry7View)];
    return [
      who,
      snippetView(Entry8View, {
        requestContent: state.request
          ? snippetView(Entry9View, {
              statusContent:
                state.request.status === 'revoked'
                  ? 'Akses telah dicabut. Hubungi Manajer.'
                  : 'Permintaan akses sudah dikirim. Sampaikan kode berikut kepada Manajer.',
              code: esc(state.request.code),
            })
          : snippetView(Entry10View),
      }),
    ];
  }

  function accountRows() {
    if (!state.accountsLoaded) return snippetView(AccountRowsView);
    return state.accounts.length
      ? snippetView(AccountRows2View, {
          accountsRows: state.accounts.map((x) =>
            snippetView(AccountRows3View, {
              fieldName: esc(x.name),
              email: esc(x.email),
              code: esc(x.code),
              role: names[x.role] || (x.status === 'revoked' ? 'Dicabut' : 'Menunggu persetujuan'),
              Rows: ['admin', 'finance', 'avalist'].map((r) =>
                snippetView(AccountRows4View, {
                  code: esc(x.code),
                  r: r,
                  roleContent: x.role === r ? { disabled: true } : {},
                  rValue: names[r],
                }),
              ),
              roleContent: x.role ? snippetView(AccountRows5View, { code: esc(x.code) }) : '',
            }),
          ),
        })
      : snippetView(AccountRows6View);
  }
  async function accounts() {
    const el = document.querySelector('#staff-account-list');
    try {
      state.accounts = (await api('accounts')).accounts;
      state.accountsLoaded = true;
      if (el) app.ui.render(el, accountRows());
    } catch (e) {
      if (el) app.ui.render(el, snippetView(AccountsView, { message: esc(e.message) }));
    }
  }
  function mount() {
    if (location.hash === '#manager-akses' && !state.accountsLoaded) void accounts();
  }
  app.scope.listen(document, 'click', async (e) => {
    const b = e.target.closest('[data-access-action]');
    if (!b || state.busy) return;
    const action = b.dataset.accessAction;
    if (action === 'refresh') {
      void load();
      return;
    }
    if (action === 'accounts') {
      void accounts();
      return;
    }
    state.busy = true;
    b.disabled = true;
    try {
      if (action === 'activate') {
        await api('activate', { token, confirm: true });
        token = '';
        await load();
      }
      if (action === 'request') {
        await api('access-request', {});
        await load();
      }
      if (action === 'grant') {
        await api('accounts', { code: b.dataset.code, role: b.dataset.role });
        await accounts();
      }
    } catch (error) {
      const el = document.querySelector('#staff-access-error');
      if (el) {
        el.hidden = false;
        el.textContent = error.message;
      } else {
        const toast = document.querySelector('#toast');
        if (toast) {
          toast.hidden = false;
          toast.textContent = error.message;
        }
      }
    } finally {
      state.busy = false;
      if (b.isConnected) b.disabled = false;
    }
  });
  app.services.staffAccess = {
    state,
    getViewContext: () => ({ accountRows, accounts }),
    entry,
    load,
    mount,
  };
  return app.services.staffAccess;
}
