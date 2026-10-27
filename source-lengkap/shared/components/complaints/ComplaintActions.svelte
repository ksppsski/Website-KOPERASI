<script>
  import { complaintStatusLabels } from '../../lib/complaints.js';
  import { isStaticPreview } from '../../runtime/environment.js';

  let { detail, busy = false, staff = false, controller } = $props();
  const item = $derived(detail.item);
  const replyAsStaff = $derived(staff && detail.canReplyAsStaff);
  let message = $state('');
  let replyStatus = $state('in_progress');
  let resolution = $state('');

  async function reply(event) {
    event.preventDefault();
    if (busy || isStaticPreview) return;
    const payload = { version: item.version, message };
    if (replyAsStaff) payload.status = replyStatus;
    if (await controller.reply(payload)) message = '';
  }

  async function resolve(event) {
    event.preventDefault();
    if (busy || isStaticPreview) return;
    if (await controller.changeStatus({ version: item.version, status: 'resolved', resolution }))
      resolution = '';
  }

  function setStatus(status) {
    if (!busy && !isStaticPreview) void controller.changeStatus({ version: item.version, status });
  }
</script>

{#if replyAsStaff && item.status === 'new'}
  <section class="panel">
    <h2>Mulai penanganan</h2>
    <p>PIC dan batas waktu sudah ditetapkan. Mulai penanganan untuk menindaklanjuti keluhan.</p>
    <button
      class="btn"
      type="button"
      disabled={busy || isStaticPreview}
      onclick={() => setStatus('in_progress')}>Mulai penanganan</button
    >
  </section>
{/if}

{#if detail.canReply}
  <section class="panel" aria-labelledby="complaint-reply-title">
    <div class="panel-head"><h2 id="complaint-reply-title">Kirim tanggapan</h2></div>
    <form onsubmit={reply}>
      <fieldset disabled={busy || isStaticPreview}>
        <label class="form-field">
          <span>Tanggapan</span>
          <textarea name="reply" bind:value={message} rows="4" maxlength="4000" required></textarea>
        </label>
        {#if replyAsStaff}
          <label class="form-field">
            <span>Status setelah tanggapan</span>
            <select name="status" bind:value={replyStatus}>
              <option value="in_progress">{complaintStatusLabels.in_progress}</option>
              <option value="waiting_member">{complaintStatusLabels.waiting_member}</option>
            </select>
          </label>
        {/if}
        <button class="btn" type="submit">Kirim tanggapan</button>
      </fieldset>
    </form>
  </section>
{/if}

{#if detail.canResolve}
  <section class="panel" aria-labelledby="complaint-result-title">
    <div class="panel-head"><h2 id="complaint-result-title">Penyelesaian keluhan</h2></div>
    <form onsubmit={resolve}>
      <fieldset disabled={busy || isStaticPreview}>
        <label class="form-field">
          <span>Catatan hasil penyelesaian</span>
          <textarea
            name="result"
            bind:value={resolution}
            rows="4"
            minlength="10"
            maxlength="4000"
            required></textarea>
        </label>
        <p class="field-hint">
          Catatan ini menjadi dasar penutupan kasus dan tetap tercatat pada riwayat.
        </p>
        <button class="btn" type="submit">Selesaikan keluhan</button>
      </fieldset>
    </form>
  </section>
{/if}

{#if detail.canClose}
  <section class="panel">
    <h2>Penutupan kasus</h2>
    <p>Periksa catatan hasil penyelesaian sebelum menutup kasus.</p>
    <button
      class="btn"
      type="button"
      disabled={busy || isStaticPreview}
      onclick={() => setStatus('closed')}>Tutup kasus</button
    >
  </section>
{/if}
