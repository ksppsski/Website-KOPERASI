<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  import { attributeProps } from '../../../../../shared/runtime/view.js';
  import Region from '../../../../../shared/components/Region.svelte';
  export {
    ButtonView,
    CardView,
    Card2View,
    PanelBodyView,
    PanelBody2View,
    PanelView,
    ResultsView,
    Results2View,
    Results4View,
    Results5View,
    Results7View,
    Results8View,
    Results9View,
    Results6View,
    Results10View,
    Results3View,
  };
</script>

{#snippet ButtonView({ action, extra, label })}
  <button
    type="button"
    class="btn secondary small-btn"
    data-activity-action={action}
    {...attributeProps(extra)}
  >
    <Content value={label} />
  </button>
{/snippet}

{#snippet CardView()}
  <p class="field-hint">Tahap ini belum tersedia.</p>
{/snippet}

{#snippet Card2View({ label, completedContent, completedContent2, canStartContent })}
  <div class="work-head">
    <strong><Content value={label} /></strong><span class={'badge ' + completedContent}
      ><Content value={completedContent2} /></span
    >
  </div>
  <Content value={canStartContent} />
  <p class="work-error form-error" role="alert" hidden=""></p>
{/snippet}

{#snippet PanelBodyView({ error, button })}
  <p class="form-error"><Content value={error} /></p>
  <Content value={button} />
{/snippet}

{#snippet PanelBody2View()}
  <p class="muted" role="status">Memuat tahap pekerjaan…</p>
{/snippet}

{#snippet PanelView({ target, stage, panelBody })}
  <section class="work-timemark" data-work-target={target} data-work-stage={stage}>
    <div data-work-body=""><Region name={'work:' + target + ':' + stage} value={panelBody} /></div>
  </section>
{/snippet}

{#snippet ResultsView({ error, button })}
  <div class="panel">
    <p class="form-error" role="alert"><Content value={error} /></p>
    <Content value={button} />
  </div>
{/snippet}

{#snippet Results2View()}
  <section class="panel"><p role="status">Memuat catatan kerja…</p></section>
{/snippet}

{#snippet Results4View({ label, fieldValue })}
  <div class="stat">
    <div class="stat-top"><Content value={label} /></div>
    <div class="stat-value"><Content value={fieldValue} /></div>
  </div>
{/snippet}

{#snippet Results5View({ roleLabel, completed, duration, responseN, durationValue, processingN })}
  <tr>
    <td><strong><Content value={roleLabel} /></strong></td>
    <td><Content value={completed} /></td>
    <td><Content value={duration} /><small><Content value={responseN} /> catatan lengkap</small></td
    >
    <td>
      <Content value={durationValue} /><small><Content value={processingN} /> catatan lengkap</small
      >
    </td>
  </tr>
{/snippet}

{#snippet Results7View()}
  <small>Riwayat lama</small>
{/snippet}

{#snippet Results8View({ time })}
  <small>Ditutup <Content value={time} /></small>
{/snippet}

{#snippet Results9View()}
  <small>Waktu mulai belum tercatat</small>
{/snippet}

{#snippet Results6View({
  label,
  memberName,
  roleLabel,
  startedByContent,
  startsWithContent,
  legacyContent,
  time,
  startedAtContent,
  completedAtContent,
  closedAtContent,
  duration,
  durationValue,
  statusColor,
  statusLabel,
  completedAtContent2,
})}
  <tr>
    <td>
      <strong><Content value={label} /></strong><small><Content value={memberName} /></small><small
        ><Content value={roleLabel} /><Content value={startedByContent} />
        ·
        <Content value={startsWithContent} /></small
      ><Content value={legacyContent} />
    </td>
    <td><Content value={time} /></td>
    <td>
      <Content value={startedAtContent} />
    </td>
    <td>
      <Content value={completedAtContent} /><Content value={closedAtContent} />
    </td>
    <td>
      Respons <Content value={duration} /><small>Pengerjaan <Content value={durationValue} /></small
      >
    </td>
    <td>
      <span class={'badge ' + statusColor}><Content value={statusLabel} /></span><Content
        value={completedAtContent2}
      />
    </td>
  </tr>
{/snippet}

{#snippet Results10View()}
  <tr
    ><td colspan="6"
      ><div class="empty-state">
        Belum ada catatan yang sesuai. Waktu masuk tercatat saat anggota mengirim pengajuan.
      </div></td
    ></tr
  >
{/snippet}

{#snippet Results3View({ statsRows, RowsRows, length, fallbackView })}
  <div class="stats work-stats">
    <Content value={statsRows} />
  </div>
  <section class="panel">
    <div class="panel-head">
      <h2>Ringkasan per peran</h2>
      <span class="field-hint">Sesuai filter</span>
    </div>
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>PERAN</th>
            <th>TAHAP SELESAI</th>
            <th>RATA-RATA RESPONS</th>
            <th>RATA-RATA PENGERJAAN</th>
          </tr>
        </thead>
        <tbody>
          <Content value={RowsRows} />
        </tbody>
      </table>
    </div>
  </section>
  <section class="panel">
    <div class="panel-head">
      <h2>Riwayat tahap pekerjaan</h2>
      <span class="badge gray"><Content value={length} /> catatan</span>
    </div>
    <div class="table-scroll">
      <table class="work-table">
        <thead>
          <tr>
            <th>TUGAS / PETUGAS</th>
            <th>MASUK</th>
            <th>MULAI</th>
            <th>SELESAI</th>
            <th>DURASI</th>
            <th>STATUS</th>
          </tr>
        </thead>
        <tbody>
          <Content value={fallbackView} />
        </tbody>
      </table>
    </div>
  </section>
{/snippet}
