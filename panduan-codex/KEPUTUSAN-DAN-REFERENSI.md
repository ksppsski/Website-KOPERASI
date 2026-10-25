# Keputusan, preferensi dan referensi proyek

## Gerakan tema dan logo, 26 Oktober 2026

Permintaan lanjutan berdasarkan tangkapan layar: perpindahan tema dimulai dari pusat ikon lalu menyebar halus ke seluruh halaman; logo pada tema gelap harus putih seperti landing. Gunakan aset putih transparan yang sudah tersedia, pertahankan tema terang, dan hormati pengurangan gerak. Jangan menambahkan kotak putih pada logo portal.

## Penulisan antarmuka, 25 Oktober 2026

Pengguna meminta semua status yang memberi kesan website masih dikembangkan dihapus. UI tidak lagi memakai penanda pratinjau, prototipe, konsep, demo atau simulasi. Pesan fungsi tetap jujur: formulir statis tidak mengirim data; catatan pada laman belum dikirim; draf belum disahkan. Perubahan ini tidak mengaktifkan backend, mengganti autentikasi atau menjadikan ringkasan lokal sebagai akad.

Disusun dari percakapan yang tersedia dan dicocokkan dengan source v39 pada 14 Oktober 2026. Urutan di bawah merekam perubahan keputusan; bukan transkrip verbatim setiap pesan.

Pembaruan **23 Oktober 2026**: permintaan berdasarkan rekaman layar dibatasi pada pergantian mode terang dan gelap di seluruh laman. Gunakan perilaku bersama di `shared/lib/theme.js` dan `ThemeToggle.svelte`; fitur ini tidak mengubah aturan bisnis atau akses.

## Keputusan terbaru yang menggantikan ide sebelumnya

| Topik | Keputusan yang berlaku |
| --- | --- |
| Framework dan keterbacaan | Tetap Svelte; modul per fitur, baris source terbaca dan dependensi eksplisit. Tidak perlu menghemat jumlah baris. |
| Kode independen | Pisahkan tanggung jawab dan kepemilikan state. Komponen/utilitas bersama tetap dipakai bila sesuai; tidak menyalin semua kode ke setiap portal. |
| Konsep landing bergaya Spotify | Pernah diminta lalu dibatalkan; pertahankan desain landing terakhir pada source. |
| Istilah layanan | Gunakan anggota koperasi dan penyertaan modal pada fitur website saat ini; istilah investor pada nama template sumber tidak berarti UI harus memakai investor. |
| Animasi landing | Kartu pada awalnya menutupi portal; klik membuatnya bergeser ke kiri sambil miring; lingkaran latar berputar. Pertahankan posisi/interaksi source terakhir. |
| Warna status | Hijau/toska dan biru untuk status normal/aktif/proses; merah untuk peringatan termasuk top up. Gunakan pemetaan yang sudah terpusat. |
| Tema halaman | Tombol kanan atas bertuliskan aksesibel `Aktifkan mode gelap` atau `Aktifkan mode terang`. Ikuti perangkat sebelum pengguna memilih; simpan pilihan browser dan terapkan pada seluruh portal serta landing tanpa mereset formulir. |
| Penawaran penuh | Tetap tampil 72 jam sejak terpenuhi di portal anggota; semua riwayat tetap di Manajer. |
| KPI/waktu kerja | Panel pemantauan hanya di Manajer, bukan lagi pada dashboard Admin/Finance. |
| Avalist | Internal kantor; dapat bukan petugas; pendaftaran dengan email; portal sendiri. |
| Pergantian avalist | Bawaan pengajuan baru dan penetapan akad berjalan dipisahkan; tanggal efektif dan histori wajib jelas. |
| Wewenang fee | Manajer mengesahkan perubahan; Admin mengusulkan; Finance mencatat pembayaran. |
| Fee sudah dibayar | Tidak menimpa catatan lama; koreksi/pemulihan dan pembayaran baru dicatat terpisah. |
| Bagian koperasi | Jika avalist 1%, sisa 1% dari alokasi avalist 2% menjadi bagian koperasi. |
| Ringkasan avalist | Ada total kumulatif, total hak per bulan, dan pembayaran berdasarkan tanggal transfer bulan itu; hak dan kas jangan dicampur. |
| Favicon | Logo biru muda/biru tua saat perangkat mode terang, putih saat mode gelap, latar transparan. |
| GitHub/domain | Pengguna menginginkan publikasi semudah mungkin dari perubahan kode. Kondisi nyata: Pages otomatis menerbitkan build pratinjau yang dikirim; backend/login mandiri masih terpisah. |
| DNS Cloudflare | Pembahasan pengaturan pernah ditunda. Jangan menganggap nameserver wajib dipindah untuk semua perubahan kode. |

