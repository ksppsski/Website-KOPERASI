<script>
  import Content from './Content.svelte';
  let { headers, children, rows = [], empty = 'Belum ada data.' } = $props();
</script>

<div class="table-scroll">
  <table>
    <thead>
      <tr>
        {#each headers as header}<th>{header}</th>{/each}
      </tr>
    </thead>
    <tbody
      >{#if children}{@render children()}
      {:else if rows?.length || rows?.component}<Content value={rows} />
      {:else}<tr><td colspan={headers.length}><div class="empty-state">{empty}</div></td></tr
        >{/if}</tbody
    >
  </table>
</div>
