<script>
  import Content from './Content.svelte';
  let { title, description, action = null, children } = $props();
</script>

<div class="page-heading">
  <div>
    <h1>{title}</h1>
    <p class="subtext">{description}</p>
  </div>
  {#if children}{@render children()}{:else}<Content value={action} />{/if}
</div>
