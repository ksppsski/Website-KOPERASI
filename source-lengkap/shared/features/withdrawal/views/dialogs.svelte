<script module>
  import Content from '../../../components/Content.svelte';
  export {
    ShowView,
    ErrorBlockView,
    Detail2View,
    Detail3View,
    DetailView,
    Record2View,
    RecordView,
    FinancingDetailView,
    FinancingDetail2View,
  };
</script>

{#snippet ShowView({ title, button, body })}
  <div class="dialog-inner">
    <div class="dialog-head">
      <h2 id="dialog-title"><Content value={title} /></h2>
      <Content value={button} />
    </div>
    <Content value={body} />
  </div>
{/snippet}

{#snippet ErrorBlockView()}
  <p id="resign-error" class="form-error" role="alert" hidden=""></p>
{/snippet}

{#snippet Detail2View()}
  <p class="info-box">
    Persetujuan ini menutup keanggotaan dan menonaktifkan nomor anggota secara permanen.
  </p>
{/snippet}

{#snippet Detail3View({ field, fieldValue, fieldValueValue, fieldValueValueValue })}
  <Content value={field} /><Content value={fieldValue} /><Content value={fieldValueValue} /><Content
    value={fieldValueValueValue}
  />
  <p class="field-hint">Maksimal 10 MB. Catat setelah transfer berhasil.</p>
{/snippet}

{#snippet DetailView({
  managerContent,
  id,
  version,
  managerContent2,
  managerContent3,
  errorBlock,
  managerContent4,
})}
  <form id={'resign-' + managerContent + '-form'} data-id={id} data-version={version}>
    <Content value={managerContent2} /><label class="check"
      ><input name="confirm" type="checkbox" required="" /><Content
        value={managerContent3}
      /></label
    ><Content value={errorBlock} />
    <div class="form-actions">
      <button class="btn" type="submit">
        <Content value={managerContent4} />
      </button>
    </div>
  </form>
{/snippet}

{#snippet Record2View({ id, memberNumber, fieldName })}
  <option value={id}>
    <Content value={memberNumber} /> · <Content value={fieldName} />
  </option>
{/snippet}

{#snippet RecordView({
  psRows,
  field,
  fieldValue,
  fieldValueValue,
  fieldValueValueValue,
  fieldValueValueValueValue,
  errorBlock,
})}
  <form id="resign-financing-form">
    <label class="form-field"
      ><span>Anggota *</span><select name="profileId" required="">
        <option value="">Pilih anggota</option>
        <Content value={psRows} />
      </select></label
    ><Content value={field} /><Content value={fieldValue} /><Content value={fieldValueValue} />
    <div class="form-row">
      <Content value={fieldValueValueValue} /><Content value={fieldValueValueValueValue} />
    </div>
    <label class="check"
      ><input type="checkbox" name="confirm" required="" />Data sesuai kontrak pembiayaan yang telah
      disepakati anggota.</label
    >
    <p class="field-hint">
      Anggota tidak dapat mengundurkan diri sampai kontrak dicatat lunas, termasuk jika sudah lewat
      jatuh tempo.
    </p>
    <Content value={errorBlock} /><button class="btn" type="submit">Simpan kontrak</button>
  </form>
{/snippet}

{#snippet FinancingDetailView({ date, settlementNote })}
  <p class="info-box">
    Dicatat lunas <Content value={date} /> · <Content value={settlementNote} />
  </p>
{/snippet}

{#snippet FinancingDetail2View({ id, errorBlock })}
  <form id="resign-settle-form" data-id={id}>
    <label class="form-field"
      ><span>Referensi pemeriksaan pelunasan *</span><textarea
        name="note"
        minlength="5"
        maxlength="1500"
        required=""></textarea></label
    ><label class="check"
      ><input type="checkbox" name="confirm" required="" />Seluruh kewajiban kontrak telah lunas dan
      sudah diperiksa.</label
    ><Content value={errorBlock} /><button class="btn" type="submit">Catat lunas</button>
  </form>
{/snippet}
