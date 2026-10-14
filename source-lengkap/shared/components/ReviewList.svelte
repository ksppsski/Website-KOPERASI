<script>
  import Content from './Content.svelte';
  let { rows } = $props();
</script>

<dl class="review-list">
  {#each rows as [label, value]}<div>
      <dt>{label}</dt>
      <dd><Content {value} /></dd>
    </div>{/each}
</dl>
