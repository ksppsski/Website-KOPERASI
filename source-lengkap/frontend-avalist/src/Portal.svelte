<script>
  import { createAvalistClient } from './features/client.js';
  import ThemeToggle from '../../shared/components/ThemeToggle.svelte';
  import { createLifecycle } from '../../shared/runtime/lifecycle.js';
  import { createRequest } from '../../shared/runtime/request.js';
  const scope = createLifecycle();
  const request = createRequest(scope, { portal: 'avalist' });
  import { onMount, tick } from 'svelte';
  import Brand from '../../shared/components/Brand.svelte';
  import Icon from '../../shared/components/Icon.svelte';
  import Badge from '../../shared/components/Badge.svelte';
  import PersonalView from '../../shared/components/avalist/PersonalView.svelte';
  const pages = {
    'avalist-ringkasan': ['Ringkasan Avalist', 'home'],
    'avalist-anggota': ['Anggota Referensi', 'user'],
    'avalist-rincian': ['Rincian Bagian', 'wallet'],
    'avalist-riwayat': ['Riwayat Pembayaran', 'file'],
  };
  let route = $state('avalist-ringkasan'),
    phase = $state('loading'),
    identity = $state(null),
    data = $state(null),
    error = $state(''),
    loading = $state(false),
    menuOpen = $state(false);
  let generation = 0;
  const signIn = '/signin-with-chatgpt?return_to=' + encodeURIComponent('/avalist.html');
  const signOut = '/signout-with-chatgpt?return_to=/avalist.html';
  const { get } = createAvalistClient(request);
  async function load() {
    const gen = ++generation;
    loading = true;
    error = '';
    try {
      const access = await get('/access');
      if (gen !== generation) return;
      identity = access.identity;
      if (!access.allowed) {
        data = null;
        phase = 'denied';
        return;
      }
      const personal = await get('?view=personal');
      if (gen !== generation) return;
      data = personal;
      phase = 'ready';
    } catch (e) {
      if (gen !== generation) return;
      data = null;
      phase = e.status === 401 ? 'anonymous' : e.status === 403 ? 'denied' : 'error';
      if (phase === 'anonymous') identity = null;
      if (phase === 'error') error = e.message;
    } finally {
      if (gen === generation) loading = false;
    }
  }
  function readRoute() {
    const hash = location.hash.slice(1);
    route = Object.hasOwn(pages, hash) ? hash : 'avalist-ringkasan';
    if (hash !== route) history.replaceState(null, '', '#' + route);
    menuOpen = false;
    document.title = pages[route][0] + ' · Portal Avalist KSPPS';
  }
  async function navigate() {
    readRoute();
    await tick();
    document.getElementById('page-main')?.focus();
    window.scrollTo(0, 0);
  }
  function escapeMenu(event) {
    if (event.key === 'Escape' && menuOpen) {
      menuOpen = false;
      document.getElementById('avalist-menu-toggle')?.focus();
    }
  }
  onMount(() => {
    readRoute();
    void load();
    window.addEventListener('hashchange', navigate);
    window.addEventListener('focus', load);
    window.addEventListener('keydown', escapeMenu);
    return () => {
      generation++;
      scope.dispose();
      window.removeEventListener('hashchange', navigate);
      window.removeEventListener('focus', load);
      window.removeEventListener('keydown', escapeMenu);
    };
  });
</script>

<ThemeToggle />
<a
  class="skip-link"
  href="#page-main"
  onclick={(event) => {
    event.preventDefault();
    document.getElementById('page-main')?.focus();
  }}>Lewati ke konten</a
