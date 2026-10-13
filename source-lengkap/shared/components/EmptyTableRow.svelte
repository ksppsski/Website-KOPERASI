<script>
  let { columns, message = 'Tidak ada data yang sesuai.' } = $props();
</script>

<tr>
  <td colspan={columns}><div class="empty-state">{message}</div></td>
</tr>
