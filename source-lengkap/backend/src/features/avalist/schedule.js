/** Modul fitur; aturan dan izin diperiksa pada fungsi terkait. */
import { cents } from './transactions.js';
import { buildPayoutSchedule, scheduledDate } from '../../finance.js';
import { paymentDTO } from './records.js';

export function allocation(principal, rate) {
  const total = cents(principal, 10),
    member = cents(principal, 5),
    avalist = cents(principal, rate);
  // Allocate the rounding remainder to the cooperative, keeping the total exact.
  return {
    total,
    member,
    avalist,
    cooperative: total - member - avalist,
    memberRate: 5,
    rate,
    cooperativeRate: 5 - rate,
  };
}

export function assignmentAt(events, contractId, date) {
  const eligible = events
    .filter((e) => e.contract_id === contractId && e.effective_date <= date)
    .sort((a, b) => b.effective_date.localeCompare(a.effective_date) || b.seq - a.seq);
  return {
    personId: eligible.find((e) => e.person_id)?.person_id || null,
    rate: eligible.find((e) => e.rate !== null)?.rate ?? null,
  };
}

export function scheduled(data, date) {
  return buildPayoutSchedule(data.requests, data.funding, date).items.map((item) => {
    const a = assignmentAt(data.events, item.id, date),
      person = data.people.find((p) => p.id === a.personId);
    const split = a.rate ? allocation(item.principal, a.rate) : null;
    const detail = {
      contractId: item.id,
      contractNumber: item.contractNumber,
      memberId: item.memberId,
      memberName: item.memberName,
      memberKey: item.memberKey,
      date,
      period: item.period,
      principal: item.principal,
      personId: a.personId,
      personName: person?.name || '',
      bankName: person?.bank_name || '',
      bankAccount: person?.bank_account || '',
      accountName: person?.account_name || '',
      ...split,
    };
    const blocked =
      !person || !split
        ? 'Belum ditetapkan Manajer'
        : !person.active || !person.available
          ? 'Avalist tidak aktif atau akses dicabut'
          : !person.bank_name || !person.bank_account || !person.account_name
            ? 'Rekening avalist belum lengkap'
            : '';
    const ledger = data.payments.find(
      (p) => p.kind === 'regular' && p.contract_id === item.id && p.due_date === date,
    );
    if (ledger?.status === 'paid')
      return {
        ...JSON.parse(ledger.snapshot),
        payment: paymentDTO(ledger),
        blocked: '',
        status: 'paid',
      };
    // Compare the stored preparation with today's authoritative assignment/bank details.
    const changed = ledger && ledger.snapshot !== JSON.stringify(detail);
    return {
      ...detail,
      blocked,
      status: ledger
        ? changed || ledger.status === 'needs_review'
          ? 'needs_review'
          : 'prepared'
        : 'pending',
      payment: ledger ? paymentDTO(ledger) : null,
    };
  });
}

export function allPeriods(data) {
  const dates = new Set();
  for (const r of data.requests) {
    const c = JSON.parse(r.contract_data);
    if (!c.effectiveDate || !c.endDate) continue;
    for (let i = 1; i <= 12; i++) {
      const date = scheduledDate(c.effectiveDate, i);
      if (date <= c.endDate) dates.add(date);
    }
  }
  return [...dates].sort().flatMap((date) => scheduled(data, date));
}

export function summarizeAvalistFees(items, payments, today) {
  // Inputs are already scoped to the signed-in recipient. Paid ledger snapshots
  // remain authoritative even after assignments or the original contracts change.
  const paid = payments.filter((p) => p.status === 'paid').reduce((n, p) => n + p.amount, 0);
  const scheduledDue = items
    .filter((x) => x.status !== 'paid' && x.date <= today)
    .reduce((n, x) => n + (x.avalist || 0), 0);
  const pendingAdjustments = payments
    .filter((p) => p.kind === 'adjustment' && p.status !== 'paid' && p.due_date <= today)
    .reduce((n, p) => n + p.amount, 0);
  const pending = scheduledDue + pendingAdjustments;
  return { asOf: today, total: paid + pending, paid, pending, scheduledDue, pendingAdjustments };
}

export function monthlyAvalistFees(items, payments, today) {
  // Entitlement follows the due month; cash follows the recorded bank transfer
  // date. Never subtract cash paid this month from this month's entitlement:
  // a transfer can settle an earlier month's fee.
  const months = new Map();
  const bucket = (date) => {
    const month = String(date || '').slice(0, 7);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return null;
    if (!months.has(month))
      months.set(month, {
        month,
        total: 0,
        paid: 0,
        paidForPeriod: 0,
        pending: 0,
        notDueYet: 0,
      });
    return months.get(month);
  };
  bucket(today);
  for (const item of items) {
    if (item.status === 'paid') continue;
    const row = bucket(item.date);
    if (!row) continue;
    row.total += item.avalist || 0;
    if (item.date > today) row.notDueYet += item.avalist || 0;
  }
  for (const payment of payments) {
    const paid = payment.status === 'paid';
    // Prepared regular rows repeat the schedule; corrections are separate,
    // manager-approved rights, including negative recoveries.
    if (paid || payment.kind === 'adjustment') {
      const period = bucket(payment.due_date);
      if (period) {
        period.total += payment.amount;
        if (paid) period.paidForPeriod += payment.amount;
      }
    }
    if (paid) {
      const cash = bucket(payment.transfer_date);
      if (cash) cash.paid += payment.amount;
    }
  }
  return [...months.values()]
    .map((row) => ({ ...row, pending: row.total - row.paidForPeriod }))
    .sort((a, b) => b.month.localeCompare(a.month));
}
