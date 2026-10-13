<script>
  let { context } = $props();
  let { esc, badge, workflowItems, dateLabel, reviewButton, heading, table } = $derived(context);
</script>

{#if context}
  {@const items = workflowItems().filter((x) => x.kind === 'capital')}
  {@const ready = items.filter((x) => x.status === 'ready')}
  {@const documents = items.filter((x) => x.contractNumber)}
  {@html heading('Dokumen Akad', 'Siapkan draf setelah data pengajuan dan setoran diperiksa.') ??
    ''}{@html (window.KsppsWorkflow?.staffDocuments() || '') ?? ''}
  <section class="panel">
    <div class="panel-head">
      <h2>Penyiapan akad</h2>
      {@html badge(ready.length + ' pengajuan') ?? ''}
    </div>
    {@html table(
      ['PENGAJUAN', 'ANGGOTA', 'PEMERIKSAAN', ''],
      ready
        .map(
          (x) =>
            `<tr><td><strong>Penyertaan Modal</strong><small>PM-${esc(x.id.slice(0, 8).toUpperCase())}</small></td><td>${esc(x.memberName)}</td><td>${badge('Siap dibuat')}</td><td>${reviewButton(x.id, 'Buat PDF')}</td></tr>`,
        )
        .join(''),
    ) ?? ''}
  </section>
  <section class="panel">
    <div class="panel-head">
      <h2>Daftar dokumen</h2>
      {@html badge(documents.length + ' dokumen') ?? ''}
    </div>
    {@html table(
      ['NOMOR AKAD', 'ANGGOTA', 'JENIS', 'STATUS', ''],
      documents
        .map(
          (x) =>
            `<tr><td><strong>${esc(x.contractNumber)}</strong><small>${dateLabel(x.contractData?.agreementDate + 'T12:00:00Z')}</small></td><td>${esc(x.memberName)}</td><td>Penyertaan Modal</td><td>${badge(x.statusLabel)}</td><td>${reviewButton(x.id, 'Lihat')}</td></tr>`,
        )
        .join(''),
    ) ?? ''}
  </section>
{/if}
