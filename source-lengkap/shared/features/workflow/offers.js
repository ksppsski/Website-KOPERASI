import { OfferFormView } from './views/offers.svelte';
import { empty, esc, money, date, action } from './presentation.js';
import OfferCards from '../../components/workflow/OfferCards.svelte';
import { view, snippetView } from '../../runtime/view.js';

/**
 * Penawaran modal dan batas tampil tiga hari setelah terpenuhi.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { offerVisibleToMember } from '../../lib/offer-visibility.js';
export function createWorkflowOffers({ app, runtime, staff, state, ensureReady, show }) {
  function scheduleOfferExpiry() {
    clearTimeout(runtime.offerExpiryTimer);
    if (staff) return;
    const now = Date.now();
    const deadlines = state.offers
      .filter((o) => o.remaining <= 0 && o.memberVisibleUntil)
      .map((o) => Date.parse(o.memberVisibleUntil))
      .filter((at) => at > now);
    if (!deadlines.length) return;
    runtime.offerExpiryTimer = app.scope.timeout(
      () => {
        // Hanya perbarui daftar penawaran; jangan menutup formulir yang sedang diisi.
        document.querySelectorAll('[data-workflow="member-offers"]').forEach((el) => {
          app.ui.render(el, offerCards(false));
        });
        scheduleOfferExpiry();
      },
      Math.min(2147483647, Math.min(...deadlines) - now),
    );
  }

  function offerCards(manager = false) {
    return view(OfferCards, {
      offers: state.offers,
      now: Date.now(),
      manager,
      active: !!state.profile?.savings?.active,
    });
  }

  async function offerForm() {
    if (!(await ensureReady())) return;
    if (state.staff.role !== 'manager') return;
    runtime.formId = crypto.randomUUID();
    show('Buat penawaran', snippetView(OfferFormView, { action: action('close', '', 'Batal') }));
  }
  return { scheduleOfferExpiry, offerCards, offerForm };
}
