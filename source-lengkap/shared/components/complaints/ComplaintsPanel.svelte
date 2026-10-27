<script>
  import { getContext, onMount, untrack } from 'svelte';
  import { createComplaintsController } from '../../features/complaints/controller.js';
  import { isStaticPreview } from '../../runtime/environment.js';
  import ComplaintList from './ComplaintList.svelte';
  import ComplaintDetail from './ComplaintDetail.svelte';
  import '../../styles/complaints.css';

  let { staff = false } = $props();
  const app = getContext('kspps-portal');
  const controller = createComplaintsController(app, { staff: untrack(() => staff) });
  const model = controller.state;
  let subject = $state('');
  let description = $state('');
  let requestId = $state('');

  onMount(() => {
    void controller.load();
    return () => controller.dispose();
  });

  async function submit(event) {
    event.preventDefault();
    if ($model.busy || isStaticPreview) return;
    requestId ||= globalThis.crypto.randomUUID();
    if (await controller.create({ id: requestId, subject, description })) {
      subject = '';
      description = '';
      requestId = '';
    }
  }
</script>

<div class="complaints" aria-busy={$model.loading || $model.busy}>
  {#if $model.error}
    <p class="complaint-notice complaint-notice--error" role="alert">{$model.error}</p>
  {/if}
  {#if $model.message}
    <p class="complaint-notice complaint-notice--success" role="status">{$model.message}</p>
  {/if}

  {#if $model.detail}
    {#key $model.detail.item.id}
      <ComplaintDetail
        detail={$model.detail}
        assignees={$model.assignees}
        busy={$model.busy}
        {staff}
        {controller}
      />
    {/key}
  {:else}
    {#if !staff}
      <section class="panel complaint-create" aria-labelledby="complaint-create-title">
        <div class="panel-head"><h2 id="complaint-create-title">Sampaikan keluhan</h2></div>
        <p class="subtext">
          Jelaskan kendala Anda. Nomor keluhan diberikan setelah keluhan terkirim.
        </p>
        <form onsubmit={submit}>
          <fieldset disabled={$model.busy || isStaticPreview}>
            <label class="form-field">
              <span>Subjek keluhan</span>
              <input name="subject" bind:value={subject} minlength="5" maxlength="160" required />
            </label>
            <label class="form-field">
              <span>Uraian keluhan</span>
              <textarea
                name="message"
                bind:value={description}
                rows="5"
                minlength="10"
                maxlength="4000"
                required></textarea>
            </label>
            <button type="submit" class="btn">Kirim keluhan</button>
          </fieldset>
        </form>
      </section>
    {/if}
    <ComplaintList
      items={$model.items}
      loading={$model.loading}
      busy={$model.busy}
      {staff}
      onOpen={(id) => controller.open(id)}
      onRefresh={() => controller.load()}
    />
  {/if}
</div>
