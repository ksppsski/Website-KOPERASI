<script>
  let { rows } = $props();
</script>

<dl class="review-list">
  {#each rows as [label, value]}<div>
      <dt>{label}</dt>
      <dd>{value ?? ''}</dd>
    </div>{/each}
</dl>
