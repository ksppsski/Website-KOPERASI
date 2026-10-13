<script>
  import LandingIcon from './LandingIcon.svelte';
  let selected = $state('');
  const productData = {
    simpanan: {
      title: 'Simpanan Anggota',
      text: 'Informasi setoran dan riwayat simpanan.',
      features: ['Simpanan pokok', 'Simpanan wajib', 'Riwayat setoran'],
    },
    'penyertaan-modal': {
      title: 'Penyertaan Modal',
      text: 'Pengadaan kebutuhan barang Mitra sesuai akad kerja sama.',
      features: ['Informasi akad', 'Periode kerja sama', 'Mekanisme bagi hasil'],
    },
    pembiayaan: {
      title: 'Pembiayaan Murabahah',
      text: 'Rincian barang, harga jual, dan jadwal pembayaran.',
      features: ['Pengajuan barang', 'Harga jual', 'Jadwal pembayaran'],
    },
  };
</script>

<section class="ski-products ski-wrap" id="ski-layanan">
  <div class="ski-section-heading">
    <div>
      <div class="ski-eyebrow">Produk &amp; layanan</div>
      <h2>Pilihan untuk anggota.</h2>
    </div>
  </div>
  <div class="ski-product-grid" aria-label="Pilihan layanan">
    <button
      type="button"
      class="ski-product"
      data-ski-product="simpanan"
      onclick={() => (selected = 'simpanan')}
      aria-pressed={selected === 'simpanan'}
      aria-controls="ski-product-detail"
      ><span class="ski-product-top"><LandingIcon name="wallet" /><span>01</span></span><span
        class="ski-product-title">Simpanan Anggota</span
      ><span class="ski-product-description"
        >Simpanan pokok dan wajib untuk keanggotaan koperasi.</span
      ><span class="ski-product-more">Selengkapnya <LandingIcon name="arrow-up-right" /></span
      ></button
    >
    <button
      type="button"
      class="ski-product"
      data-ski-product="penyertaan-modal"
      onclick={() => (selected = 'penyertaan-modal')}
      aria-pressed={selected === 'penyertaan-modal'}
      aria-controls="ski-product-detail"
      ><span class="ski-product-top"><LandingIcon name="sprout" /><span>02</span></span><span
        class="ski-product-title">Penyertaan Modal</span
      ><span class="ski-product-description">Untuk pengadaan kebutuhan barang Mitra.</span><span
        class="ski-product-more">Selengkapnya <LandingIcon name="arrow-up-right" /></span
      ></button
    >
    <button
      type="button"
      class="ski-product"
      data-ski-product="pembiayaan"
      onclick={() => (selected = 'pembiayaan')}
      aria-pressed={selected === 'pembiayaan'}
      aria-controls="ski-product-detail"
      ><span class="ski-product-top"><LandingIcon name="store" /><span>03</span></span><span
        class="ski-product-title">Pembiayaan Murabahah</span
      ><span class="ski-product-description"
        >Jual beli barang dengan harga dan pembayaran sesuai akad.</span
      ><span class="ski-product-more">Selengkapnya <LandingIcon name="arrow-up-right" /></span
      ></button
    >
  </div>
  <div class="ski-product-detail" id="ski-product-detail" aria-live="polite" hidden={!selected}>
    {#if selected}<div>
        <h3>{productData[selected].title}</h3>
        <p>{productData[selected].text}</p>
      </div>
      <div class="ski-detail-features">
        {#each productData[selected].features as feature}<span>✓ {feature}</span>{/each}
      </div>{/if}
  </div>
</section>
