<script>
  import Region from '../../../../shared/components/Region.svelte';
  import Content from '../../../../shared/components/Content.svelte';
  import Icon from '../../../../shared/components/Icon.svelte';
  import Brand from '../../../../shared/components/Brand.svelte';

  let { context, route, key = route, children } = $props();
  let { icon, badge, pages, activeRole, menuPages, roleName, rolePicker, member, pending, button } =
    $derived(context);
</script>

{#if context}
  {@const counts = pending()}
  <div
    class={'portal-shell staff-shell' +
      (activeRole() === 'customer_relation' ? ' customer-relation' : '')}
  >
    <button type="button" class="mobile-scrim" data-action="close-menu" aria-label="Tutup navigasi"
    ></button>
    <aside class="sidebar" id="staff-sidebar">
      <button
        type="button"
        class="icon-btn mobile-staff-close"
        data-action="close-menu"
        aria-label="Tutup navigasi"><Icon name={'close'} /></button
      ><a href="index.html"><Brand /></a>
      <div class="staff-label">PORTAL PETUGAS</div>
      <Content value={rolePicker() ?? ''} />
      <nav class="side-nav" aria-label="Menu petugas">
        {#each Object.entries(menuPages()) as [key, [label, ico]]}
          <a
            href="#{key}"
            class={route === key ? 'active' : ''}
            {...route === key ? { 'aria-current': 'page' } : {}}
            ><Icon name={ico} />{label}{#if counts[key]}
              <span class="nav-number">{counts[key]}</span>
            {/if}</a
          >
        {/each}
      </nav>
      <div class="side-bottom">
        <div class="sidebar-foot">
          <a href="index.html"><Icon name={'home'} />Website KSPPS</a>
        </div>
      </div>
    </aside>
    <div class="portal-main">
      <header class="topbar">
        <button
          class="icon-btn mobile-menu"
          type="button"
          data-action="open-menu"
          aria-label="Buka navigasi"
          aria-controls="staff-sidebar"
          aria-expanded="false"><Icon name={'menu'} /></button
        >
        <div class="breadcrumb">
          Ruang kerja petugas <Icon name={'chevron'} /><b>{pages[route][0]}</b>
        </div>
        <div class="topbar-end">
          <Content value={badge(roleName()) ?? ''} />
          <div class="member-chip">
            <span class="avatar"
              >{#if activeRole() === 'manager'}
                MJ
              {:else}
                {#if activeRole() === 'avalist'}
                  AV
                {:else if activeRole() === 'finance'}
                  FN
                {:else if activeRole() === 'customer_relation'}
                  CR
                {:else}
                  AD
                {/if}
              {/if}</span
            >
            <div><strong>{roleName()} KSPPS</strong><small>Operasional KSPPS</small></div>
          </div>
        </div>
      </header>
      <main class="portal-content" id="page-main" tabindex="-1">
        <div data-workflow="page-access"><Region name={'workflow:' + 'page-access'} /></div>
        {@render children()}
        <footer class="portal-footer">
          <span>© 2026 KSPPS Syirkah Kebaikan Indonesia</span>
        </footer>
      </main>
    </div>
  </div>
{/if}
