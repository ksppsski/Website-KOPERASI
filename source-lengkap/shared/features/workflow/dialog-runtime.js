import { activityService } from '../../services/activity.js';
/**
 * Lifecycle dialog, status sibuk, penanganan error, dan hasil perubahan.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */

export function createWorkflowDialogRuntime({
  runtime,
  $,
  state,
  refresh,
  auth,
  esc,
  action,
  mount,
  api,
  reviewDialog,
}) {
  function show(title, content) {
    runtime.lastFocus = document.activeElement;
    const modal = $('#portal-dialog');
    if (modal.open) modal.close();
    $('#dialog-content').innerHTML = /* HTML */ `<div class="dialog-inner">
      <div class="dialog-head">
        <h2 id="dialog-title">${title}</h2>
        <button type="button" class="icon-btn" data-wf-action="close" aria-label="Tutup">×</button>
      </div>
      ${content}
    </div>`;
    modal.showModal();
    activityService?.mount();
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
    setTimeout(() => (toast.hidden = true), 5000);
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
        /* HTML */ `<p>${esc(state.error)}</p>
          ${action('refresh', '', 'Coba lagi')}`,
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
    window.dispatchEvent(new CustomEvent('kspps-profile-loaded', { detail: state.profile }));
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
