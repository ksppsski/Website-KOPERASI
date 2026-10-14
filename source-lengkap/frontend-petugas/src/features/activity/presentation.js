import {
  ButtonView,
  CardView,
  Card2View,
  PanelBodyView,
  PanelBody2View,
  PanelView,
  ResultsView,
  Results2View,
  Results4View,
  Results5View,
  Results7View,
  Results8View,
  Results9View,
  Results6View,
  Results10View,
  Results3View,
} from './views/presentation.svelte';
import { view, fallbackView, snippetView } from '../../../../shared/runtime/view.js';

/**
 * Kartu waktu kerja, ringkasan, dan tabel aktivitas petugas.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../../../shared/lib/status-colors.js';
export function createActivityPresentation({ app, state, wf, esc, newestFirst }) {
  const roleLabel = (r) => (r === 'manager' ? 'Manajer' : r === 'finance' ? 'Finance' : 'Admin');

  const statusLabel = (t) =>
    t.closedAt
      ? {
          cancelled: 'Dibatalkan',
          superseded: 'Diganti pengajuan baru',
          withdrawn: 'Dikembalikan ke anggota',
        }[t.outcome] || 'Ditutup'
      : t.completedAt
        ? { correction: 'Perlu perbaikan', rejected: 'Ditolak', prepared: 'Persiapan selesai' }[
            t.outcome
          ] || 'Selesai'
        : t.startedAt
          ? 'Dikerjakan'
          : 'Belum dimulai';

  const time = (value) =>
    value
      ? new Intl.DateTimeFormat('id-ID', {
          dateStyle: 'medium',
          timeStyle: 'medium',
          timeZone: 'Asia/Makassar',
          hourCycle: 'h23',
        }).format(new Date(value))
      : 'Belum tercatat';

  function dateKey(value) {
    if (!value) return '';
    const p = Object.fromEntries(
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Makassar',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      })
        .formatToParts(new Date(value))
        .map((x) => [x.type, x.value]),
    );
    return `${p.year}-${p.month}-${p.day}`;
  }

  function duration(seconds) {
    if (seconds === null || seconds === undefined) return '—';
    const n = Math.floor(seconds);
    if (n < 60) return n + ' dtk';
    if (n < 3600) return Math.floor(n / 60) + ' mnt ' + (n % 60) + ' dtk';
    if (n < 86400) return Math.floor(n / 3600) + ' jam ' + Math.floor((n % 3600) / 60) + ' mnt';
    return Math.floor(n / 86400) + ' hari ' + Math.floor((n % 86400) / 3600) + ' jam';
  }

  const button = (action, label, extra = '') =>
    snippetView(ButtonView, { action: action, extra: extra, label: label });

  const currentTask = (target, stage) =>
    state.tasks.filter((t) => t.targetId === target && (!stage || t.stage === stage)).at(-1);

  function card(t) {
    if (!t) return snippetView(CardView);
    const started = t.started ?? !!t.startedAt,
      completed = t.completed ?? !!t.completedAt,
      closed = t.closed ?? !!t.closedAt;
    const canStart =
      !started && !completed && !closed && t.role === (wf().getStaff()?.role || 'admin');
    return snippetView(Card2View, {
      label: esc(t.label),
      completedContent: completed ? 'green' : closed ? 'gray' : 'blue',
      completedContent2: completed
        ? 'Selesai'
        : closed
          ? 'Ditutup'
          : started
            ? 'Sedang dikerjakan'
            : 'Belum dimulai',
      canStartContent: canStart
        ? button('start', 'Mulai mengerjakan', { 'data-task-id': esc(t.id) })
        : '',
    });
  }

  function panelBody(target, stage) {
    if (state.error)
      return snippetView(PanelBodyView, {
        error: esc(state.error),
        button: button('refresh', 'Coba lagi'),
      });
    if (!state.loaded) return snippetView(PanelBody2View);
    return card(currentTask(target, stage));
  }

  function panel(target, stage) {
    return snippetView(PanelView, {
      target: esc(target),
      stage: esc(stage),
      panelBody: panelBody(target, stage),
    });
  }

  function paintPanels() {
    document.querySelectorAll('[data-work-target]').forEach((el) => {
      const body = el.querySelector('[data-work-body]');
      if (body) app.ui.render(body, panelBody(el.dataset.workTarget, el.dataset.workStage));
    });
  }

  function filtered() {
    return state.tasks
      .filter(
        (t) =>
          (!state.role || t.role === state.role) && (!state.status || t.status === state.status),
      )
      .sort(newestFirst);
  }

  function summary(items) {
    const active = items.filter((t) => !t.closedAt),
      inside = (v) =>
        v && (!state.from || dateKey(v) >= state.from) && (!state.to || dateKey(v) <= state.to),
      r = active.filter((t) => inside(t.startedAt) && t.responseSeconds !== null),
      p = active.filter((t) => inside(t.completedAt) && t.processingSeconds !== null);
    return {
      queued: active.filter((t) => !t.startedAt && !t.completedAt).length,
      working: active.filter((t) => t.startedAt && !t.completedAt).length,
      completed: active.filter((t) => inside(t.completedAt)).length,
      response: r.length ? r.reduce((n, t) => n + t.responseSeconds, 0) / r.length : null,
      processing: p.length ? p.reduce((n, t) => n + t.processingSeconds, 0) / p.length : null,
      responseN: r.length,
      processingN: p.length,
    };
  }

  function results() {
    if (state.error)
      return snippetView(ResultsView, {
        error: esc(state.error),
        button: button('refresh', 'Coba lagi'),
      });
    if (!state.loaded) return snippetView(Results2View);
    const items = filtered(),
      s = summary(items);
    const stats = [
      ['Belum dimulai', s.queued],
      ['Sedang dikerjakan', s.working],
      ['Tahap selesai', s.completed],
      ['Rata-rata respons', duration(s.response)],
    ];
    return snippetView(Results3View, {
      statsRows: stats.map(([label, value]) =>
        snippetView(Results4View, { label: label, fieldValue: value }),
      ),
      RowsRows: ['admin', 'finance']
        .filter((r) => !state.role || r === state.role)
        .map((r) => {
          const x = summary(items.filter((t) => t.role === r));
          return snippetView(Results5View, {
            roleLabel: roleLabel(r),
            completed: x.completed,
            duration: duration(x.response),
            responseN: x.responseN,
            durationValue: duration(x.processing),
            processingN: x.processingN,
          });
        }),
      length: items.length,
      fallbackView: fallbackView(
        items.map((t) =>
          snippetView(Results6View, {
            label: esc(t.label),
            memberName: esc(t.memberName),
            roleLabel: roleLabel(t.role),
            startedByContent:
              t.startedBy || t.completedBy
                ? ' · ' +
                  esc(t.startedName || t.completedName || 'Petugas') +
                  ' (' +
                  roleLabel(t.startedRole || t.completedRole || t.role) +
                  ')'
                : '',
            startsWithContent: esc(
              t.targetId.startsWith('payout:')
                ? t.targetId.slice(7)
                : t.targetId.slice(0, 8).toUpperCase(),
            ),
            legacyContent: t.legacy ? snippetView(Results7View) : '',
            time: time(t.receivedAt),
            startedAtContent: t.startedAt
              ? time(t.startedAt)
              : t.completedAt
                ? 'Belum tercatat'
                : '—',
            completedAtContent: t.completedAt ? time(t.completedAt) : '—',
            closedAtContent: t.closedAt
              ? snippetView(Results8View, { time: time(t.closedAt) })
              : '',
            duration: duration(t.responseSeconds),
            durationValue: duration(t.processingSeconds),
            statusColor: statusColor(statusLabel(t)),
            statusLabel: statusLabel(t),
            completedAtContent2: t.completedAt && !t.startedAt ? snippetView(Results9View) : '',
          }),
        ),
        snippetView(Results10View),
      ),
    });
  }
  return {
    roleLabel,
    statusLabel,
    time,
    dateKey,
    duration,
    button,
    currentTask,
    card,
    panelBody,
    panel,
    paintPanels,
    filtered,
    summary,
    results,
  };
}
