<script>
  import Icon from '../../../../shared/components/Icon.svelte';

  let { context } = $props();
  let { heading } = $derived(context);
</script>

{#if context}
  {@html heading('Bantuan', 'Temukan informasi dan hubungi tim koperasi.') ?? ''}
  <div class="content-grid">
    <section class="panel">
      <div class="panel-head"><h2>Pertanyaan umum</h2></div>
      <details class="faq-item" open>
        <summary>Bagaimana cara mengonfirmasi setoran?</summary>
        <p>
          Buka Simpanan Saya, pilih Setor simpanan wajib, lalu pilih bulanan atau tahunan dan unggah
          bukti transfer. Saldo bertambah setelah rekonsiliasi Finance.
        </p>
      </details>
      <details class="faq-item">
        <summary>Untuk apa penyertaan modal digunakan?</summary>
        <p>
          Penyertaan modal digunakan untuk pengadaan kebutuhan barang Mitra, sesuai akad kerja sama.
        </p>
      </details>
      <details class="faq-item">
        <summary>Di mana saya bisa melihat akad?</summary>
        <p>
          Buka menu Dokumen Akad. Anda dapat mencoba pencarian dan dokumen yang telah diunggah
          petugas.
        </p>
      </details>
      <details class="faq-item">
        <summary>Apakah data pada portal ini sudah nyata?</summary>
        <p>
          Data ditampilkan dari pendaftaran dan pengajuan Anda. Portal ini masih berupa konsep untuk
          mencoba alur bersama portal petugas. Belum ada transaksi koperasi yang sesungguhnya.
        </p>
      </details>
    </section>
    <aside>
      <section class="panel support-card">
        <h2>Hubungi tim KSPPS</h2>
        <p>Pendampingan terkait keanggotaan dan layanan koperasi.</p>
        <a href="tel:085608365555"><Icon name={'phone'} />0856 0836 5555</a><a
          href="mailto:syirkahkebaikanindonesia@gmail.com"
          ><Icon name={'mail'} />syirkahkebaikanindonesia@gmail.com</a
        >
        <div class="small" style="margin-top:23px">
          Jl. Kijang No. 34 A, Maricaya,<br />Kota Makassar
        </div>
      </section>
    </aside>
  </div>
{/if}
