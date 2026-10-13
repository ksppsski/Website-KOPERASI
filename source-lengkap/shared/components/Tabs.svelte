<script>
  let { items, current, name } = $props();
</script>

<div class="tabs" role="group" aria-label="Filter {name}">
  {#each items as item}
    <button type="button" aria-pressed={current === item} data-tab={name} data-value={item}
      >{item}</button
    >
  {/each}
</div>
