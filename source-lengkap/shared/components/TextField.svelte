<script>
  let { label, name, value = '', options = {} } = $props();
  let {
    type = 'text',
    required = true,
    placeholder = '',
    readonly = false,
    min,
    max,
    pattern,
    maxlength,
  } = $derived(options);
</script>

<label class="form-field">
  <span
    >{label}{#if required}
      <span aria-hidden="true">*</span>{/if}</span
  >
  <input
    {name}
    {type}
    value={value ?? ''}
    {required}
    {readonly}
    placeholder={placeholder || undefined}
    {min}
    {max}
    {pattern}
    {maxlength}
    autocomplete="off"
  />
</label>
