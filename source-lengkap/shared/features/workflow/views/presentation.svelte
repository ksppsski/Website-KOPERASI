<script module>
  import Content from '../../../components/Content.svelte';
  import Region from '../../../components/Region.svelte';
  import { attributeProps } from '../../../runtime/view.js';
  export {
    StatusView,
    AuthView,
    FrameView,
    EmptyView,
    LinksView,
    Links2View,
    Links3View,
    Checks2View,
    ChecksView,
    InputView,
  };
</script>

{#snippet StatusView({ statusColor, statusLabel })}
  <span class={'badge ' + statusColor}><Content value={statusLabel} /></span>
{/snippet}

{#snippet AuthView({ encodeURIComponent })}
  <div class="wf-empty">
    <strong>Masuk untuk melanjutkan</strong>
    <p>Masuk dengan ChatGPT untuk menyimpan pengajuan dan melihat hasil pemeriksaan.</p>
    <a class="btn" target="_top" href={'/signin-with-chatgpt?return_to=' + encodeURIComponent}
      >Lanjutkan dengan ChatGPT</a
    >
  </div>
{/snippet}

{#snippet FrameView({ title, action, key })}
  <section class="panel wf-panel">
    <div class="panel-head">
      <h2><Content value={title} /></h2>
      <Content value={action} />
    </div>
    <div data-workflow={key}><Region name={'workflow:' + key} /></div>
  </section>
{/snippet}

{#snippet EmptyView({ text })}
  <div class="wf-empty"><strong><Content value={text} /></strong></div>
{/snippet}

{#snippet LinksView({ proofUrl })}
  <a class="btn secondary small-btn" href={proofUrl} target="_blank" rel="noopener">Lihat bukti</a>
{/snippet}

{#snippet Links2View({ signedUrl })}
  <a class="btn small-btn" href={signedUrl + '?download=1'}>Unduh akad lengkap</a>
{/snippet}

{#snippet Links3View({ contractUrl })}
  <a class="btn secondary small-btn" href={contractUrl + '?download=1'}>Unduh PDF awal</a>
{/snippet}

{#snippet Checks2View({ fieldName, label })}
  <label class="check"
    ><input type="checkbox" name={fieldName} required="" /><Content value={label} /></label
  >
{/snippet}

{#snippet ChecksView({ itemsRows })}
  <div class="review-checks">
    <h3>Pemeriksaan petugas</h3>
    <Content value={itemsRows} />
  </div>
{/snippet}

{#snippet InputView({ label, fieldName, type, fieldValue, extra })}
  <label class="form-field"
    ><span><Content value={label} /> *</span><input
      name={fieldName}
      {type}
      value={fieldValue}
      {...attributeProps(extra)}
      required=""
    /></label
  >
{/snippet}
