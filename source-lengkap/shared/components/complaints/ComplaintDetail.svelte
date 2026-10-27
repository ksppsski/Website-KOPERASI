<script>
  import {
    complaintStatusLabels,
    complaintDivisionLabels,
    complaintRoleLabels,
    complaintEventLabels,
    formatComplaintTime,
  } from '../../lib/complaints.js';
  import Badge from '../Badge.svelte';
  import ComplaintAssignment from './ComplaintAssignment.svelte';
  import ComplaintActions from './ComplaintActions.svelte';

  let { detail, assignees = [], busy = false, staff = false, controller } = $props();
  const item = $derived(detail.item);
  const variants = {
    new: 'blue',
    in_progress: 'blue',
    waiting_member: 'amber',
    resolved: 'green',
    closed: 'neutral',
  };
</script>

<div class="complaint-detail">
  <button
    class="btn secondary"
    type="button"
    disabled={busy}
    onclick={() => controller.closeDetail()}>Kembali ke daftar</button
  >
  <section class="panel" aria-labelledby="complaint-detail-title">
    <div class="panel-head complaint-detail-heading">
      <h2 id="complaint-detail-title">{item.number}</h2>
      <Badge
        text={complaintStatusLabels[item.status] || item.status}
        variant={variants[item.status]}
      />
    </div>
    <h3 class="complaint-subject">{item.subject}</h3>
    <dl class="review-list complaint-metadata">
      {#if staff && item.memberName}<div>
          <dt>Anggota</dt>
          <dd>{item.memberName}</dd>
        </div>{/if}
      <div>
        <dt>Waktu masuk</dt>
        <dd>{formatComplaintTime(item.createdAt)}</dd>
      </div>
      <div>
        <dt>PIC</dt>
        <dd>{item.assignee?.name || 'Belum ditetapkan'}</dd>
      </div>
      <div>
        <dt>Divisi penanggung jawab</dt>
        <dd>{complaintDivisionLabels[item.division] || 'Belum ditetapkan'}</dd>
      </div>
      <div>
        <dt>Batas waktu</dt>
        <dd>
          {item.dueAt ? formatComplaintTime(item.dueAt) : 'Belum ditetapkan'}
          {#if item.overdue}<small class="complaint-overdue">Lewat batas waktu</small>{/if}
        </dd>
      </div>
      {#if item.resolvedAt}<div>
          <dt>Waktu selesai</dt>
          <dd>{formatComplaintTime(item.resolvedAt)}</dd>
        </div>{/if}
      {#if item.closedAt}<div>
          <dt>Waktu ditutup</dt>
          <dd>{formatComplaintTime(item.closedAt)}</dd>
        </div>{/if}
    </dl>
    <h3>Uraian keluhan</h3>
    <p class="complaint-prose">{item.description}</p>
    {#if item.resolution}
      <section class="complaint-resolution" aria-labelledby="complaint-resolution-title">
        <h3 id="complaint-resolution-title">Catatan hasil penyelesaian</h3>
        <p class="complaint-prose">{item.resolution}</p>
      </section>
    {/if}
  </section>

  {#if staff && detail.canManage && !['resolved', 'closed'].includes(item.status)}
    <ComplaintAssignment {item} {assignees} {busy} {controller} />
  {/if}

  <section class="panel" aria-labelledby="complaint-history-title">
    <div class="panel-head"><h2 id="complaint-history-title">Riwayat tanggapan</h2></div>
    <ol class="complaint-history">
      {#each detail.events || [] as event, index (event.id || index)}
        <li>
          <div class="complaint-history-heading">
            <strong>{complaintEventLabels[event.kind] || 'Pembaruan keluhan'}</strong>
            <time datetime={event.createdAt}>{formatComplaintTime(event.createdAt)}</time>
          </div>
          <p class="complaint-actor">
            {event.actorName || 'Petugas'}{#if complaintRoleLabels[event.actorRole]}
              · {complaintRoleLabels[event.actorRole]}{/if}
          </p>
          {#if event.message}<p class="complaint-prose">{event.message}</p>{/if}
        </li>
      {:else}
        <li>Belum ada tanggapan.</li>
      {/each}
    </ol>
  </section>
  <ComplaintActions {detail} {busy} {staff} {controller} />
</div>
