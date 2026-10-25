<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  export {
    SavingsRowsView,
    SavingsRows2View,
    RequestPanel3View,
    RequestPanel2View,
    RequestPanel4View,
    RequestPanelView,
    DocumentCardsView,
    DocumentCards2View,
  };
</script>

{#snippet SavingsRowsView({ date, type, note, rupiah, badge })}
  <tr>
    <td><Content value={date} /></td>
    <td><Content value={type} /><small><Content value={note} /></small></td>
    <td class="money"><Content value={rupiah} /></td>
    <td><Content value={badge} /></td>
  </tr>
{/snippet}

{#snippet SavingsRows2View()}
  <tr><td colspan="4"><div class="empty-state">Setoran yang dicari belum ditemukan.</div></td></tr>
{/snippet}

{#snippet RequestPanel3View({ id, purpose, rupiah, badge })}
  <tr>
    <td><Content value={id} /></td>
    <td><Content value={purpose} /></td>
    <td class="money"><Content value={rupiah} /></td>
    <td><Content value={badge} /></td>
  </tr>
{/snippet}

{#snippet RequestPanel2View({ rsRows })}
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>NO. PENGAJUAN</th>
          <th>KEBUTUHAN</th>
          <th class="money">NILAI</th>
          <th>STATUS</th>
        </tr>
      </thead>
      <tbody>
        <Content value={rsRows} />
      </tbody>
    </table>
  </div>
{/snippet}

{#snippet RequestPanel4View({ icon })}
  <div class="empty-state">
    <Content value={icon} /><strong>Belum ada pengajuan.</strong>Mulai dari tombol Ajukan
    pembiayaan di atas.
  </div>
{/snippet}

{#snippet RequestPanelView({ badge, lengthContent })}
  <section class="panel" style="margin-top:22px">
    <div class="panel-head">
      <h2>Pengajuan Anda</h2>
      <Content value={badge} />
    </div>
    <Content value={lengthContent} />
  </section>
{/snippet}

{#snippet DocumentCardsView({ icon, title, number, shortDate, badge, url, iconValue, urlValue })}
  <article class="document-card">
    <div class="document-icon"><Content value={icon} /></div>
    <h2><Content value={title} /></h2>
    <p><Content value={number} /> · <Content value={shortDate} /></p>
    <Content value={badge} /><a class="btn secondary" href={url} target="_blank" rel="noopener"
      ><Content value={iconValue} />Lihat PDF</a
    ><a class="small" href={urlValue + '?download=1'}>Unduh PDF</a>
  </article>
{/snippet}

{#snippet DocumentCards2View()}
  <div class="empty-state">
    Belum ada dokumen yang sesuai. Surat keanggotaan tersedia setelah rekonsiliasi simpanan; akad
    setelah PDF lengkap diunggah petugas.
  </div>
{/snippet}
