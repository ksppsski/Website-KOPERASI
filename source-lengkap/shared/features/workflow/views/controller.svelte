<script module>
  import Content from '../../../components/Content.svelte';
  export { MountView, Mount2View, Mount3View, ViewsView, Views2View };
</script>

{#snippet MountView()}
  <p class="muted" role="status">Memuat pengajuan…</p>
{/snippet}

{#snippet Mount2View({ error, action })}
  <div class="wf-empty" role="alert">
    <p><Content value={error} /></p>
    <Content value={action} />
  </div>
{/snippet}

{#snippet Mount3View()}
  <p class="muted" role="status">Memuat pengajuan…</p>
{/snippet}

{#snippet ViewsView({ fieldName, profileStatus, needsCorrectionContent })}
  <p class="field-hint">
    Pendaftaran <Content value={fieldName} />: <Content value={profileStatus} />
  </p>
  <a class="btn secondary small-btn" href="#profil">Lihat data tersimpan</a><Content
    value={needsCorrectionContent}
  />
{/snippet}

{#snippet Views2View()}
  <p class="field-hint">Data pendaftaran akan tersimpan di akun Anda.</p>
{/snippet}
