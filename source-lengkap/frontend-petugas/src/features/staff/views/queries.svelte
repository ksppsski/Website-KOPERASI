<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  export { ReviewButtonView, ActivityLogsView, ActivityLogs2View };
</script>

{#snippet ReviewButtonView({ registrationContent, id, label, icon })}
  <button
    type="button"
    class="btn secondary small-btn"
    data-wf-action={registrationContent}
    data-id={id}
  >
    <Content value={label} />
    <Content value={icon} />
  </button>
{/snippet}

{#snippet ActivityLogsView({ text, dateLabel })}
  <div class="log-item">
    <Content value={text} /><small><Content value={dateLabel} /></small>
  </div>
{/snippet}

{#snippet ActivityLogs2View()}
  <div class="empty-state">Belum ada aktivitas pemeriksaan.</div>
{/snippet}
