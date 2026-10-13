<script>
  let { context } = $props();
  let { accountRows, accounts } = $derived(context);
</script>

{#if context}
  <div class="page-heading">
    <div>
      <h1>Akses Petugas</h1>
      <p class="subtext">Cocokkan akun dan kode permintaan sebelum memberikan akses.</p>
    </div>
    <button class="btn secondary" data-access-action="accounts">Perbarui</button>
  </div>
  <section class="panel"><div id="staff-account-list">{@html accountRows() ?? ''}</div></section>
  <p class="field-hint">
    Admin dan Finance bekerja sesuai hak aksesnya. Avalist hanya melihat referensi dan bagi hasil
    miliknya. Manajer mengelola penetapan dan hak akses.
  </p>
{/if}
