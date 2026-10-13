// Tiga hari penuh sejak kuota terakhir kali terpenuhi, bukan sejak dibuat/dibuka.
export const FULL_OFFER_VISIBLE_MS = 3 * 24 * 60 * 60 * 1000;

export function offerVisibleToMember(offer, now = Date.now()) {
  return (
    offer.remaining > 0 || !offer.memberVisibleUntil || Date.parse(offer.memberVisibleUntil) > now
  );
}
