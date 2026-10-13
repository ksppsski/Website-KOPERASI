<script>
  let { context } = $props();
  let { heading } = $derived(context);
</script>

{#if context}
  {@html heading('Profil Anggota', 'Data pendaftaran yang digunakan pada akad Anda.') ??
    ''}{@html (window.KsppsWorkflow?.memberProfile() || '') ?? ''}
  <div class="wf-profile-link">
    <a class="btn secondary" href="#pengunduran">Pengunduran diri anggota</a>
  </div>
{/if}
