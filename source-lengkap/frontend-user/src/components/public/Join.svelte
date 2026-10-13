<script>
  import LandingIcon from './LandingIcon.svelte';
</script>

<section class="ski-join ski-wrap" id="ski-bergabung">
  <div class="ski-join-head">
    <div>
      <div class="ski-eyebrow">Keanggotaan</div>
      <h2>Menjadi anggota,<br />mulai dari sini.</h2>
    </div>
    <button type="button" class="ski-button ski-cyan" data-ski-dialog="join"
      >Daftar Anggota <LandingIcon name="arrow-right" /></button
    >
  </div>
  <div class="ski-steps">
    <div class="ski-step">
      <span class="ski-step-number">01</span>
      <div>
        <h3>Lengkapi data</h3>
        <p>Siapkan identitas dan dokumen.</p>
      </div>
    </div>
    <div class="ski-step">
      <span class="ski-step-number">02</span>
      <div>
        <h3>Verifikasi</h3>
        <p>Data dan setoran diperiksa.</p>
      </div>
    </div>
    <div class="ski-step">
      <span class="ski-step-number">03</span>
      <div>
        <h3>Keanggotaan aktif</h3>
        <p>Akses layanan koperasi.</p>
      </div>
    </div>
  </div>
</section>
