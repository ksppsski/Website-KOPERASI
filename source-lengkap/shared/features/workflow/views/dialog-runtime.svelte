<script module>
  import Content from '../../../components/Content.svelte';
  export { ShowView, EnsureReadyView };
</script>

{#snippet ShowView({ title, content })}
  <div class="dialog-inner">
    <div class="dialog-head">
      <h2 id="dialog-title"><Content value={title} /></h2>
      <button type="button" class="icon-btn" data-wf-action="close" aria-label="Tutup">×</button>
    </div>
    <Content value={content} />
  </div>
{/snippet}

{#snippet EnsureReadyView({ error, action })}
  <p><Content value={error} /></p>
  <Content value={action} />
{/snippet}
