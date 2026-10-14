<script>
  import { getContext, onDestroy, untrack } from 'svelte';
  import Content from './Content.svelte';
  let { name, value = null } = $props();
  const app = getContext('kspps-portal');
  // The route/dialog owns this region for its whole mounted lifetime.
  const content = untrack(() => app.ui.region(name, value));
  onDestroy(content.release);
</script>

<Content value={$content} />
