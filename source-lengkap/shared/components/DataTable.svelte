<script>
  let { headers, children } = $props();
</script>

<div class="table-scroll">
  <table>
    <thead>
      <tr>
        {#each headers as header}<th>{header}</th>{/each}
      </tr>
    </thead>
    <tbody>{@render children()}</tbody>
  </table>
</div>
