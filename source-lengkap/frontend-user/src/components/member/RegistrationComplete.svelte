<script>
  import Icon from '../../../../shared/components/Icon.svelte';
  import MemberAuthLayout from './MemberAuthLayout.svelte';

  let { context, wide = false } = $props();
  let { icon, badge, state } = $derived(context);
</script>

{#if context}
  <MemberAuthLayout {context} wide={false}>
    <div class="success-icon"><Icon name={'check'} /></div>
    <span class="badge">Menunggu pemeriksaan</span>
    <h1>Pendaftaran tersimpan.</h1>
    <p class="subtext">Admin akan memeriksa data, foto KTP, bukti simpanan, dan tanda tangan.</p>
    <div class="info-box" style="margin-top:24px">
      <strong>{state.registration.name}</strong><br />Data Anda telah dikirim untuk diperiksa
      petugas.
    </div>
    <div class="form-actions">
      <button type="button" class="btn" data-action="enter-portal">Buka portal anggota</button>
    </div>
  </MemberAuthLayout>
{/if}
