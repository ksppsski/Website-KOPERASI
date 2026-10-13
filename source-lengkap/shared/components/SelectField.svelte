<script>
  let { label, name, items, value, required = true } = $props();
</script>

<label class="form-field">
  <span>{label}{required ? ' *' : ''}</span>
  <select {name} {required}>
    {#each items as item}<option value={item} selected={item === value}
        >{item || 'Pilih salah satu'}</option
      >{/each}
  </select>
</label>
