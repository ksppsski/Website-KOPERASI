<script>
  import { tick, untrack } from 'svelte';
  import { complaintDivisionLabels, toComplaintInputTime } from '../../lib/complaints.js';
  import { isStaticPreview } from '../../runtime/environment.js';

  let { item, assignees = [], busy = false, controller } = $props();
  const initial = untrack(() => item);
  let division = $state(initial.division || 'admin');
  let assigneeId = $state(initial.assignee?.id || '');
  let dueAt = $state(toComplaintInputTime(initial.dueAt));
  let reason = $state('');
  let version = $state(initial.version);
  let refreshing = $state(false);
  const eligible = $derived(assignees.filter((person) => person.role === division));

  async function useCurrentAssignment() {
    if (busy || refreshing) return;
    refreshing = true;
    if (await controller.load()) {
      await tick();
      division = item.division || 'admin';
      assigneeId = item.assignee?.id || '';
      dueAt = toComplaintInputTime(item.dueAt);
      version = item.version;
    }
    refreshing = false;
  }

  function chooseDivision(event) {
    division = event.currentTarget.value;
    if (!assignees.some((person) => person.id === assigneeId && person.role === division))
      assigneeId = '';
  }

  async function submit(event) {
    event.preventDefault();
    if (busy || refreshing || isStaticPreview) return;
    const due = new Date(`${dueAt}:00+08:00`);
    if (!Number.isFinite(due.getTime())) return;
    const saved = await controller.assign({
      version,
      assigneeId,
      division,
      dueAt: due.toISOString(),
      reason,
    });
    if (saved) {
      reason = '';
      await tick();
      version = item.version;
    }
  }
</script>

<section class="panel" aria-labelledby="complaint-assignment-title">
  <div class="panel-head">
    <h2 id="complaint-assignment-title">Penugasan keluhan</h2>
    <button
      class="btn secondary small-btn"
      type="button"
      disabled={busy || refreshing}
      onclick={useCurrentAssignment}>Muat ulang penugasan</button
    >
  </div>
  {#if version !== item.version}
    <p class="field-hint">Keluhan diperbarui. Periksa penugasan terbaru sebelum menyimpan.</p>
  {/if}
  <form onsubmit={submit}>
    <fieldset disabled={busy || refreshing || isStaticPreview}>
      <div class="complaint-form-grid">
        <label class="form-field">
          <span>Divisi penanggung jawab</span>
          <select name="division" value={division} onchange={chooseDivision} required>
            {#each Object.entries(complaintDivisionLabels) as [value, label]}<option {value}
                >{label}</option
              >{/each}
          </select>
        </label>
        <label class="form-field">
          <span>PIC</span>
          <select name="picUserId" bind:value={assigneeId} required>
            <option value="">Pilih PIC</option>
            {#each eligible as person}<option value={person.id}>{person.name}</option>{/each}
          </select>
          {#if !eligible.length}<span class="field-hint"
              >Belum ada petugas aktif pada divisi ini.</span
            >{/if}
        </label>
      </div>
      <label class="form-field">
        <span>Batas waktu penanganan (WITA)</span>
        <input type="datetime-local" name="dueAt" bind:value={dueAt} required />
      </label>
      <label class="form-field">
        <span>Alasan perubahan</span>
        <textarea
          name="reason"
          bind:value={reason}
          maxlength="1000"
          rows="3"
          required={!!item.assignee}
          aria-describedby="complaint-reason-hint"></textarea>
      </label>
      <p id="complaint-reason-hint" class="field-hint">Wajib diisi saat mengganti penugasan.</p>
      <button class="btn" type="submit">Simpan penugasan</button>
    </fieldset>
  </form>
</section>
