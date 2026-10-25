<script>
  import LandingIcon from './LandingIcon.svelte';
</script>

<section class="ski-bottom ski-wrap" id="ski-tentang">
  <div class="ski-about">
    <div class="ski-eyebrow">Tentang kami</div>
    <h2>Syirkah Kebaikan<br />Indonesia</h2>
    <p>
      Koperasi syariah yang melayani kebutuhan simpanan, penyertaan modal, dan pembiayaan anggota.
    </p>
    <button
      type="button"
      class="ski-button ski-outline"
      style="margin-top:19px"
      data-ski-dialog="contact">Hubungi Kami <LandingIcon name="message-circle" /></button
    >
  </div>
  <div class="ski-faq">
    <h3>Pertanyaan umum</h3>
    <details>
      <summary>Bagaimana cara menjadi anggota?</summary>
      <p>Lengkapi data diri dan setoran keanggotaan, lalu ikuti proses verifikasi tim.</p>
    </details>
    <details>
      <summary>Apa tujuan penyertaan modal?</summary>
      <p>Penyertaan modal digunakan untuk pengadaan kebutuhan barang Mitra.</p>
    </details>
    <details>
      <summary>Di mana dokumen akad tersedia?</summary>
      <p>Dokumen tersedia di menu Dokumen Akad pada portal anggota.</p>
    </details>
  </div>
</section>