>
{#if phase === 'ready' && data}
  <div class="portal-shell avalist-shell">
    <button
      type="button"
      class="mobile-scrim"
      class:show={menuOpen}
      aria-label="Tutup navigasi"
      onclick={() => (menuOpen = false)}
    ></button>
    <aside class="sidebar" class:open={menuOpen} id="avalist-sidebar">
      <button
        class="icon-btn avalist-menu-close"
        type="button"
        aria-label="Tutup navigasi"
        onclick={() => (menuOpen = false)}><Icon name="close" /></button
      >
      <a href="index.html"><Brand /></a>
      <div class="avalist-label">PORTAL AVALIST</div>
      <nav class="side-nav" aria-label="Menu avalist">
        {#each Object.entries(pages) as [key, [label, icon]]}
          <a
            href={'#' + key}
            onclick={() => (menuOpen = false)}
            class:active={route === key}
            aria-current={route === key ? 'page' : undefined}><Icon name={icon} />{label}</a
          >
        {/each}
      </nav>
      <div class="side-bottom">
        <div class="avalist-account">
          <strong>{data.person?.name || identity?.name || 'Avalist'}</strong><small
            >{identity?.email || ''}</small
          >
        </div>
        <div class="sidebar-foot">
          <a href="index.html"><Icon name="home" />Website KSPPS</a><a href={signOut} target="_top"
            ><Icon name="logout" />Keluar</a
          >
        </div>
      </div>
    </aside>
    <div class="portal-main">
      <header class="topbar">
        <button
          id="avalist-menu-toggle"
          type="button"
          class="icon-btn mobile-menu"
          aria-label="Buka navigasi"
          aria-controls="avalist-sidebar"
          aria-expanded={menuOpen}
          onclick={() => (menuOpen = !menuOpen)}><Icon name="menu" /></button
        >
        <div class="breadcrumb">Portal Avalist <Icon name="chevron" /><b>{pages[route][0]}</b></div>
        <div class="topbar-end">
          <Badge text="Avalist" variant="blue" /><span class="avatar">AV</span>
        </div>
      </header>
      <main class="portal-content" id="page-main" tabindex="-1">
        <div class="av-page">
          <div class="page-heading">
            <div>
              <h1>{pages[route][0]}</h1>
              <p class="subtext">Referensi dan hak bagi hasil milik Anda.</p>
            </div>
            <button class="btn secondary" disabled={loading} onclick={load}
              >{loading ? 'Memuat…' : 'Perbarui'}</button
            >
          </div>
          <PersonalView {data} {route} />
        </div>
        <footer class="portal-footer">
          <span>© 2026 KSPPS Syirkah Kebaikan Indonesia</span><span>Portal Avalist</span>
        </footer>
      </main>
    </div>
  </div>
{:else}
  <div class="auth-layout avalist-auth">
    <aside class="auth-aside">
      <a href="index.html"><Brand white={true} /></a>
      <div>
        <div class="eyebrow">Portal Avalist</div>
        <h2>Hubungkan kebaikan.<br /><em>Pantau hasilnya.</em></h2>
        <p>Ruang pribadi untuk melihat anggota referensi dan hak bagi hasil Anda.</p>
        <div class="auth-benefits">
          <span><Icon name="user" />Anggota referensi</span><span
            ><Icon name="wallet" />Rincian bagian Anda</span
          ><span><Icon name="file" />Riwayat pembayaran</span>
        </div>
      </div>
      <div class="auth-aside-bottom">KSPPS Syirkah Kebaikan Indonesia</div>
    </aside>
    <main class="auth-main" id="page-main" tabindex="-1">
      <a class="back-link" href="index.html"><Icon name="back" />Kembali ke website</a>
      <div class="auth-card">
        <Badge text="Akses Avalist" variant="blue" />
        <h1>Portal Avalist</h1>
        {#if phase === 'loading'}<p role="status">Memeriksa akses avalist…</p>
        {:else if phase === 'anonymous'}
          <p class="subtext">
            Masuk menggunakan akun ChatGPT dengan email yang telah didaftarkan Manajer sebagai
            avalist.
          </p>
          <a class="btn full" href={signIn} target="_top">Masuk sebagai Avalist</a>
        {:else if phase === 'denied'}
          <h2>Akses Avalist belum tersedia</h2>
          {#if identity?.email}<p class="avalist-email">{identity.email}</p>{/if}
          <p class="subtext">
            Minta Manajer memeriksa pendaftaran email dan akses Avalist Anda. Setelah dikonfirmasi,
            periksa akses kembali.
          </p>
          <button class="btn full" disabled={loading} onclick={load}
            >{loading ? 'Memeriksa…' : 'Periksa akses'}</button
          >
          <a class="btn secondary full" href={signOut} target="_top">Gunakan akun lain</a>
        {:else}
          <p class="form-error" role="alert">
            {error || 'Portal belum dapat dimuat. Silakan coba lagi.'}
          </p>
          <button class="btn full" disabled={loading} onclick={load}
            >{loading ? 'Memuat…' : 'Coba lagi'}</button
          >
        {/if}
        <p class="auth-foot">Email belum terdaftar? Hubungi Manajer koperasi.</p>
      </div>
    </main>
  </div>
{/if}
<noscript>Aktifkan JavaScript untuk menggunakan Portal Avalist.</noscript>
