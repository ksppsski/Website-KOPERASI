<script>
  import { statusColor } from '../lib/status-colors.js';
  let { text, variant = '' } = $props();
</script>

<span class="badge {statusColor(text, variant)}">{text}</span>