### Detail tampilan yang harus dipertahankan

Palet mengikuti logo KSPPS. Status menggunakan `shared/lib/status-colors.js` dan `Badge.svelte`: pendaftaran disetujui/akad lengkap/terpenuhi memakai kategori sukses; simpanan aktif dan proses menunggu memakai biru; perbaikan/tunggakan/peringatan memakai merah; arsip atau pembatalan netral memakai abu-abu sesuai pemetaan.

User pernah mengirim gambar acuan warna. Implementasi terkini adalah titik awal yang tersedia dalam repository; jika perlu perbandingan persis dengan gambar tersebut, minta akses ke lampiran asli. Jangan mengklaim sudah membaca gambar yang tidak tersedia.

Logo sumber ada dalam `source-lengkap/public/assets/`. Simbol favicon vektor berada di `kspps-symbol.svg`; generator menghasilkan tiga varian. HTML pembuka memakai aset favicon yang mengikuti tema perangkat, termasuk perubahan tema saat halaman terbuka.

## Masalah yang pernah terjadi dan perlindungannya

- Formulir penyertaan modal pernah menghilang/kehilangan isian ketika pembaruan latar belakang berjalan. Tes draft/form/file dan pergantian halaman menjaga regresi ini.
- Persetujuan avalist pada akad lama pernah gagal ketika penetapan awal belum mempunyai penerima/persentase lengkap. Form sekarang menyebut nilai yang kurang dan memberi Manajer tempat melengkapinya tanpa menimpa penetapan akad lain.
- Ringkasan bulanan rentan keliru bila hak bulan sebelumnya dibayar bulan berikutnya. Model memisahkan `total`, `paid`, `paidForPeriod` dan `pending`.
- Pencampuran render HTML, singleton layanan dan listener yang tertinggal ditangani pada v39. Jangan mengembalikan pola itu saat menambah fitur.
- GitHub Pages dahulu menyimpan portal statis versi lama terpisah. Kini hasil Pages berasal dari sumber Svelte yang sama; jangan memelihara dua implementasi manual lagi.

## Konteks operasional yang belum menjadi aturan aplikasi baru

Sebelum website, alur operasional memakai Google Forms/Sheets, Apps Script dan Autocrat. Pendaftaran dan SPK dihubungkan melalui identitas anggota; satu orang dapat mempunyai lebih dari satu pengajuan/akad sehingga identitas pengajuan tidak boleh hanya NIK. Repository saat ini belum menyertakan koneksi/sinkronisasi ke spreadsheet operasional tersebut.

SOP historis membahas target pembuatan SPK maksimal 15 menit setelah masuk, dengan pengecualian istirahat 12.00–13.00 dan 15.00–16.00. Dashboard saat ini menghitung durasi kalender. Jangan mengklaim SLA tersebut sudah otomatis diterapkan atau mengubah formula KPI tanpa tugas yang relevan.

Produk wadiah yad dhamanah dibahas dalam pekerjaan dokumen lain: anggota yang sudah transfer setelah kuota mudharabah terpenuhi dapat memilih pengembalian atau wadiah; koperasi boleh menggunakan dana dengan tanggung jawab pengembalian penuh; tidak ada imbal hasil yang diperjanjikan; ada prioritas untuk pembukaan project berikutnya. **Belum ada modul/alur wadiah pada source v39.** Jika diminta dimasukkan ke website, susun kebutuhan produk/akad/status/rekonsiliasi terlebih dahulu dan jangan otomatis mengalihkannya dari pengajuan mudharabah lama.

