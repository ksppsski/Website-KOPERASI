<script>
  import Icon from './Icon.svelte';
  let { id = '', label = 'Periksa', registration = false } = $props();
</script>

<button
  type="button"
  class="btn secondary small-btn"
  data-wf-action={registration ? 'registration-review' : 'review'}
  data-id={id}
>
  {label}
  <Icon name="chevron" />
</button>
