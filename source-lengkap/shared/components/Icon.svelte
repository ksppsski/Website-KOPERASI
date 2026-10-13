<script>
  import { iconPaths } from '../lib/icons.js';
  let { name } = $props();
</script>

<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"
  ><path d={iconPaths[name] || iconPaths.file} /></svg
>
