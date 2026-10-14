import { ShowView, EnsureReadyView } from './views/dialog-runtime.svelte';
import { auth, esc, action } from './presentation.js';
import { view, snippetView } from '../../runtime/view.js';

/**
 * Lifecycle dialog, status sibuk, penanganan error, dan hasil perubahan.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWorkflowDialogRuntime({
  app,
  runtime,
  $,
  state,
  refresh,
  mount,
  api,
  reviewDialog,
}) {
  function show(title, content) {
    runtime.lastFocus = document.activeElement;
    const modal = $('#portal-dialog');
    if (modal.open) modal.close();
    app.ui.render($('#dialog-content'), snippetView(ShowView, { title: title, content: content }));
    modal.showModal();
    app.services.activity?.mount();
  }

  function close() {
    if (state.busy) return;
    $('#portal-dialog').close();
    runtime.lastFocus?.isConnected && runtime.lastFocus.focus();
  }

  function notice(message) {
    const toast = $('#toast');
    toast.textContent = message;
    toast.hidden = false;
    app.scope.timeout(() => (toast.hidden = true), 5000);
  }

  async function ensureReady() {
    if (!state.loaded && !state.unauthorized) await refresh();
    if (state.unauthorized) {
      show('Akses pengajuan demo', auth());
      return false;
    }
    if (state.error) {
      show(
        'Pengajuan belum tersedia',
        snippetView(EnsureReadyView, {
          error: esc(state.error),
          action: action('refresh', '', 'Coba lagi'),
        }),
      );
      return false;
    }
    return true;
  }

  function setBusy(form, busy) {
    state.busy = busy;
    form?.querySelectorAll('button,input,textarea').forEach((x) => {
      if (busy) {
        x.dataset.wasDisabled = String(x.disabled);
        x.disabled = true;
      } else {
        x.disabled = x.dataset.wasDisabled === 'true';
        delete x.dataset.wasDisabled;
      }
    });
    const error = $('#wf-error');
    if (error && busy) error.hidden = true;
  }

  function errorMessage(error) {
    const el = $('#wf-error');
    if (el) {
      el.textContent = error.message;
      el.hidden = false;
    } else notice(error.message);
  }

  function adopt(item) {
    state.items = state.items.filter((x) => x.id !== item.id);
    state.items.unshift(item);
    app.events.dispatchEvent(new CustomEvent('kspps-profile-loaded', { detail: state.profile }));
    mount();
  }

  async function mutation(id, path, body) {
    if (state.busy) return;
    const inner = $('#dialog-content');
    setBusy(inner, true);
    try {
      const result = await api('/' + id + '/' + path, {
        method: 'POST',
        body: JSON.stringify(body || {}),
      });
      adopt(result.item);
      setBusy(inner, false);
      reviewDialog(id);
    } catch (error) {
      setBusy(inner, false);
      errorMessage(error);
    }
  }
  return { show, close, notice, ensureReady, setBusy, errorMessage, adopt, mutation };
}
