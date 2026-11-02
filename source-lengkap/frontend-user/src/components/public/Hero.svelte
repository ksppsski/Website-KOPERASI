<script>
  import LandingIcon from './LandingIcon.svelte';
  import LandingBrand from './LandingBrand.svelte';
</script>

<section id="beranda" class="ski-hero" aria-labelledby="ski-hero-title">
  <div class="ski-hero-content">
    <p class="ski-eyebrow">Koperasi syariah untuk anggota</p>
    <h1 id="ski-hero-title">
      <span>Langkah Baik,</span> <span class="ski-hero-accent">Tumbuh Bersama.</span>
    </h1>
    <p class="ski-hero-copy">
      Kelola simpanan dan rencana Anda bersama<br class="ski-desktop-break" /> KSPPS Syirkah Kebaikan
      Indonesia.
    </p>
    <div class="ski-actions">
      <a class="ski-button ski-cyan" href="anggota.html#daftar"
        >Daftar Anggota <LandingIcon name="arrow-right" /></a
      >
      <a class="ski-button ski-hero-outline" href="#layanan">Kenali Layanan</a>
    </div>
    <div class="ski-hero-values">
      <span><LandingIcon name="sprout" />Berlandaskan syariah</span>
      <span><LandingIcon name="users-round" />Berorientasi anggota</span>
    </div>
  </div>
  <div class="ski-hero-visual">
    <div class="ski-building-scene">
      <img
        class="ski-building-photo"
        src="assets/kspps-building-3d.webp"
        alt="Render 3D gedung KSPPS dengan fasad putih, kaca biru dan logo asli koperasi."
        width="1200"
        height="1000"
        fetchpriority="high"
      />
      <svg
        class="ski-building-sign"
        viewBox="0 0 1200 1000"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <image
          href="assets/kspps-logo-color-hd.png"
          width="330"
          height="116.875"
          transform="matrix(0.9 -0.42 0 1 620 250)"
        />
      </svg>
    </div>
  </div>
  <a
    class="ski-member-preview"
    href="anggota.html#masuk"
    aria-label="Buka Ruang Anggota untuk melihat simpanan dan akad"
  >
    <div class="ski-member-preview-heading">
      <span class="ski-member-preview-icon"><LandingBrand symbol /></span>
      <span
        ><strong>Ruang Anggota</strong><small>Simpanan dan akad, lebih mudah dipantau.</small></span
      >
    </div>
    <div class="ski-member-preview-statuses" aria-label="Contoh status di portal anggota">
      <span class="ski-preview-status ski-preview-status--member"
        ><LandingIcon name="circle-check" />Anggota terdaftar</span
      >
      <span class="ski-preview-status ski-preview-status--document"
        ><LandingIcon name="circle-check" />Akad lengkap</span
      >
    </div>
  </a>
</section>
