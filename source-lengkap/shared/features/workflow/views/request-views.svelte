<script module>
  import Content from '../../../components/Content.svelte';
  import { attributeProps } from '../../../runtime/view.js';
  export {
    MemberCards4View,
    MemberCards3View,
    MemberCards5View,
    MemberCards6View,
    MemberCards7View,
    MemberCards8View,
    MemberCards2View,
    MemberCardsView,
    StaffTable2View,
    StaffTable5View,
    StaffTable6View,
    StaffTable4View,
    StaffTable3View,
    StaffTableView,
    OverviewView,
  };
</script>

{#snippet MemberCards4View({ projectCode, offerTitle })}
  <p class="offer-code">
    <Content value={projectCode} /> · <Content value={offerTitle} />
  </p>
{/snippet}

{#snippet MemberCards3View({ money, proofName, projectCodeContent })}
  <div class="wf-amount"><Content value={money} /></div>
  <p class="wf-proof-name"><Content value={proofName} /></p>
  <Content value={projectCodeContent} />
{/snippet}

{#snippet MemberCards5View({ reason })}
  <p class="wf-reason"><Content value={reason} /></p>
{/snippet}

{#snippet MemberCards6View({ note })}
  <div class="wf-note">
    <strong>Catatan Finance</strong>
    <p><Content value={note} /></p>
  </div>
{/snippet}

{#snippet MemberCards7View({ kindContent, note })}
  <div class="wf-note">
    <strong><Content value={kindContent} /></strong>
    <p><Content value={note} /></p>
  </div>
{/snippet}

{#snippet MemberCards8View({ date })}
  <p class="field-hint">Keputusan Admin · <Content value={date} /></p>
{/snippet}

{#snippet MemberCards2View({
  shortId,
  date,
  status,
  includesContent,
  statusContent,
  noteContent,
  kindContent,
  kindContent2,
  links,
  needsCorrectionContent,
  kindContent3,
})}
  <article class="wf-card">
    <div class="wf-card-head">
      <div><strong><Content value={shortId} /></strong><small><Content value={date} /></small></div>
      <Content value={status} />
    </div>
    <Content value={includesContent} /><Content value={statusContent} /><Content
      value={noteContent}
    /><Content value={kindContent} /><Content value={kindContent2} />
    <div class="wf-actions">
      <Content value={links} /><Content value={needsCorrectionContent} /><Content
        value={kindContent3}
      />
    </div>
  </article>
{/snippet}

{#snippet MemberCardsView({ itemsRows })}
  <div class="wf-cards">
    <Content value={itemsRows} />
  </div>
{/snippet}

{#snippet StaffTable2View({ fieldValue, valueContent, label })}
  <option value={fieldValue} {...attributeProps(valueContent)}><Content value={label} /></option>
{/snippet}

{#snippet StaffTable5View({ projectCode })}
  <small class="offer-code"><Content value={projectCode} /></small>
{/snippet}

{#snippet StaffTable6View({ label })}
  <small><Content value={label} /></small>
{/snippet}

{#snippet StaffTable4View({
  memberName,
  shortId,
  memberId,
  projectCodeContent,
  kindContent,
  status,
  kindContent2,
  action,
})}
  <tr>
    <td>
      <strong><Content value={memberName} /></strong><small
        ><Content value={shortId} /> · <Content value={memberId} /></small
      ><Content value={projectCodeContent} />
    </td>
    <td><Content value={kindContent} /></td>
    <td>
      <Content value={status} /><Content value={kindContent2} />
    </td>
    <td>
      <Content value={action} />
    </td>
  </tr>
{/snippet}

{#snippet StaffTable3View({ kindContent, itemsRows })}
  <div class="table-scroll">
    <table>
      <thead>
        <tr>
          <th>ANGGOTA / PENGAJUAN</th>
          <th><Content value={kindContent} /></th>
          <th>STATUS</th>
          <th>TINDAKAN</th>
        </tr>
      </thead>
      <tbody>
        <Content value={itemsRows} />
      </tbody>
    </table>
  </div>
{/snippet}

{#snippet StaffTableView({ filterKey, statusesRows, lengthContent })}
  <div class="toolbar">
    <label class="wf-filter"
      >Status
      <select class="filter-select" data-wf-filter={filterKey}>
        <option value="">Semua status</option>
        <Content value={statusesRows} />
      </select></label
    >
  </div>
  <Content value={lengthContent} />
{/snippet}

{#snippet OverviewView({ capital, withdrawal })}
  <div class="wf-overview">
    <a href="#penyertaan"
      ><strong><Content value={capital} /></strong><span>Draf penyertaan modal</span></a
    ><a href="#pengunduran"
      ><strong><Content value={withdrawal} /></strong><span>Pengunduran diri</span></a
    >
  </div>
{/snippet}
