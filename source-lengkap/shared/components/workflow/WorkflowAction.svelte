<script>
  let { name, id = '', label, primary = false } = $props();
</script>

<button
  type="button"
  class="btn {primary ? '' : 'secondary'} small-btn"
  data-wf-action={name}
  data-id={id}>{label}</button
>
