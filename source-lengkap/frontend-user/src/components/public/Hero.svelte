<script>
  import LandingIcon from './LandingIcon.svelte';
  let expanded = $state(false);
  let card;
</script>

<svelte:window
  onkeydown={(event) => {
    if (event.key === 'Escape' && expanded) {
      event.preventDefault();
      expanded = false;
      card?.focus();
    }
  }}
/>
<section id="ski-beranda" class="ski-hero ski-wrap">
  <div>
    <div class="ski-eyebrow">Koperasi syariah</div>
    <h1>Langkah bersama,<br />untuk masa depan<br />yang <em>lebih baik.</em></h1>
    <p class="ski-hero-copy">Layanan simpanan, penyertaan modal, dan pembiayaan untuk anggota.</p>
    <div class="ski-actions">
      <button type="button" class="ski-button" data-ski-dialog="join"
        >Menjadi Anggota <LandingIcon name="arrow-right" /></button
      ><a class="ski-text-link" href="#ski-layanan"
        >Kenali layanan kami <LandingIcon name="arrow-up-right" /></a
      >
    </div>
  </div>
  <div
    class="ski-art"
    class:is-open={expanded}
    data-ski-motion=""
    aria-label="Kartu anggota dan akses layanan digital KSPPS"
  >
    <div class="ski-motion-scene">
      <div class="ski-orbit" aria-hidden="true"><div class="ski-dot"></div></div>
      <button
        type="button"
        class="ski-membership"
        bind:this={card}
        onclick={() => (expanded = !expanded)}
        aria-expanded={expanded}
        aria-controls="ski-portal-motion-panel"
        aria-label={expanded ? 'Tutup fitur Portal Anggota' : 'Buka fitur Portal Anggota'}
        ><img
          class="ski-membership-brand"
          src="assets/brand-9523c1e45f.png"
          width="720"
          height="256"
          alt="KSPPS Syirkah Kebaikan Indonesia"
        /><span>KARTU ANGGOTA &nbsp; ↗</span></button
      >
      <div
        class="ski-access"
        id="ski-portal-motion-panel"
        role="region"
        aria-label="Portal Anggota"
        aria-hidden={!expanded}
        inert={!expanded}
      >
        <div class="ski-access-head"><strong>Portal Anggota</strong></div>
        <div class="ski-access-row">
          <span class="ski-tiny-icon"><LandingIcon name="wallet" /></span><span
            >Simpanan anggota</span
          >
        </div>
        <div class="ski-access-row">
          <span class="ski-tiny-icon"><LandingIcon name="chart-no-axes-combined" /></span><span
            >Penyertaan modal</span
          >
        </div>
        <div class="ski-access-row">
          <span class="ski-tiny-icon"><LandingIcon name="files" /></span><span>Dokumen akad</span>
        </div>
        <button type="button" class="ski-button ski-access-login" data-ski-dialog="member"
          >Masuk Portal Anggota <LandingIcon name="arrow-up-right" /></button
        >
      </div>
      <span class="ski-motion-status" aria-live="polite"
        >{expanded ? 'Fitur Portal Anggota ditampilkan.' : 'Kartu anggota ditutup.'}</span
      >
    </div>
  </div>
</section>
