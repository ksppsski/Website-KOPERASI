// Shared completeness checks use effective-dated history, never today's assignment
// as a substitute for the period the user actually selected.
export function missingAssignmentFields(change, events) {
  const history = events
    .map((e) => ({
      memberId: e.memberId ?? e.member_id,
      contractId: e.contractId ?? e.contract_id ?? null,
      personId: e.personId ?? e.person_id ?? null,
      rate: e.rate,
      date: e.date ?? e.effective_date,
      seq: e.seq ?? 0,
    }))
    .filter((e) => e.memberId === change.memberId);
  const targets = change.scope === 'new' ? [null] : change.contractIds || [];
  return targets.flatMap((contractId) => {
    const eligible = history
      .filter(
        (e) =>
          e.contractId === contractId && (contractId === null || e.date <= change.effectiveDate),
      )
      .sort((a, b) => (contractId === null ? 0 : b.date.localeCompare(a.date)) || b.seq - a.seq);
    const needsPerson = !change.personId && !eligible.find((e) => e.personId)?.personId;
    const needsRate =
      (change.rate == null || change.rate === '') && !eligible.find((e) => e.rate != null)?.rate;
    return needsPerson || needsRate ? [{ contractId, needsPerson, needsRate }] : [];
  });
}
