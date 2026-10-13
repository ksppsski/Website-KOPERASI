<script>
  import TextField from '../../../../shared/components/TextField.svelte';
  import Icon from '../../../../shared/components/Icon.svelte';
  import MemberAuthLayout from './MemberAuthLayout.svelte';

  let { context, wide = false } = $props();
  let { icon, badge, field } = $derived(context);
</script>

{#if context}
  <MemberAuthLayout {context} wide={false}>
    <span class="badge">Portal Anggota</span>
    <h1>Selamat datang kembali.</h1>
    <p class="subtext">Masuk untuk melihat layanan keanggotaan Anda.</p>
    <form id="login-form">
      <TextField
        label={'Email'}
        name={'email'}
        value={''}
        options={{ type: 'email', placeholder: 'Email contoh' }}
      /><label class="form-field"
        ><span>Kata sandi</span>
        <div class="password-field">
          <input
            name="password"
            id="login-password"
            type="password"
            placeholder="Kata sandi contoh"
            required
            autocomplete="off"
          /><button
            type="button"
            class="icon-btn"
            data-action="show-password"
            aria-label="Tampilkan kata sandi"
            aria-pressed="false"><Icon name={'eye'} /></button
          >
        </div></label
      >
      <div class="form-meta"><a href="#lupa-sandi">Lupa kata sandi?</a></div>
      <p class="form-error" id="login-error" role="alert" hidden></p>
      <button class="btn full" type="submit">Masuk ke portal <Icon name={'arrow'} /></button>
    </form>
    <div class="divider">atau jelajahi dulu</div>
    <button class="btn secondary full" type="button" data-action="enter-portal"
      >Jelajahi portal anggota</button
    >
    <p class="demo-hint">
      Form login masih simulasi; gunakan data contoh. Data portal dibuka dengan ChatGPT.
    </p>
    <p class="auth-foot">Belum menjadi anggota? <a href="#daftar">Daftar anggota</a></p>
  </MemberAuthLayout>
{/if}
