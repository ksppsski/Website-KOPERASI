<script>
  import Brand from '../../../../shared/components/Brand.svelte';

  let { symbol = false } = $props();
</script>

<span class={symbol ? 'ski-original-symbol' : 'ski-original-brand'} aria-hidden="true">
  <Brand />
</span>
