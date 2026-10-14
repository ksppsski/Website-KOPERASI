<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  export { BindMemberSubmissionsView };
</script>

{#snippet BindMemberSubmissionsView({ icon })}
  <div class="success-icon"><Content value={icon} /></div>
  <p>Di sistem yang sudah aktif, petunjuk pemulihan akan dikirim ke email terdaftar.</p>
  <p class="dialog-note">Tidak ada email yang dikirim dalam demo ini.</p>
  <div class="form-actions">
    <a class="btn full" href="#masuk">Kembali ke halaman masuk</a>
  </div>
{/snippet}
