<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  export { ContentView, Content2View, Content4View, Content5View, Content3View, QueueView };
</script>

{#snippet ContentView({ error, button })}
  <p class="form-error" role="alert"><Content value={error} /></p>
  <Content value={button} />
{/snippet}

{#snippet Content2View()}
  <p role="status">Memuat antrean tugas…</p>
{/snippet}

{#snippet Content4View({ label, memberName, startedContent, stage })}
  <tr>
    <td>
      <strong><Content value={label} /></strong><small><Content value={memberName} /></small>
    </td>
    <td>
      <span class="badge blue"><Content value={startedContent} /></span>
    </td>
    <td>
      <a class="btn secondary small-btn" href={'#' + stage}>Buka tugas</a>
    </td>
  </tr>
{/snippet}

{#snippet Content5View()}
  <tr><td colspan="3"><div class="empty-state">Belum ada tugas yang perlu dikerjakan.</div></td></tr
  >
{/snippet}

{#snippet Content3View({ fallbackView })}
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>TUGAS / ANGGOTA</th>
          <th>STATUS</th>
          <th>TINDAKAN</th>
        </tr>
      </thead>
      <tbody>
        <Content value={fallbackView} />
      </tbody>
    </table>
  </div>
{/snippet}

{#snippet QueueView({ content })}
  <section class="panel" data-task-summary="">
    <div class="panel-head">
      <h2>Antrean tugas</h2>
      <span class="field-hint">Terbaru di atas</span>
    </div>
    <Content value={content} />
  </section>
{/snippet}
