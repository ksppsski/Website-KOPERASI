<script>
  import LandingIcon from './LandingIcon.svelte';
</script>

<section class="ski-faq-section ski-wrap" id="informasi" aria-labelledby="ski-faq-title">
  <h2 id="ski-faq-title">Pertanyaan umum</h2>
  <div class="ski-faq-list">
    <details>
      <summary><span>Bagaimana cara menjadi anggota?</span><LandingIcon name="plus" /></summary>
      <div class="ski-faq-answer">
        <p>
          Pilih <a href="anggota.html#daftar">Daftar Anggota</a>, lengkapi data diri dan dokumen,
          lalu ikuti pemeriksaan data serta setoran keanggotaan oleh tim koperasi.
        </p>
      </div>
    </details>
    <details>
      <summary><span>Apa perbedaan jenis simpanan?</span><LandingIcon name="plus" /></summary>
      <div class="ski-faq-answer">
        <p>
          Simpanan pokok dan wajib menjadi bagian dari keanggotaan. Untuk penjelasan Simpanan
          Mudharabah dan Simpanan Wadiah Yadh Dhamanah sesuai kebutuhan Anda, <button
            type="button"
            data-ski-dialog="contact">hubungi admin</button
          >.
        </p>
      </div>
    </details>
    <details>
      <summary
        ><span>Di mana saya bisa melihat dokumen akad?</span><LandingIcon name="plus" /></summary
      >
      <div class="ski-faq-answer">
        <p>
          Masuk ke <a href="anggota.html#masuk">Portal Anggota</a>, lalu buka
          <a href="anggota.html#dokumen">Dokumen Akad</a> untuk melihat dokumen yang tersedia bagi akun
          Anda.
        </p>
      </div>
    </details>
  </div>
</section>