Pembahasan lain tentang objek properti, hak cicilan, margin realisasi, musyarakah/mudharabah dan variasi nisbah adalah konteks pengembangan produk. Pembahasan tersebut belum menjadi revisi aturan perhitungan website v39. Perhitungan 5%/alokasi 10% pada source tidak boleh diganti hanya berdasarkan contoh simulasi dari percakapan lain.

## Bahan yang tersedia dalam repository

| Bahan | Lokasi / kegunaan |
| --- | --- |
| Source tiga portal dan landing | `source-lengkap/frontend-user/`, `frontend-petugas/`, `frontend-avalist/` |
| Runtime/komponen/pola bersama | `source-lengkap/shared/` |
| Backend, skema dan migrasi | `source-lengkap/backend/` |
| Template akad asli | `backend/templates/akad-penyertaan-modal.docx`, `contract-source.pdf` relatif terhadap `source-lengkap/` |
| Template/runtime pengisian PDF | `contract-original-layout.pdf`, `contract-layout.json`, `contract.json` di folder template |
| Surat keanggotaan kosong | `backend/templates/membership-letter-base.pdf`, dengan metadata ekspor yang dibersihkan |
| Font dan logo | Folder template/fonts dan `public/assets/` |
| Panduan teknis | `source-lengkap/docs/`, `source-lengkap/to-do.md`, README dan PANDUAN-DOMAIN root |
| Bukti perilaku yang diharapkan | `source-lengkap/tests/`, termasuk snapshot struktur dan pengujian domain |

Jangan menganggap semua file bernama "Template Akad Digital Investor" mempunyai isi yang sama. Template yang dipakai source berasal dari versi yang dijelaskan dalam WORKFLOWS. Mengganti template memerlukan membandingkan file yang benar beserta klausul/layout-nya.

## Bahan yang tidak dipindahkan otomatis

| Bahan | Status / tindakan bila dibutuhkan |
| --- | --- |
| Chat lengkap dan lampiran ChatGPT/Library | Tidak ikut git; konteks yang diketahui dirangkum di sini |
| Gambar acuan warna, 30 September 2026 16.45.35 | Tidak dilampirkan ke repo; minta ulang bila revisi membutuhkan perbandingan visual persis |
| Gambar error/persetujuan avalist, 3 Oktober 2026 23.47.10 dan 23.52.39 | Tidak dilampirkan; baca implementasi dan tes, minta gambar hanya bila perlu menelusuri pesan historis |
| `Template Akad Digital Investor SKI (4).pdf` dari pembahasan dokumen Oktober | Belum dinyatakan sebagai pengganti template website; perlu file dan instruksi eksplisit jika akan diadopsi |
| Akta, SOP rinci, materi MBR, dan draft akad wadiah | Referensi organisasi di luar repo; belum merupakan perubahan kode otomatis |
| PNG tanda tangan ketua dan DOCX surat yang menyematkannya | Aset privat; jangan masukkan ke repository publik. Ikuti README template |
| Database anggota, unggahan, rekening, bukti dan audit produksi | Migrasi privat tersendiri bila diperlukan; tidak diekspor ke git |
| Kredensial GitHub/Hostinger/Cloudflare/Sites, secret dan akses akun | Tidak ditulis dalam handoff; harus tersedia melalui akses lingkungan yang sah |

Tidak ada kebutuhan membawa percakapan yang tidak terkait website, data pribadi tim, atau rincian transaksi internal ke repository ini. Jika informasi baru diperlukan, minta bahan spesifik yang relevan, bukan menganggap Codex otomatis dapat membuka semua chat/lampiran lama.

## Pemeliharaan pengetahuan

Saat keputusan berubah, perbarui aturan yang berlaku, jelaskan keputusan yang digantikan dan tanggalnya, lalu tautkan implementasi/pengujian yang relevan. Jangan menumpuk dua versi aturan yang sama-sama terlihat aktif. Pertahankan perbedaan antara permintaan, implementasi, pengujian, deployment dan kesiapan operasional.
