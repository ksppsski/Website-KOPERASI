<script module>
  import Content from '../../../../../shared/components/Content.svelte';
  export { BindMemberSubmissionsView };
</script>

{#snippet BindMemberSubmissionsView({ icon })}
  <div class="stat-icon"><Content value={icon} /></div>
  <p>Pemulihan kata sandi tidak tersedia melalui formulir ini.</p>
  <div class="form-actions">
    <a class="btn full" href="#masuk">Kembali ke halaman masuk</a>
  </div>
{/snippet}
