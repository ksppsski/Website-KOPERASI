import { statusColor } from '../../../../shared/lib/status-colors.js';

/**
 * Antrean kerja dan laporan KPI manajer.
 * Tampilan halaman berada di frontend-petugas/src/components/activity/.
 * Fragmen HTML di sini dipakai untuk tabel dinamis dan dialog; nilai pengguna
 * harus melalui esc(). Otorisasi dan aturan keuangan tetap diperiksa server.
 */
/* Server-backed work timestamps. Updating this panel never replaces an open form. */
export function initializeActivity() {
  'use strict';
  const $ = (s) => document.querySelector(s),
    wf = () => window.KsppsWorkflow;
  const esc = (v) =>
    String(v ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const state = {
    tasks: [],
    queueTasks: [],
    loaded: false,
    loading: false,
    error: '',
    role: '',
    status: '',
    from: '',
    to: '',
    busy: false,
    sequence: 0,
    range: null,
  };
  const newestFirst = (a, b) =>
    (Date.parse(b.receivedAt) || 0) - (Date.parse(a.receivedAt) || 0) ||
    String(a.id).localeCompare(String(b.id));
  const stageRoutes = {
    registration: 'pendaftaran',
    capital: 'penyertaan',
    withdrawal: 'pengunduran',
    generate: 'akad',
    archive: 'akad',
    reconciliation: 'finance-rekonsiliasi',
    payout: 'finance-bagi-hasil',
    'principal-return': 'finance-pengembalian',
    'withdrawal-return': 'finance-pengunduran',
    'withdrawal-final': 'manager-pengunduran',
    'staff-access': 'manager-akses',
  };
  function queue() {
    const role = wf()?.getStaff()?.role;
    const tasks = state.queueTasks
      .filter(
        (t) =>
          t.role === role &&
          !(t.completed ?? !!t.completedAt) &&
          !(t.closed ?? !!t.closedAt) &&
          (!t.receivedAt || Date.parse(t.receivedAt) <= Date.now()),
      )
      .sort(newestFirst);
    const content = state.error
      ? /* HTML */ `<p class="form-error" role="alert">${esc(state.error)}</p>
          ${button('refresh', 'Coba lagi')}`
      : !state.loaded
        ? '<p role="status">Memuat antrean tugas…</p>'
        : /* HTML */ `<div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>TUGAS / ANGGOTA</th>
                  <th>STATUS</th>
                  <th>TINDAKAN</th>
                </tr>
              </thead>
              <tbody>
                ${
                  tasks
                    .map(
                      (t) =>
                        /* HTML */ `<tr>
                          <td>
                            <strong>${esc(t.label)}</strong
                            ><small>${esc(t.memberName || '—')}</small>
                          </td>
                          <td>
                            <span class="badge blue"
                              >${(t.started ?? !!t.startedAt) ? 'Sedang dikerjakan' : 'Belum dimulai'}</span
                            >
                          </td>
                          <td>
                            <a
                              class="btn secondary small-btn"
                              href="#${stageRoutes[t.stage] || 'waktu-kerja'}"
                              >Buka tugas</a
                            >
                          </td>
                        </tr>`,
                    )
                    .join('') ||
                  '<tr><td colspan="3"><div class="empty-state">Belum ada tugas yang perlu dikerjakan.</div></td></tr>'
                }
              </tbody>
            </table>
          </div>`;
    return /* HTML */ `<section class="panel" data-task-summary>
      <div class="panel-head">
        <h2>Antrean tugas</h2>
        <span class="field-hint">Terbaru di atas</span>
      </div>
      ${content}
    </section>`;
  }
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
                            >${roleLabel(t.role)}${t.startedBy || t.completedBy ? ' · ' + esc(t.startedName || t.completedName || 'Petugas') + ' (' + roleLabel(t.startedRole || t.completedRole || t.role) + ')' : ''}
                            ·
                            ${esc(t.targetId.startsWith('payout:') ? t.targetId.slice(7) : t.targetId.slice(0, 8).toUpperCase())}</small
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

  function announce() {
    window.dispatchEvent(new CustomEvent('kspps-activity-loaded'));
  }
  async function load() {
    if (state.loading) return;
    state.loading = true;
    state.error = '';
    const seq = ++state.sequence;
    try {
      const manager = wf().getStaff()?.role === 'manager';
      const query =
        state.from && state.to
          ? '?from=' + encodeURIComponent(state.from) + '&to=' + encodeURIComponent(state.to)
          : '';
      const [result, queueResult] = manager
        ? await Promise.all([wf().api('/staff/activity' + query), wf().api('/staff/tasks')])
        : [await wf().api('/staff/tasks'), null];
      if (seq !== state.sequence) return;
      state.tasks = result.tasks;
      state.queueTasks = queueResult?.tasks || result.tasks;
      state.range = result.range || null;
      if (result.range) {
        state.from = result.range.from;
        state.to = result.range.to;
      }
      state.loaded = true;
    } catch (error) {
      if (seq === state.sequence) state.error = error.message;
    } finally {
      if (seq === state.sequence) {
        state.loading = false;
        paintPanels();
        announce();
      }
    }
  }
  function mount() {
    if (
      (['#waktu-kerja', '#finance-ringkasan'].includes(location.hash) || $('[data-work-target]')) &&
      !state.loaded &&
      !state.loading &&
      !state.error
    )
      void load();
  }
  function invalidate() {
    state.loaded = false;
    state.error = '';
    state.sequence++;
    state.loading = false;
  }
  async function requireStarted(target, stage) {
    if (!state.loaded) await load();
    const t = currentTask(target, stage);
    if (
      (t?.started ?? !!t?.startedAt) &&
      !(t.completed ?? !!t.completedAt) &&
      !(t.closed ?? !!t.closedAt)
    )
      return true;
    const el = $('[data-work-target] .work-error');
    if (el) {
      el.hidden = false;
      el.textContent =
        state.error || 'Tekan “Mulai mengerjakan” sebelum menyimpan hasil tahap ini.';
    }
    $('[data-activity-action="start"]')?.focus();
    return false;
  }
  function csv() {
    if (!state.loaded || wf().getStaff()?.role !== 'manager') return;
    const rows = [
      [
        'Tahap',
        'Referensi',
        'Anggota / daftar',
        'Peran',
        'Masuk (WITA)',
        'Mulai (WITA)',
        'Selesai (WITA)',
        'Respons (detik)',
        'Pengerjaan (detik)',
        'Status',
        'ID akun mulai',
        'ID akun selesai',
      ],
      ...filtered().map((t) => [
        t.label,
        t.targetId,
        t.memberName,
        roleLabel(t.role),
        t.receivedAt ? time(t.receivedAt) : '',
        t.startedAt ? time(t.startedAt) : '',
        t.completedAt ? time(t.completedAt) : '',
        t.responseSeconds ?? '',
        t.processingSeconds ?? '',
        statusLabel(t),
        t.startedBy || '',
        t.completedBy || '',
      ]),
    ];
    const cell = (v) => {
      let s = String(v ?? '');
      if (/^[\s]*[=+@\-]/.test(s)) s = "'" + s;
      return '"' + s.replaceAll('"', '""') + '"';
    };
    const blob = new Blob(['\ufeff' + rows.map((r) => r.map(cell).join(';')).join('\r\n')], {
        type: 'text/csv;charset=utf-8',
      }),
      url = URL.createObjectURL(blob),
      a = document.createElement('a');
    a.href = url;
    a.download = 'KSPPS-Waktu-Kerja.csv';
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  document.addEventListener('click', async (event) => {
    const b = event.target.closest('[data-activity-action]');
    if (!b) return;
    const action = b.dataset.activityAction;
    if (action === 'today' || action === 'week') {
      const latest = dateKey(new Date()),
        d = new Date(latest + 'T12:00:00Z');
      d.setUTCDate(d.getUTCDate() - 7);
      state.from = action === 'week' ? d.toISOString().slice(0, 10) : latest;
      state.to = latest;
      invalidate();
      void load();
      return;
    }
    if (action === 'refresh') {
      invalidate();
      void load();
      return;
    }
    if (action === 'csv') {
      csv();
      return;
    }
    if (action !== 'start' || state.busy) return;
    state.busy = true;
    b.disabled = true;
    try {
      const result = await wf().api('/staff/activity/start', {
        method: 'POST',
        body: JSON.stringify({ taskId: b.dataset.taskId }),
      });
      const updated = {
        ...result.task,
        started: !!result.task.startedAt,
        completed: !!result.task.completedAt,
        closed: !!result.task.closedAt,
      };
      state.tasks = state.tasks.map((t) => (t.id === updated.id ? updated : t));
      state.queueTasks = state.queueTasks.map((t) => (t.id === updated.id ? updated : t));
      paintPanels();
      announce();
    } catch (error) {
      const el = b.closest('[data-work-target]')?.querySelector('.work-error');
      if (el) {
        el.textContent = error.message;
        el.hidden = false;
      }
      b.disabled = false;
    } finally {
      state.busy = false;
    }
  });
  document.addEventListener('change', (event) => {
    const key = event.target.dataset.workFilter;
    if (!['role', 'status', 'from', 'to'].includes(key)) return;
    state[key] = event.target.value;
    const el = $('#work-results');
    if (['from', 'to'].includes(key)) {
      if (!state.from || !state.to || state.from > state.to) {
        if (el)
          el.innerHTML =
            '<p class="form-error" role="alert">Pilih tanggal awal dan akhir yang sesuai.</p>';
        return;
      }
      invalidate();
      if (el) el.innerHTML = '<p role="status">Memuat catatan kerja…</p>';
      void load();
      return;
    }
    if (el) el.innerHTML = results();
  });
  window.addEventListener('kspps-profile-loaded', () => {
    invalidate();
    mount();
  });
  window.addEventListener('kspps-staff-role-changed', () => {
    invalidate();
    state.tasks = [];
    state.queueTasks = [];
    state.from = '';
    state.to = '';
    state.range = null;
    state.role = '';
    state.status = '';
  });
  window.addEventListener('kspps-member-changed', () => {
    invalidate();
    state.tasks = [];
    state.queueTasks = [];
  });
  window.KsppsActivity = {
    getViewContext: () => ({ wf, state, queue, dateKey, button, panel, summary, results, csv }),
    queue,
    panel,
    mount,
    load,
    invalidate,
    requireStarted,
  };
}
