<script module>
  import Content from '../../../components/Content.svelte';
  export { BindWorkflowInteractionsView };
</script>

{#snippet BindWorkflowInteractionsView({ action, actionValue })}
  <p>Permohonan pengunduran diri ini akan dibatalkan. Keanggotaan Anda tetap aktif.</p>
  <p class="form-error" id="wf-error" role="alert" hidden=""></p>
  <div class="form-actions">
    <Content value={action} /><Content value={actionValue} />
  </div>
{/snippet}
