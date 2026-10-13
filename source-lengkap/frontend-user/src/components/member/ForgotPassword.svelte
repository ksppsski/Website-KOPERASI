<script>
  import Icon from '../../../../shared/components/Icon.svelte';
  import TextField from '../../../../shared/components/TextField.svelte';
  import MemberAuthLayout from './MemberAuthLayout.svelte';

  let { context, wide = false } = $props();
  let { icon, stat } = $derived(context);
</script>

{#if context}
  <MemberAuthLayout {context} wide={false}>
    <div class="stat-icon"><Icon name={'shield'} /></div>
    <h1>Lupa kata sandi?</h1>
    <p class="subtext">Masukkan email yang terdaftar pada akun Anda.</p>
    <form id="forgot-form">
      <TextField label={'Email'} name={'email'} value={''} options={{ type: 'email' }} /><button
        class="btn full">Lanjutkan <Icon name={'arrow'} /></button
      >
    </form>
    <p class="demo-hint">Ini simulasi pemulihan akun. Email tidak dikirim.</p>
    <p class="auth-foot"><a href="#masuk">Kembali ke halaman masuk</a></p>
  </MemberAuthLayout>
{/if}
