<script>
  import Region from '../../../../shared/components/Region.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  import { getContext } from 'svelte';
  const app = getContext('kspps-portal');
  import Brand from '../../../../shared/components/Brand.svelte';
  import Icon from '../../../../shared/components/Icon.svelte';
  import Badge from '../../../../shared/components/Badge.svelte';

  let { context, route, key = route, children } = $props();
  let { icon, navLink, demoStrip, state, pages } = $derived(context);
</script>

{#if context}
  <div class="portal-shell">
    <button
      class="mobile-scrim"
      type="button"
      data-action="close-sidebar"
      aria-label="Tutup navigasi"
    ></button>
    <aside class="sidebar" id="sidebar">
      <a href="index.html"><Brand /></a>
      <div class="eyebrow">Keanggotaan</div>
      <nav class="side-nav" aria-label="Menu anggota">
        {#each Object.entries(pages) as [key, [label, ico]]}
          <a
            href={'#' + key}
            class:active={route === key}
            aria-current={route === key ? 'page' : undefined}
          >
            <Icon name={ico} />{label}
          </a>
        {/each}
      </nav>
      <div class="side-bottom">
        <div class="side-help">
          <h3>Butuh pendampingan?</h3>
          <p>Tim koperasi siap membantu Anda.</p>
          <a class="btn secondary full" href="#bantuan">Hubungi tim <Icon name={'arrow'} /></a>
        </div>
        <div class="sidebar-foot">
          <a href="index.html"><Icon name={'home'} />Website KSPPS</a><button
            type="button"
            data-action="logout"><Icon name={'logout'} />Keluar dari demo</button
          >
        </div>
      </div>
    </aside>
    <div class="portal-main">
      <header class="topbar">
        <button
          class="icon-btn mobile-menu"
          type="button"
          data-action="open-sidebar"
          aria-controls="sidebar"
          aria-expanded="false"
          aria-label="Buka navigasi"><Icon name={'menu'} /></button
        >
        <div class="breadcrumb">
          Portal Anggota <Icon name={'chevron'} /><b>{pages[route][0]}</b>
        </div>
        <div class="topbar-end">
          <Badge text={'Pratinjau'} /><button
            type="button"
            class="icon-btn"
            data-action="notifications"
            aria-label="Lihat pemberitahuan"><Icon name={'bell'} /></button
          ><a class="member-chip" href="#profil" aria-label="Profil anggota"
            ><span class="avatar">{(state.profile.name || 'A').slice(0, 1)}</span>
            <div>
              <strong>{state.profile.name || 'Calon anggota'}</strong><small
                >{app.services.workflow?.getProfile()?.memberNumber ||
                  (state.savedProfile ? 'Pendaftaran tersimpan' : 'Belum terdaftar')}</small
              >
            </div></a
          >
        </div>
      </header>
      <Content value={demoStrip() ?? ''} />
      <main class="portal-content" id="page-main" tabindex="-1">
        <div data-workflow="page-access"><Region name={'workflow:' + 'page-access'} /></div>
        {@render children()}
        <footer class="portal-footer">
          <span>© 2026 KSPPS Syirkah Kebaikan Indonesia</span><span
            >Portal konsep · Gunakan data contoh untuk pengujian.</span
          >
        </footer>
      </main>
    </div>
  </div>
{/if}
