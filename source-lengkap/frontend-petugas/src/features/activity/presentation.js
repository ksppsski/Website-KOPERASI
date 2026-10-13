/**
 * Kartu waktu kerja, ringkasan, dan tabel aktivitas petugas.
 * Semua ketergantungan fitur diterima secara eksplisit melalui parameter.
 */
import { statusColor } from '../../../../shared/lib/status-colors.js';
export function createActivityPresentation({ state, wf, esc, newestFirst }) {
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
    /* HTML */ `<button
      type="button"
      class="btn secondary small-btn"
      data-activity-action="${action}"
      ${extra}
    >
      ${label}
    </button>`;

  const currentTask = (target, stage) =>
    state.tasks.filter((t) => t.targetId === target && (!stage || t.stage === stage)).at(-1);

  function card(t) {
    if (!t) return '<p class="field-hint">Tahap ini belum tersedia.</p>';
    const started = t.started ?? !!t.startedAt,
      completed = t.completed ?? !!t.completedAt,
      closed = t.closed ?? !!t.closedAt;
    const canStart =
      !started && !completed && !closed && t.role === (wf().getStaff()?.role || 'admin');
    return /* HTML */ `<div class="work-head">
        <strong>${esc(t.label)}</strong
        ><span class="badge ${completed ? 'green' : closed ? 'gray' : 'blue'}"
          >${completed ? 'Selesai' : closed ? 'Ditutup' : started ? 'Sedang dikerjakan' : 'Belum dimulai'}</span
        >
      </div>
      ${canStart ? button('start', 'Mulai mengerjakan', `data-task-id="${esc(t.id)}"`) : ''}
      <p class="work-error form-error" role="alert" hidden></p>`;
  }

  function panelBody(target, stage) {
    if (state.error)
      return /* HTML */ `<p class="form-error">${esc(state.error)}</p>
        ${button('refresh', 'Coba lagi')}`;
    if (!state.loaded) return '<p class="muted" role="status">Memuat tahap pekerjaan…</p>';
    return card(currentTask(target, stage));
  }

  function panel(target, stage) {
    return /* HTML */ `<section
      class="work-timemark"
      data-work-target="${esc(target)}"
      data-work-stage="${esc(stage)}"
    >
      <div data-work-body>${panelBody(target, stage)}</div>
    </section>`;
  }

  function paintPanels() {
    document.querySelectorAll('[data-work-target]').forEach((el) => {
      const body = el.querySelector('[data-work-body]');
      if (body) body.innerHTML = panelBody(el.dataset.workTarget, el.dataset.workStage);
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
      return /* HTML */ `<div class="panel">
        <p class="form-error" role="alert">${esc(state.error)}</p>
        ${button('refresh', 'Coba lagi')}
      </div>`;
    if (!state.loaded)
      return '<section class="panel"><p role="status">Memuat catatan kerja…</p></section>';
    const items = filtered(),
      s = summary(items);
    const stats = [
      ['Belum dimulai', s.queued],
      ['Sedang dikerjakan', s.working],
      ['Tahap selesai', s.completed],
      ['Rata-rata respons', duration(s.response)],
    ];
    return /* HTML */ `<div class="stats work-stats">
        ${stats
          .map(
            ([label, value]) =>
              /* HTML */ `<div class="stat">
                <div class="stat-top">${label}</div>
                <div class="stat-value">${value}</div>
              </div>`,
          )
          .join('')}
      </div>
      <section class="panel">
        <div class="panel-head">
          <h2>Ringkasan per peran</h2>
          <span class="field-hint">Sesuai filter</span>
        </div>
        <div class="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PERAN</th>
                <th>TAHAP SELESAI</th>
                <th>RATA-RATA RESPONS</th>
                <th>RATA-RATA PENGERJAAN</th>
              </tr>
            </thead>
            <tbody>
              ${['admin', 'finance']
                .filter((r) => !state.role || r === state.role)
                .map((r) => {
                  const x = summary(items.filter((t) => t.role === r));
                  return /* HTML */ `<tr>
                    <td><strong>${roleLabel(r)}</strong></td>
                    <td>${x.completed}</td>
                    <td>${duration(x.response)}<small>${x.responseN} catatan lengkap</small></td>
                    <td>
                      ${duration(x.processing)}<small>${x.processingN} catatan lengkap</small>
                    </td>
                  </tr>`;
                })
                .join('')}
            </tbody>
          </table>
        </div>
      </section>
      <section class="panel">
        <div class="panel-head">
          <h2>Riwayat tahap pekerjaan</h2>
          <span class="badge gray">${items.length} catatan</span>
        </div>
        <div class="table-scroll">
          <table class="work-table">
            <thead>
              <tr>
                <th>TUGAS / PETUGAS</th>
                <th>MASUK</th>
                <th>MULAI</th>
                <th>SELESAI</th>
                <th>DURASI</th>
                <th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              ${
                items
                  .map(
                    (t) =>
                      /* HTML */ `<tr>
                        <td>
                          <strong>${esc(t.label)}</strong><small>${esc(t.memberName)}</small
                          ><small
                            >${roleLabel(t.role)}${
                              t.startedBy || t.completedBy
                                ? ' · ' +
                                  esc(t.startedName || t.completedName || 'Petugas') +
                                  ' (' +
                                  roleLabel(t.startedRole || t.completedRole || t.role) +
                                  ')'
                                : ''
                            }
                            ·
                            ${esc(
                              t.targetId.startsWith('payout:')
                                ? t.targetId.slice(7)
                                : t.targetId.slice(0, 8).toUpperCase(),
                            )}</small
                          >${t.legacy ? '<small>Riwayat lama</small>' : ''}
                        </td>
                        <td>${time(t.receivedAt)}</td>
                        <td>
                          ${t.startedAt ? time(t.startedAt) : t.completedAt ? 'Belum tercatat' : '—'}
                        </td>
                        <td>
                          ${t.completedAt ? time(t.completedAt) : '—'}${t.closedAt ? /* HTML */ `<small>Ditutup ${time(t.closedAt)}</small>` : ''}
                        </td>
                        <td>
                          Respons ${duration(t.responseSeconds)}<small
                            >Pengerjaan ${duration(t.processingSeconds)}</small
                          >
                        </td>
                        <td>
                          <span class="badge ${statusColor(statusLabel(t))}">${statusLabel(t)}</span
                          >${t.completedAt && !t.startedAt ? '<small>Waktu mulai belum tercatat</small>' : ''}
                        </td>
                      </tr>`,
                  )
                  .join('') ||
                '<tr><td colspan="6"><div class="empty-state">Belum ada catatan yang sesuai. Waktu masuk tercatat saat anggota mengirim pengajuan.</div></td></tr>'
              }
            </tbody>
          </table>
        </div>
      </section>`;
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
