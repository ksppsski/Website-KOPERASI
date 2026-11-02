<script>
  import LandingIcon from './LandingIcon.svelte';
</script>

<section class="ski-products ski-wrap" id="layanan" aria-labelledby="ski-products-title">
  <div class="ski-section-heading">
    <div>
      <p class="ski-eyebrow">Layanan KSPPS</p>
      <h2 id="ski-products-title">Simpanan untuk setiap langkah.</h2>
    </div>
    <p>Pilih layanan sesuai kebutuhan Anda.</p>
  </div>
  <div class="ski-product-grid" aria-label="Pilihan layanan simpanan">
    <article class="ski-product">
      <div class="ski-product-content">
        <span class="ski-product-icon"><LandingIcon name="users-round" /></span>
        <div>
          <h3>Simpanan Pokok<br />{' '}dan Wajib</h3>
          <p>Fondasi kebersamaan anggota.</p>
        </div>
      </div>
      <a class="ski-product-more" href="anggota.html#simpanan"
        >Pelajari lebih lanjut <LandingIcon name="arrow-right" /></a
      >
    </article>
    <article class="ski-product ski-product-featured">
      <div class="ski-product-content">
        <span class="ski-product-icon"><LandingIcon name="chart-no-axes-combined" /></span>
        <div>
          <h3>Simpanan<br />{' '}Mudharabah</h3>
          <p>Berpartisipasi dalam usaha bersama.</p>
        </div>
      </div>
      <a class="ski-product-more" href="anggota.html#modal"
        >Pelajari lebih lanjut <LandingIcon name="arrow-right" /></a
      >
    </article>
    <article class="ski-product">
      <div class="ski-product-content">
        <span class="ski-product-icon"><LandingIcon name="wallet" /></span>
        <div>
          <h3>Simpanan Wadiah<br />{' '}Yadh Dhamanah</h3>
          <p>Simpanan untuk kebutuhan Anda.</p>
        </div>
      </div>
      <button class="ski-product-more" type="button" data-ski-dialog="contact">
        Pelajari lebih lanjut <LandingIcon name="arrow-right" />
      </button>
    </article>
  </div>
  <p class="ski-products-tagline">
    <span>Bersama dalam Kebaikan, <strong>Tumbuh dalam Keberkahan.</strong></span>
  </p>
</section>
