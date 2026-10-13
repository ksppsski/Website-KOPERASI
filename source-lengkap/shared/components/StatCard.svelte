<script>
  import Icon from './Icon.svelte';
  let { label, value, icon, note, route } = $props();
</script>

<div class="stat">
  <div class="stat-top">{label}<span class="stat-icon"><Icon name={icon} /></span></div>
  <div class="stat-value">{value}</div>
  <div class="stat-bottom"><span>{note}</span><a href="#{route}">Lihat rincian ↗</a></div>
</div>
