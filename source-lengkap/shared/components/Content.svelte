<script>
  let { value } = $props();
</script>

{#snippet content(item)}
  {#if Array.isArray(item)}
    {#each item as child}{@render content(child)}{/each}
  {:else if item?.snippet}
    {@render item.snippet(item.props)}
  {:else if item?.component}
    {@const Component = item.component}
    <Component {...item.props} />
  {:else if item !== null && item !== undefined && item !== false}
    {item}
  {/if}
{/snippet}
{@render content(value)}
