<script>
  import {
    complaintStatusLabels,
    complaintDivisionLabels,
    formatComplaintTime,
  } from '../../lib/complaints.js';
  import Badge from '../Badge.svelte';

  let { items = [], loading = false, busy = false, staff = false, onOpen, onRefresh } = $props();
  let query = $state('');
  let status = $state('');
  const visible = $derived(
    items.filter((item) => {
      const text = `${item.number} ${item.subject} ${item.memberName || ''}`.toLocaleLowerCase(
        'id',
      );
      return (
        (!status || item.status === status) && text.includes(query.trim().toLocaleLowerCase('id'))
      );
    }),
  );
  const variants = {
    new: 'blue',
    in_progress: 'blue',
    waiting_member: 'amber',
    resolved: 'green',
    closed: 'neutral',
  };
</script>

<section class="panel complaint-list" aria-labelledby="complaint-list-title">
  <div class="panel-head">
    <h2 id="complaint-list-title">{staff ? 'Daftar keluhan' : 'Keluhan Saya'}</h2>
    <button
      class="btn secondary small-btn"
      type="button"
      disabled={busy || loading}
      onclick={onRefresh}>Perbarui</button
    >
  </div>
  <div class="complaint-filters">
    <label class="form-field">
      <span>Cari keluhan</span>
      <input type="search" bind:value={query} placeholder="Nomor keluhan atau subjek" />
    </label>
    <label class="form-field">
      <span>Status keluhan</span>
      <select bind:value={status}>
        <option value="">Semua status</option>
        {#each Object.entries(complaintStatusLabels) as [value, label]}
          <option {value}>{label}</option>
        {/each}
      </select>
    </label>
  </div>
  {#if loading}
    <p role="status" class="complaint-empty">Memuat keluhan…</p>
  {/if}
  <div class="table-scroll complaint-table" role="region" aria-label="Daftar keluhan">
    <table>
      <thead>
        <tr>
          <th>Nomor keluhan</th><th>Waktu masuk</th><th>Subjek</th><th>PIC / Divisi</th><th
            >Status</th
          ><th>Batas waktu</th><th>Tindakan</th>
        </tr>
      </thead>
      <tbody>
        {#each visible as item (item.id)}
          <tr>
            <td><strong>{item.number}</strong></td>
            <td>{formatComplaintTime(item.createdAt)}</td>
            <td
              >{item.subject}{#if staff && item.memberName}<small>{item.memberName}</small>{/if}</td
            >
            <td>
              {item.assignee?.name || 'Belum ditetapkan'}
              <small>{complaintDivisionLabels[item.division] || 'Belum ditetapkan'}</small>
            </td>
            <td
              ><Badge
                text={complaintStatusLabels[item.status] || item.status}
                variant={variants[item.status]}
              /></td
            >
            <td>
              {item.dueAt ? formatComplaintTime(item.dueAt) : 'Belum ditetapkan'}
              {#if item.overdue}<small class="complaint-overdue">Lewat batas waktu</small>{/if}
            </td>
            <td>
              <button
                type="button"
                class="btn secondary small-btn"
                disabled={busy}
                onclick={() => onOpen(item.id)}
                aria-label={`Lihat detail ${item.number}`}>Lihat detail</button
              >
            </td>
          </tr>
        {:else}
          <tr
            ><td colspan="7" class="complaint-empty"
              >{items.length ? 'Tidak ada keluhan yang sesuai.' : 'Belum ada keluhan.'}</td
            ></tr
          >
        {/each}
      </tbody>
    </table>
  </div>
</section>
