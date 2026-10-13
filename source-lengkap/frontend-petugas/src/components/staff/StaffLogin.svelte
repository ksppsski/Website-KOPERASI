<script>
  import Brand from '../../../../shared/components/Brand.svelte';
  import Icon from '../../../../shared/components/Icon.svelte';

  let { context } = $props();
  let { badge, strip } = $derived(context);
</script>

{#if context}
  {@html strip() ?? ''}
  <div class="auth-layout staff-auth">
    <aside class="auth-aside">
      <a href="index.html"><Brand white={true} /></a>
      <div>
        <div class="eyebrow">Ruang kerja petugas</div>
        <h2>Kelola layanan.<br /><em>Dampingi anggota.</em></h2>
        <p>Pendaftaran, setoran, dan akad dalam satu ruang kerja.</p>
        <div class="auth-benefits">
          <span><Icon name={'user'} />Tinjau calon anggota</span><span
            ><Icon name={'wallet'} />Periksa setoran dan rekonsiliasi</span
          ><span><Icon name={'file'} />Siapkan dokumen akad</span>
        </div>
      </div>
      <div class="auth-aside-bottom">KSPPS Syirkah Kebaikan Indonesia</div>
    </aside>
    <main class="auth-main" id="page-main">
      <a class="back-link" href="index.html"><Icon name={'back'} />Kembali ke website</a>
      <div class="auth-card">
        <span class="badge">Akses Petugas</span>
        <h1>Portal Petugas KSPPS</h1>
        <p class="subtext">Ruang kerja internal koperasi.</p>
        {@html (window.KsppsStaffAccess?.entry() || '<p>Memeriksa akses akun…</p>') ?? ''}
        <p id="staff-access-error" class="form-error" role="alert" hidden></p>
        <p class="auth-foot">
          <a target="_top" href="/signout-with-chatgpt?return_to=/petugas.html">Gunakan akun lain</a
          >
        </p>
      </div>
    </main>
  </div>
{/if}
