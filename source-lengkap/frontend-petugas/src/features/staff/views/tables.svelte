<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  export {
    CandidatesTable2View,
    CandidatesTableView,
    DepositsTable2View,
    DepositsTableView,
    RequestsTableView,
    MembersTableView,
  };
</script>

{#snippet CandidatesTable2View()}
  <br />
{/snippet}

{#snippet CandidatesTableView({ fieldName, number, replace, rupiah, badge, reviewButton })}
  <tr>
    <td><strong><Content value={fieldName} /></strong><small><Content value={number} /></small></td>
    <td><Content value={replace} /></td>
    <td class="money"><Content value={rupiah} /></td>
    <td><Content value={badge} /></td>
    <td><Content value={reviewButton} /></td>
  </tr>
{/snippet}

{#snippet DepositsTable2View({ proofUrl })}
  <a class="btn secondary small-btn" href={proofUrl} target="_blank" rel="noopener">Lihat bukti</a>
{/snippet}

{#snippet DepositsTableView({ fieldName, memberId, label, rupiah, badge, reference, kindContent })}
  <tr>
    <td
      ><strong><Content value={fieldName} /></strong><small><Content value={memberId} /></small></td
    >
    <td><Content value={label} /></td>
    <td class="money"><Content value={rupiah} /></td>
    <td>
      <Content value={badge} /><small><Content value={reference} /></small>
    </td>
    <td>
      <Content value={kindContent} />
    </td>
  </tr>
{/snippet}

{#snippet RequestsTableView({ type, id, fieldName, purpose, rupiah, badge, button })}
  <tr>
    <td><strong><Content value={type} /></strong><small><Content value={id} /></small></td>
    <td><Content value={fieldName} /><small><Content value={purpose} /></small></td>
    <td class="money"><Content value={rupiah} /></td>
    <td><Content value={badge} /></td>
    <td><Content value={button} /></td>
  </tr>
{/snippet}

{#snippet MembersTableView({ fieldName, number, rupiah, rupiahValue, badge, reviewButton })}
  <tr>
    <td><strong><Content value={fieldName} /></strong><small><Content value={number} /></small></td>
    <td class="money"><Content value={rupiah} /></td>
    <td class="money"><Content value={rupiahValue} /></td>
    <td><Content value={badge} /></td>
    <td><Content value={reviewButton} /></td>
  </tr>
{/snippet}
