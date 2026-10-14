<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  export { BindFinanceEventsView };
</script>

{#snippet BindFinanceEventsView({ date })}
  <p>Konfirmasi daftar untuk <Content value={date} /> sudah diperiksa.</p>
  <form id="finance-payout-complete">
    <label class="check"
      ><input name="confirm" type="checkbox" required="" />Nominal dan rekening tujuan sudah sesuai.</label
    >
    <p class="field-hint">
      Ini mencatat pekerjaan persiapan selesai. Status transfer bank tidak berubah.
    </p>
    <p id="finance-error" class="form-error" role="alert" hidden=""></p>
    <button type="submit" class="btn">Simpan waktu selesai</button>
  </form>
{/snippet}
