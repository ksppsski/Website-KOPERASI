# Requirement Website KSPPS

KSPPS Syirkah Kebaikan Indonesia

Spesifikasi bisnis dan sistem untuk pembangunan ulang dengan SvelteKit atau framework lain

Versi dokumen 1.0 • 24 September 2026

## 1 Tujuan dan cara menggunakan dokumen

Dokumen ini menjadi acuan pembangunan ulang website dan portal KSPPS agar tim pengembang dapat memahami kebutuhan tanpa harus menyalin susunan kode lama. Alur anggota, Admin, Finance, dan Manajer harus tetap terhubung. Framework dapat berubah; aturan bisnis, data historis, nomor dokumen, dan template yang telah disetujui tetap dipertahankan.

Dokumen ditujukan kepada pemilik proses koperasi, analis sistem, pengembang, dan penguji. Pemilik proses memeriksa aturan bisnis dan keputusan terbuka. Pengembang menggunakan bagian data, layanan, dan arsitektur. Penguji menggunakan skenario penerimaan.

**Dasar pemeriksaan.** Percakapan kebutuhan pengguna dan kode website pratinjau versi 24, commit `ce92c8dc250299cd6599519db9ebee9638b35844`. Pemeriksaan dilakukan terhadap kode lokal; dokumen ini bukan hasil audit keamanan atau rekonsiliasi data operasional. Beberapa uraian di README lama tertinggal dari perubahan penamaan terbaru; aturan penamaan pada bagian 5 dan 8 mengikuti kode terbaru.

**Alamat acuan tampilan:** https://kspps-syirkah-kebaikan-preview.makongsifinance.chatgpt.site

**Domain milik koperasi:** https://syirkahkebaikanindonesia.com — kesamaan backend dan datanya dengan pratinjau tidak diverifikasi dalam penyusunan ini.

### Arti penanda

- **Wajib dipertahankan** berarti kebutuhan yang telah diminta atau perilaku bisnis yang ditemukan pada kode pratinjau dan menjadi dasar kesetaraan migrasi.
- **Usulan produksi** berarti rancangan untuk implementasi baru, belum boleh disebut sebagai kemampuan yang sudah berjalan.
- **Perlu keputusan** berarti kebijakan atau cakupan belum final. Keputusan harus dicatat sebelum modul terkait digunakan untuk operasional.

Nomor requirement seperti REG-01 dan AKD-01 dapat dipakai sebagai referensi tiket pekerjaan dan pengujian. Istilah “otomatis” pada pratinjau umumnya berarti dihitung oleh server saat data diminta. Pengiriman pesan di luar portal dan proses terjadwal tanpa kunjungan memerlukan implementasi tambahan.

### Susunan dokumen

Bagian 2–3 menjelaskan ruang lingkup, role, dan tampilan. Bagian 4–12 menjelaskan aturan serta alur kerja. Bagian 13–15 menjelaskan data, layanan, dan pemetaan SvelteKit. Bagian 16–18 memuat kesiapan produksi, pengujian, rencana migrasi, keputusan terbuka, dan sumber acuan.

## 2 Ruang lingkup dan hak akses

### Batas sistem

**Wajib dipertahankan:** landing page, pendaftaran, profil anggota, simpanan, penawaran project, pengajuan penyertaan modal, rekonsiliasi, penerbitan dan arsip akad, jatuh tempo, pengembalian modal, pengunduran diri, laporan, dan monitoring pekerjaan petugas.

**Kondisi saat ini:** alur tersebut memiliki backend dan penyimpanan pada pratinjau. Login email dan kata sandi, pemulihan kata sandi, serta pengajuan pembiayaan masih berupa simulasi. Identitas backend berasal dari autentikasi ChatGPT. Register kontrak pembiayaan dan pencatatan pelunasannya sudah tersimpan.

Transfer uang dilakukan di luar website. Sistem menyiapkan daftar transfer, merekam hasil rekonsiliasi, dan menyimpan konfirmasi pengembalian; sistem belum melakukan transfer bank. Privy, tanda tangan elektronik tersertifikasi, e-meterai, WhatsApp, email otomatis, dan buku besar akuntansi lengkap tidak termasuk integrasi yang sudah tersedia.

### Matriks akses

| Kegiatan | Anggota | Admin | Finance | Manajer |
| --- | --- | --- | --- | --- |
| Mengirim dan memperbaiki data anggota | Milik sendiri | Memeriksa | Tidak | Memeriksa melalui Admin |
| Memeriksa KTP dan tanda tangan | Melihat milik sendiri | Ya | Tidak | Ya |
| Menyetujui pendaftaran dan pengajuan | Tidak | Ya setelah rekon | Tidak | Melalui Admin |
| Rekonsiliasi bukti transfer | Tidak | Tidak | Ya | Melalui Finance |
| Generate dan unggah akad lengkap | Tidak | Ya | Tidak | Melalui Admin |
| Buka penawaran dan tetapkan kuota | Melihat | Tidak | Tidak | Ya |
| Persiapan bagi hasil dan pengembalian | Melihat haknya | Tidak | Ya | Melalui Finance |
| Persetujuan final pengunduran diri | Tidak | Tidak | Tidak | Ya |
| Unggah laporan untuk anggota | Tidak | Tidak | Tidak | Ya |
| Membaca laporan terbit | Setelah disetujui | Ya | Ya | Ya |
| Lihat KPI dan waktu kerja lintas role | Tidak | Tidak | Tidak | Ya |
| Memberi dan mencabut akses petugas | Tidak | Tidak | Tidak | Ya |

**AKS-01.** Backend menentukan hak akses dari akun terautentikasi. Mengubah pilihan role atau URL di browser tidak memberikan izin baru. Manajer dapat membuka ketiga portal petugas; Admin dan Finance hanya portal masing-masing.

**AKS-02.** Anggota hanya boleh membaca dokumen dan mengubah pengajuan miliknya. Finance menerima data pembayaran yang diperlukan, tanpa akses KTP, tanda tangan, surat keanggotaan, atau isi akad anggota lain. Seluruh tindakan Manajer tetap mencatat identitas Manajer sebenarnya.

## 3 Halaman dan ketentuan tampilan

### Peta halaman

| Area | Halaman yang diperlukan |
| --- | --- |
| Publik | Beranda, informasi layanan, alur bergabung, informasi koperasi, bantuan dan kontak |
| Akun anggota | Masuk, daftar, lupa kata sandi, status pendaftaran, perbaikan pendaftaran |
| Portal anggota | Ringkasan, profil, Simpanan Saya, penawaran dan pengajuan penyertaan modal, pembiayaan, dokumen, laporan, notifikasi, pengunduran diri |
| Admin | Ringkasan tugas, pemeriksaan anggota, pemeriksaan penyertaan modal, generate PDF, unggah akad lengkap, pengunduran diri, register pembiayaan |
| Finance | Ringkasan tugas, rekonsiliasi, persiapan bagi hasil harian, pengembalian modal, pengembalian simpanan pokok |
| Manajer | Ringkasan tugas, penawaran project, laporan jatuh tempo, pekerjaan dan waktu kerja, penerbitan laporan, akses petugas, persetujuan final pengunduran diri |

**UI-01.** Gunakan logo KSPPS dan palet biru tua serta biru muda kehijauan dari aset yang ada. Logo dan favicon tanpa latar putih. Istilah produk adalah “penyertaan modal untuk pengadaan kebutuhan barang Mitra”. Hindari mengganti tampilan yang telah disetujui hanya karena framework berubah.

**UI-02.** Kartu anggota pada hero awalnya horizontal dan menutupi seluruh panel portal anggota. Saat diklik, kartu bergerak ke kiri sambil miring, membuka panel di kanan; lingkaran latar ikut berputar dalam satu rangkaian. Posisi akhir mengikuti tampilan pratinjau yang telah disetujui. Gunakan kontrol keyboard dan hormati preferensi pengurangan animasi.

**UI-03.** Halaman pendaftaran memiliki empat langkah: Data diri, Simpanan, Persetujuan, dan Tinjau. Tampilkan kesalahan dekat kolom terkait, nominal total, serta berkas yang sudah dipilih. Data dan berkas tidak boleh hilang saat berpindah langkah, terjadi validasi gagal, atau refresh data di latar belakang.

**UI-04.** Foto KTP berada di kanan tanda tangan pada profil desktop. Di layar sempit, susun tanda tangan lalu KTP secara vertikal. KTP dapat diperbesar melalui akses terautentikasi.

**UI-05.** Ringkasan tiap role petugas menampilkan seluruh tugas yang dapat dikerjakan role tersebut, terbaru di atas berdasarkan waktu masuk tahap tugas. Tidak ada pencarian tugas berdasarkan nama anggota atau keharusan memilih anggota terlebih dahulu. Nama anggota tetap ditampilkan sebagai identitas transaksi.

**UI-06.** Link portal petugas dipisahkan dari landing page anggota. Pemisahan link membantu navigasi; akses tetap wajib dilindungi autentikasi dan pemeriksaan izin di backend. Sembunyikan halaman petugas dari pengindeksan mesin pencari.

**UI-07.** Sediakan keadaan memuat, kosong, gagal, perlu perbaikan, terkunci, dan berhasil. Dialog yang terbuka tidak boleh tertutup sendiri ketika polling berjalan. Semua fungsi utama harus dapat digunakan pada desktop dan ponsel, dengan label formulir, fokus keyboard, dan status yang tidak hanya dibedakan berdasarkan warna.

## 4 Data pendaftaran anggota

**REG-01.** Simpan satu profil keanggotaan untuk setiap siklus pendaftaran. Akun pengguna dan siklus keanggotaan harus menjadi entitas berbeda agar mantan anggota dapat mendaftar ulang dengan identitas yang sama dan nomor baru.

| Kelompok | Kolom | Ketentuan dasar |
| --- | --- | --- |
| Identitas | Nama lengkap | Wajib 2–120 karakter; nama tersimpan huruf besar |
| Identitas | Jenis dan nomor identitas | Kode saat ini menerima KTP, SIM, Paspor; nomor KTP 16 digit |
| Kelahiran | Tempat dan tanggal lahir | Wajib; tanggal valid dan tidak di masa depan |
| Alamat | Alamat identitas dan domisili | Wajib 5–240 karakter; tersedia pilihan alamat sama |
| Wilayah | Kelurahan, kecamatan, kota atau kabupaten, provinsi | Wajib; masing-masing 2–80 karakter |
| Kontak | Telepon dan email | Wajib; email berformat valid; telepon 9–25 karakter |
| Rekening | Nama bank dan nomor rekening | Wajib; rekening disimpan sebagai teks agar nol awal utuh |
| Data pendukung | Jenis kelamin, pekerjaan, pendidikan, status pernikahan | Wajib pada formulir saat ini |
| Keluarga | Nama ibu, nama ahli waris, telepon ahli waris | Wajib pada formulir saat ini |
| Administrasi | Kantor, agama, petugas rujukan | Ada pada formulir; kebijakan kewajiban perlu ditetapkan |
| Simpanan | Pokok, wajib, pilihan bulanan atau tahunan | Nominal pokok dan wajib ditetapkan server |
| Tambahan lama | Simpanan transaksi, khusus, angsuran, biaya administrasi | Masih ada di formulir; lihat keputusan K-01 |
| Persetujuan | Pendaftaran dan penggunaan tanda tangan | Wajib, berikut waktu persetujuan server |

**REG-02.** KTP tetap wajib diunggah meskipun pilihan jenis identitas pada kode lama memungkinkan identitas selain KTP. Penyederhanaan menjadi KTP saja memerlukan keputusan K-02.

| Berkas | Format dan batas saat ini | Pemakaian |
| --- | --- | --- |
| Foto KTP | JPG/JPEG atau PNG, maksimal 10 MB | Pemeriksaan Admin dan gambar pada profil |
| Bukti transfer pendaftaran | JPG/JPEG, PNG, PDF, maksimal 10 MB | Rekonsiliasi Finance |
| Tanda tangan | Hasil kanvas PNG 1000 × 340, maksimal 500 KB | Snapshot dan pengisian akad |

**REG-03.** Backend memvalidasi format, isi, ukuran, tanggal, dan nominal secara mandiri. Tanda tangan kosong ditolak. Batas resolusi KTP saat ini: PNG 8 megapiksel, JPG 50 megapiksel. Validasi teks harus memastikan data muat di ruang template; jangan memotong nama atau alamat diam-diam.

**REG-04.** Nomor anggota: `SKI-<tahun daftar>-<urut minimal 4 digit>`, contoh `SKI-2026-0001`. Tahun mengikuti tanggal pendaftaran WITA. Urutan saat ini bersifat global dan tidak kembali ke 0001 pada tahun baru. Satu profil mendapat satu nomor; retry, perbaikan, dan refresh tidak membuat nomor baru.

## 5 Pemeriksaan anggota dan surat keanggotaan

### Alur pendaftaran

1. Calon anggota mengirim data, KTP, tanda tangan, persetujuan, dan bukti setoran awal.
2. Sistem menyimpan pendaftaran serta membuat tugas pemeriksaan Admin dan rekonsiliasi Finance.
3. Finance mencocokkan bukti dengan mutasi bank, tanggal, referensi, dan nominal yang diharapkan.
4. Setelah rekonsiliasi disetujui, surat keanggotaan dapat tersedia. Admin memeriksa identitas, KTP, dan tanda tangan sebelum menyetujui akses layanan anggota.
5. Jika diminta perbaikan, portal anggota menampilkan catatan dan tombol Perbaiki. Anggota mengirim ulang dengan nomor pendaftaran yang sama.

**REG-05.** Admin tidak dapat menyetujui pendaftaran sebelum rekonsiliasi yang valid. Persetujuan KTP harus direkam beserta waktu dan pemeriksanya. Status profil: menunggu, perlu perbaikan, disetujui, ditolak, atau ditutup. Perubahan status mengikuti izin role dan versi data terbaru.

**REG-06.** Koreksi pendaftaran memuat kembali berkas yang sudah tersimpan; anggota mengganti berkas yang perlu diperbaiki. Verifikasi KTP perlu dilakukan kembali. Bukti yang diganti membatalkan kecocokan rekonsiliasi sebelumnya. Jika bukti pendaftaran identik dengan bukti yang telah direkonsiliasi, hasil Finance dapat dipertahankan. Nominal setoran yang sudah dikreditkan tidak boleh diubah melalui koreksi biasa.

### Surat pengesahan keanggotaan

**SPA-01.** Surat hanya tersedia setelah simpanan pokok dan wajib direkonsiliasi Finance dengan nominal sesuai. Profil yang sedang perlu perbaikan atau ditolak tidak boleh menerbitkannya. Pada implementasi saat ini, surat dapat tersedia sebelum persetujuan akhir Admin; keputusan untuk mengubah urutan ini dicatat pada K-03.

**SPA-02.** Gunakan template “SURAT PENGESAHAN KEANGGOTAAN KOPERASI” yang sudah disediakan, dengan kop, redaksi, dan tanda tangan ketua dari template. Isian mencakup nama, NIK atau nomor identitas, tempat dan tanggal lahir, alamat, nomor anggota, nomor surat, dan tanggal pengesahan. Dokumen harus muat satu halaman.

| Elemen | Aturan |
| --- | --- |
| Nomor surat | `<urut 4 digit>/KSPPS-SKI/SPA/<bulan Romawi>/<tahun>` |
| Contoh | `0001/KSPPS-SKI/SPA/IX/2026` |
| Dasar bulan dan tahun nomor | Tanggal pendaftaran asli dalam WITA |
| Tanggal efektif keanggotaan | Tanggal rekonsiliasi Finance dalam WITA |
| Nama file | `SPA <nomor anggota> a.n <nama anggota>.pdf` |
| Contoh file | `SPA SKI-2026-0001 a.n BUDI.pdf` |

**SPA-03.** Satu pendaftaran memiliki satu urutan surat. Membuka atau mengunduh kembali tidak menghabiskan nomor baru. Surat tersedia di profil dan daftar dokumen anggota. Snapshot data dan versi template harus dapat ditelusuri.

## 6 Simpanan dan kelayakan layanan

**SMP-01.** Simpanan pokok Rp100.000 dibayar sekali per siklus keanggotaan. Simpanan wajib Rp10.000 per bulan; anggota dapat membayar Rp120.000 untuk 12 bulan. Setoran lanjutan hanya menambah simpanan wajib, bukan menagih simpanan pokok lagi.

**SMP-02.** Setoran baru menambah saldo setelah rekonsiliasi Finance. Setoran lanjutan tidak memerlukan persetujuan kedua dari Admin. Satu sumber pembayaran hanya boleh dikreditkan sekali, termasuk jika proses diulang atau diminta secara bersamaan.

**SMP-03.** Kewajiban pertama Rp10.000 berlaku pada tanggal pendaftaran. Bulan berikutnya mengikuti tanggal tersebut. Bila tanggal tidak ada, gunakan hari terakhir bulan bersangkutan, lalu kembali ke tanggal asli pada bulan yang memungkinkan. Sistem menghitung seluruh bulan terlewat sekalipun anggota tidak membuka portal.

**SMP-04.** Alokasi bulanan mengurangi sisa simpanan wajib yang telah dibayar di muka. Total setoran tetap tercatat sebagai simpanan anggota. Tampilkan dengan jelas: pokok, total wajib disetor, wajib teralokasi, sisa prabayar, tunggakan, dan riwayat transaksi. Jangan menampilkan alokasi bulanan seolah uang simpanan dihapus.

**SMP-05.** Status simpanan aktif jika pendaftaran disetujui, pokok yang memenuhi syarat sekurangnya Rp100.000, dan seluruh kewajiban yang telah jatuh tempo tertutup. Sisa prabayar nol belum berarti tidak aktif apabila kewajiban bulan berjalan sudah dibayar. Status menjadi tidak aktif saat kewajiban berikutnya belum tertutup.

**SMP-06.** Bila sisa prabayar Rp30.000 atau kurang, tampilkan pengingat dan tindakan Setor simpanan di ringkasan serta notifikasi anggota. Pengingat juga muncul ketika saldo langsung turun melewati ambang tersebut. Setoran berikutnya menutup tunggakan terlebih dahulu.

**SMP-07.** Simpanan tidak aktif memblokir pengajuan penyertaan modal dan pembiayaan. Profil, dokumen, koreksi yang diperlukan, setoran simpanan, dan pengunduran diri tetap dapat dijangkau sesuai syarat masing-masing. Backend wajib menguji ulang kelayakan saat pengiriman pengajuan.

### Contoh penerimaan

Anggota mendaftar 24 September 2026 dan membayar wajib Rp120.000. Pada tanggal daftar, Rp10.000 dialokasikan dan sisa prabayar Rp110.000. Tanggal 24 Oktober, sisa menjadi Rp100.000. Setelah alokasi 24 Mei 2027, sisa Rp30.000 dan pengingat muncul. Total wajib yang telah disetor tetap Rp120.000.

Anggota dengan pembayaran bulanan Rp10.000 memiliki sisa prabayar nol sesudah alokasi pertama, tetapi tetap aktif sampai kewajiban berikutnya tidak terpenuhi. Tidak ada masa tenggang atau denda tambahan yang ditetapkan dalam requirement saat ini.

## 7 Penawaran project dan pengajuan penyertaan modal

### Penawaran Manajer

**PRJ-01.** Hanya Manajer dapat membuat penawaran dengan nama penawaran, kode project unik, dan kuota penerimaan dalam rupiah. Penawaran tampil pada dashboard anggota beserta total kuota, jumlah teralokasi, sisa kuota, dan status terbuka atau penuh.

**PRJ-02.** Kode project merupakan kode bisnis yang diisi Manajer. Kode ini berbeda dari kode surat otomatis `SPK-SKI-MRBH-...`. Gunakan kolom terpisah agar keduanya tidak tertukar.

**PRJ-03.** Pengajuan menahan kuota sejak dikirim, termasuk ketika masih diperiksa atau perlu perbaikan. Penolakan final melepaskan kuota. Reservasi dilakukan atomik di database agar dua pengajuan bersamaan tidak melewati kuota. Penawaran penuh tetap dapat terlihat sebagai informasi, tetapi tidak dapat dipilih untuk pengajuan baru.

**PRJ-04.** Saat ini belum ada jadwal buka tutup, kedaluwarsa reservasi, atau pengaturan perubahan kuota setelah terisi. Pengembangan fitur itu memerlukan kebijakan tambahan; jangan mengasumsikannya sudah ada.

### Pengajuan anggota

**MDL-01.** Anggota yang disetujui dan memiliki simpanan aktif memilih penawaran, mengisi nominal rupiah bulat, mengunggah bukti JPG/JPEG, PNG, atau PDF maksimal 10 MB, lalu menyetujui pemakaian tanda tangan terdaftar untuk akad ini. Identitas diambil dari profil dan disalin sebagai snapshot pengajuan.

**MDL-02.** Nominal harus positif, tidak melampaui sisa kuota, dan memenuhi batas teknis saat ini Rp1 triliun per pengajuan. Batas Rp1 pada kode adalah validasi teknis, bukan ketetapan minimum produk. Minimum bisnis belum ditetapkan.

**MDL-03.** Pengajuan masuk ke Finance untuk rekonsiliasi dan Admin untuk pemeriksaan. Admin dapat memeriksa data, tetapi persetujuan dan pembuatan akad wajib menunggu hasil Finance yang cocok dengan bukti serta nominal pengajuan saat ini.

### Perbaikan

**REV-01.** Permintaan perbaikan dari Admin atau Finance langsung membuka tombol Perbaiki di portal anggota. Catatan harus terlihat di ringkasan dan detail pengajuan. Pengguna tidak perlu meminta role lain mengembalikan pengajuan terlebih dahulu.

**REV-02.** Perbaikan mempertahankan ID dan riwayat, menaikkan versi data, serta membuat putaran tugas yang sesuai. Bukti lama tetap dapat diaudit. Perubahan nominal diuji lagi terhadap kuota; bukti atau nominal yang berubah memerlukan rekonsiliasi ulang.

**REV-03.** Retry pengiriman dengan ID yang sama tidak membuat pengajuan ganda. Jika versi sudah berubah karena petugas lain bekerja, tampilkan pesan konflik dan minta pemuatan ulang tanpa menghapus isian lokal.

## 8 Akad dan pengelolaan dokumen

### Alur penerbitan

**AKD-01.** Tahap pengajuan: menunggu pemeriksaan → dalam pemeriksaan → siap dibuat → sedang dibuat → menunggu tanda tangan koperasi → akad lengkap. Perlu perbaikan kembali ke pemeriksaan setelah anggota mengirim ulang. Penolakan disertai alasan. Gangguan pembuatan PDF harus dapat dicoba ulang tanpa membuat surat baru.

**AKD-02.** Admin memeriksa data dan nominal, lalu mengisi tanggal akad serta konfirmasi pembuatan. Server menentukan nomor, kode surat, tanggal efektif, dan tanggal selesai. Klien tidak boleh mengganti nilai turunan tersebut.

| Nilai | Rumus dan contoh |
| --- | --- |
| Kode surat otomatis | `SPK-SKI-MRBH-<bulan angka>/<bulan Romawi>/<tahun>` |
| Nomor akad lengkap | `<urut 4 digit>/<kode surat>` |
| Contoh nomor akad | `0007/SPK-SKI-MRBH-9/IX/2026` |
| Efektif modal baru | Tanggal akad +10 hari kalender; hasil tanggal 31 digeser ke tanggal 1 bulan berikutnya |
| Selesai | Tanggal efektif yang sudah disesuaikan +365 hari kalender |
| Nama dokumen di portal | `SPK <kode project> / <urut surat saja> a.n <nama anggota>` |
| Contoh nama dokumen | `SPK MRBH-001 / 0007 a.n BUDI` |
| Nama file unduhan | `SPK MRBH-001 - 0007 a.n BUDI.pdf` |

**AKD-03.** Urutan akad bersifat global, minimal empat digit, tidak kembali ke awal setiap bulan atau tahun. Satu pengajuan hanya mendapat satu nomor meskipun diproses bersamaan atau diulang. Nomor yang sudah dipesan tidak dialihkan ke pengajuan lain. Karakter terlarang pada nama file, termasuk `/`, diganti dengan `-`.

**AKD-04.** Gunakan template akad yang disediakan, dua halaman dengan posisi isi, kolom, kop, klausul, dan area tanda tangan yang sama. Isian: nomor, kalimat pembuka dan tanggal, identitas anggota, alamat dan wilayah, rekening, kontak, nominal dan terbilang, periode, serta nama penanda tangan. Perubahan framework tidak boleh mengubah susunan kontrak.

**AKD-05.** Tanda tangan anggota diambil dari snapshot saat pengajuan. Pangkas ruang kosong dan sesuaikan proporsi ke area 100 × 35 point tanpa merenggangkan gambar. Tanda tangan koperasi pada draft dibiarkan kosong. Catat hash tanda tangan, versi profil, waktu persetujuan, dan versi template.

**AKD-06.** Setelah PDF berhasil dibuat, file otomatis diunduh; sediakan tombol Unduh kembali jika unduhan diblokir browser. Admin meminta tanda tangan ketua atau direktur di luar portal, lalu mengunggah PDF lengkap dengan konfirmasi pemeriksaan tanda tangan.

**AKD-07.** PDF lengkap tersimpan di daftar dokumen anggota dan tidak boleh ditimpa melalui unggah biasa. Validasi PDF dapat dibaca, bukan file draft yang sama, serta simpan hash dan jejak unggah. Pemeriksaan tanda tangan koperasi masih manual; memasukkan gambar tanda tangan bukan integrasi Privy atau verifikasi tanda tangan tersertifikasi.

## 9 Finance dan daftar bagi hasil

### Rekonsiliasi penerimaan

**FIN-01.** Antrean Finance menggabungkan setoran pendaftaran, penyertaan modal baru, dan simpanan wajib tambahan. Data minimal: anggota, jenis setoran, nominal diharapkan, bukti, waktu masuk tugas, status, dan versi sumber.

**FIN-02.** Finance mengisi nominal diterima, tanggal dana masuk, referensi mutasi, keputusan, dan catatan bila perlu perbaikan. Persetujuan hanya sah jika nominal sama, tanggal tidak di masa depan, bukti masih sama, versi data terbaru, dan pemeriksaan dikonfirmasi.

**FIN-03.** Sistem menyimpan pemeriksa, waktu, nominal, dan referensi. Persetujuan yang sama tidak dapat dikreditkan dua kali. Bukti transfer adalah bahan pemeriksaan; pengunggahan saja tidak membuktikan uang sudah diterima.

### Persiapan bagi hasil per tanggal

**BHS-01.** Finance memilih tanggal, dengan tanggal hari ini WITA sebagai default. Sistem memakai tanggal efektif nisbah sebagai dasar. Pembayaran pertama jatuh satu bulan kalender sesudah efektif, lalu periode 1–12. Tidak ada bagi hasil pada hari efektif pertama.

**BHS-02.** Contoh 5 September 2026: periksa akad efektif 5 September 2025, 5 Oktober 2025, dan seterusnya sampai 5 Agustus 2026. Akad harus memiliki PDF yang sudah dibuat atau sudah lengkap, sumber modal direkonsiliasi, dan tanggal pembayaran tidak melewati tanggal selesai. Akad lanjut mengikuti validasi modal asal.

**BHS-03.** Nominal per akad = 5% × pokok, dibulatkan setengah ke atas ke rupiah penuh. Contoh pokok Rp10.000.000 menghasilkan Rp500.000 per periode. Angka 5% merupakan aturan aplikasi yang diminta; dokumen ini tidak menetapkan ulang isi atau kesesuaian akad.

**BHS-04.** Kelompokkan nominal yang sudah dibulatkan per akad menurut anggota dan rekening tujuan. Tampilkan rincian akad, pokok, periode, bank, rekening, nama pemilik, total per tujuan, serta total keseluruhan hari tersebut. Rekening berbeda tetap menjadi baris transfer berbeda. Ekspor CSV harus mempertahankan nol awal rekening dan mencegah formula aktif dari teks pengguna.

**BHS-05.** Untuk tanggal 29 atau 30 yang tidak ada pada suatu bulan, gunakan hari terakhir bulan tersebut. Aturan akhir tetap +365 hari, sehingga tidak boleh memaksakan pembayaran ke-12 melewati akhir akad. Kondisi tahun kabisat perlu keputusan K-05 sebelum produksi.

**BHS-06.** Tindakan Selesaikan persiapan hanya menyelesaikan tugas penyusunan daftar. Tindakan tersebut tidak menandai transfer bank sudah dibayar. Pelacakan pembayaran bagi hasil per anggota dan bukti transfernya belum tersedia sebagai alur pembayaran penuh.

## 10 Jatuh tempo dan kelanjutan modal

**JTP-01.** Mulai H-30 tanggal selesai, portal anggota menampilkan pengingat untuk setiap akad sampai anggota memilih. Pengingat tetap ada bila jatuh tempo sudah lewat dan keputusan belum tercatat.

**JTP-02.** Anggota hanya dapat mengonfirmasi satu kali: Lanjut ke project baru atau Pengembalian modal. Tampilkan ringkasan pilihan dan pernyataan bahwa pilihan tidak dapat diganti. Backend menolak pilihan kedua, termasuk permintaan bersamaan.

### Lanjut ke project baru

**JTP-03.** Anggota harus aktif, simpanan aktif, memilih project berbeda yang dibuka Manajer, memiliki sisa kuota cukup, dan menyetujui penggunaan tanda tangan. Implementasi saat ini melanjutkan seluruh pokok; pembagian sebagian lanjut dan sebagian kembali belum didukung.

**JTP-04.** Reservasi kuota dan keputusan dicatat dalam satu transaksi. Sistem membuat pengajuan baru yang terkait akad asal untuk diproses Admin. Tidak ada transfer baru atau unggah bukti baru; validasi dana mengikuti rekonsiliasi modal asal.

**JTP-05.** Tanggal efektif baru adalah tanggal selesai akad lama. Bila keputusan terlambat, gunakan tanggal konfirmasi. Tidak ditambah 10 hari; penyesuaian tanggal 31 ke tanggal 1 tetap berlaku. Tanggal selesai baru adalah efektif baru +365 hari. Akad baru tetap melalui generate PDF dan unggah dokumen lengkap.

### Pengembalian modal

**JTP-06.** Finance mendapat jadwal dengan nominal pokok penuh, rekening dari snapshot akad, dan tanggal jatuh tempo. Konfirmasi anggota lebih awal tidak mempercepat pengembalian. Contoh: memilih 1 September untuk akad berakhir 20 September tetap dijadwalkan 20 September.

**JTP-07.** Sebelum H, tugas belum dapat dimulai atau dinyatakan dibayar. Pada H, status masa kontrak ditampilkan Selesai, tetapi pengembalian tetap memiliki status Terjadwal, Jatuh tempo, atau Sudah dikembalikan. Selesai kontrak tidak boleh dianggap sama dengan uang sudah ditransfer.

**JTP-08.** Finance melakukan transfer di luar sistem lalu mengisi nominal tepat, tanggal antara jatuh tempo dan hari ini, referensi, bukti JPG/JPEG, PNG, atau PDF, dan konfirmasi. Pencatatan hanya berhasil sekali. Keterlambatan tidak menghilangkan tugas yang belum selesai.

### Laporan Manajer

**JTP-09.** Rentang laporan berdasarkan tanggal selesai akad. Tampilkan total nominal serta jumlah akad yang berakhir, lanjut, kembali, dan belum memilih; tampilkan jumlah anggota unik secara terpisah. Pembayaran pengembalian harus dibedakan dari pilihan pengembalian yang belum dilaksanakan.

**Contoh:** akad jatuh tempo Rp100 juta terdiri dari lanjut Rp60 juta, kembali Rp30 juta, dan belum memilih Rp10 juta. Total tiga kategori harus sama dengan Rp100 juta. Satu anggota dengan dua akad dihitung dua akad, tetapi satu anggota unik.

## 11 Pengunduran diri dan pembiayaan

### Pengunduran diri

**KLR-01.** Anggota mengirim alasan dan persetujuan. Pengajuan ditolak sistem bila ada akad penyertaan modal yang masih berjalan, pengajuan modal belum selesai, pengembalian pokok modal belum tuntas, keputusan jatuh tempo belum diberikan, atau kontrak pembiayaan belum dilunasi. Tampilkan daftar penghambat secara jelas.

**KLR-02.** Saat permohonan pengunduran diri terbuka, layanan pengajuan baru dikunci. Hanya satu permohonan terbuka per siklus keanggotaan. Anggota dapat membatalkan pada tahap menunggu atau perlu perbaikan, sebelum diproses lebih lanjut.

**KLR-03.** Admin memeriksa lalu menyetujui, meminta perbaikan, atau menolak dengan catatan. Persetujuan mengalihkan tugas ke Finance. Sistem memeriksa ulang penghambat pada setiap tahap kritis agar kontrak baru tidak lolos bersamaan dengan penutupan.

**KLR-04.** Finance mengembalikan simpanan pokok tepat Rp100.000 ke rekening anggota. Wajib ada setoran pokok terverifikasi, tanggal transfer yang sah, referensi, bukti, dan konfirmasi. Setelah pencatatan berhasil, permohonan masuk ke Manajer. Finance tidak boleh merekam pengembalian dua kali.

**KLR-05.** Manajer memberikan persetujuan final setelah persetujuan Admin dan bukti pengembalian Finance lengkap. Keanggotaan ditutup permanen; nomor lama tidak dapat dipakai lagi. Riwayat tidak dihapus dan tetap tersedia untuk petugas berwenang.

**KLR-06.** Mantan anggota dengan seluruh data identitas yang sama boleh mendaftar ulang. Sistem membuat siklus, data pendaftaran, berkas, simpanan awal, dan nomor anggota baru. Saldo dan akad lama tidak dipindahkan ke siklus baru. Akun autentikasi dapat tetap sama; yang ditutup adalah keanggotaan lama.

**Perlu keputusan K-04:** alur saat ini hanya mengembalikan simpanan pokok. Perlakuan simpanan wajib, simpanan lain, tunggakan, dan koreksi setelah pengembalian belum ditetapkan. Jangan menganggap saldo tersebut hangus atau otomatis telah diselesaikan.

### Batas modul pembiayaan

**PBY-01.** Form pengajuan pembiayaan anggota masih simulasi dan memiliki pemeriksaan kelayakan simpanan. Jangan memigrasikan tampilan simulasi sebagai klaim proses pembiayaan operasional.

**PBY-02.** Register Admin yang sudah tersimpan berisi anggota, nomor kontrak, tujuan, nominal, tanggal mulai, tanggal selesai, dan status pelunasan. Admin mencatat kontrak yang sudah disepakati di luar alur aplikasi serta referensi pelunasannya. Anggota melihat register miliknya.

**PBY-03.** Tanggal kontrak lewat tidak otomatis berarti lunas. Kontrak tetap menghalangi pengunduran diri sampai pelunasan dicatat. Pengajuan, analisis, akad pembiayaan, margin, jadwal angsuran, tunggakan, dan pencairan harus mempunyai spesifikasi tambahan jika masuk tahap operasional berikutnya.

## 12 Tugas petugas laporan dan notifikasi

### Waktu kerja dan antrean

**TGS-01.** Catat waktu masuk, mulai, selesai, petugas, role, hasil, dan ID objek pada setiap tahap. Tahap mencakup pemeriksaan pendaftaran, rekonsiliasi, pemeriksaan modal, generate, unggah akad, persiapan bagi hasil, pengembalian, dan persetujuan pengunduran diri. Waktu dan aktor berasal dari server.

**TGS-02.** Tombol Mulai mengerjakan merekam waktu mulai pertama. Klik ulang tidak mengubahnya. Penyimpanan yang berhasil menyelesaikan tahap terkait; validasi gagal atau konflik data tidak boleh menghasilkan catatan pekerjaan selesai.

**TGS-03.** Putaran perbaikan membuat tugas baru dan menutup tugas yang digantikan. Riwayat tahap lama tetap ada. Semua ringkasan role mengurutkan tugas aktif berdasarkan waktu masuk tahap terbaru menurun, bukan berdasarkan nama atau tanggal pendaftaran anggota. Tugas Finance yang belum jatuh tempo berada di jadwal tersendiri.

**TGS-04.** Hanya Manajer melihat rincian waktu dan KPI. Admin dan Finance tetap memiliki tombol kerja tanpa tampilan analisis waktu. Manajer dapat memilih hari ini hingga tujuh hari sebelumnya, inklusif, serta filter role dan status dan ekspor CSV.

**TGS-05.** Waktu respons = mulai pertama dikurangi masuk. Waktu proses = selesai dikurangi mulai pertama. Hitungan saat ini adalah durasi kalender, termasuk waktu menunggu; bukan pengukuran jam kerja aktif. Data tanpa waktu mulai tidak boleh dianggap berdurasi nol. Rata-rata harus menampilkan jumlah sampel yang dihitung.

**TGS-06.** Jumlah selesai adalah jumlah tahap pekerjaan, bukan jumlah anggota. Aktivitas yang berlangsung melintasi tanggal tetap terlihat dalam rentang yang sesuai. Riwayat sebelum pelacakan tidak boleh diberi timestamp buatan. Kalender kerja, jam istirahat, target SLA, dan nilai KPI belum menjadi aturan perhitungan aplikasi.

### Laporan untuk anggota

**LAP-01.** Anggota yang disetujui dapat membuka laporan penggunaan dana dan laporan keuangan yang diterbitkan Manajer. Hanya Manajer boleh mengunggah.

**LAP-02.** Isian laporan: kategori, judul, periode bulan dan tahun, kode project wajib untuk penggunaan dana, PDF maksimal 10 MB, dan konfirmasi boleh dibaca anggota. Catat pengunggah dan waktu unggah. Pada kode saat ini, laporan terbit dapat dibaca semua anggota yang disetujui; pembatasan per project belum diterapkan.

### Notifikasi

**NTF-01.** Portal menampilkan kebutuhan koreksi, sisa simpanan wajib rendah, dan pilihan jatuh tempo. Penyegaran saat halaman diam tidak mengganggu input, dialog, tanda tangan, atau lampiran. Notifikasi di luar portal belum tersedia.

**NTF-02. Usulan produksi.** Proses terjadwal dapat membuat pengingat dan tugas tanpa pengguna membuka website. Pekerjaan harus aman dijalankan ulang, memiliki catatan kegagalan, dan menghitung ulang periode yang terlewat. Kanal dan frekuensi pesan memerlukan keputusan terpisah.

## 13 Model data yang perlu dipertahankan

Nama tabel boleh berubah. Relasi, identitas, saldo, dokumen historis, dan aturan keunikannya wajib tetap setara. Semua uang memakai bilangan bulat rupiah. Tanggal bisnis disimpan sebagai tanggal; timestamp kejadian disimpan konsisten dan ditampilkan dalam Asia/Makassar.

| Entitas | Data inti dan relasi |
| --- | --- |
| Akun | ID autentikasi, kontak, status akses; dapat mempunyai beberapa siklus keanggotaan |
| Keanggotaan | ID siklus, akun, nomor unik, profil, status, versi, tanggal daftar dan tutup |
| Berkas privat | Pemilik, jenis, lokasi objek, MIME, ukuran, nama asli, hash bila digunakan, waktu unggah |
| Snapshot pengajuan | Profil, rekening, nomor anggota, tanda tangan dan persetujuan saat pengajuan |
| Pengajuan | ID, anggota, jenis, nominal atau alasan, status, bukti, versi, waktu kejadian |
| Penawaran | ID, nama, kode project unik, kuota, pembuat; terkait banyak pengajuan |
| Rekonsiliasi | Sumber setoran, bukti yang diperiksa, nominal diharapkan dan diterima, keputusan, pemeriksa |
| Kredit simpanan | Sumber unik, pokok, wajib, lainnya, waktu diterima; tidak ditambah ulang |
| Akad | Pengajuan, urutan dan nomor lengkap, tanggal, nominal, snapshot, versi template, draft dan final |
| Surat keanggotaan | Keanggotaan, urutan surat, snapshot, tanggal rekonsiliasi |
| Keputusan jatuh tempo | Satu per akad asal, lanjut atau kembali, tanggal konfirmasi, akad baru bila lanjut |
| Pengembalian modal | Akad, nominal, jatuh tempo, rekening, tanggal transfer, bukti, pencatat |
| Penyelesaian pengunduran diri | Permohonan, persetujuan Admin, pengembalian pokok, persetujuan final Manajer |
| Kontrak pembiayaan | Anggota, nomor unik, nominal, periode, data pelunasan |
| Akses petugas | Akun, role, pemberi izin, pencabutan, riwayat perubahan akses |
| Aktivitas petugas | Objek, tahap, aktor, role, jenis kejadian, timestamp, hasil; riwayat tidak ditimpa |
| Laporan | Kategori, periode, project, file, penerbit, waktu publikasi |

**DAT-01.** Pisahkan status rekonsiliasi, status pengajuan, masa kontrak, dan status pengembalian. Jangan mengandalkan satu label “Selesai” untuk semua makna.

**DAT-02.** Gunakan transaksi dan batas keunikan untuk nomor anggota, urutan akad, keputusan jatuh tempo, kredit simpanan, pengembalian, dan permohonan pengunduran diri aktif. Simpan versi untuk mencegah satu petugas menimpa perubahan petugas lain.

**DAT-03.** Snapshot dan PDF historis tidak mengikuti perubahan profil baru. Hubungkan akad lanjut ke akad asal. Penutupan tidak menghapus catatan keuangan. Nomor lama tidak dialokasikan ulang.

## 14 Kontrak layanan aplikasi

Pemetaan di bawah adalah antarmuka backend yang tersedia pada kode pratinjau. Prefix seluruh rute adalah `/api/workflow`. SvelteKit boleh mempertahankan endpoint ini atau memakai form actions dengan perilaku setara. Otorisasi dan aturan bisnis harus tetap berada di server.

| Metode dan rute relatif | Tujuan dan pengguna |
| --- | --- |
| GET pada prefix utama | Ringkasan sesuai pemilik atau konteks petugas |
| POST `/profile` | Pendaftaran dan koreksi anggota, multipart |
| POST `/profile/review` | Pemeriksaan serta keputusan Admin |
| GET `/profile/ktp`, `/profile/signature`, `/profile/proof` | Berkas privat sesuai izin |
| GET `/profile/letter` | Surat keanggotaan; `download=1` untuk unduh |
| POST `/profile/restart` | Mulai siklus baru setelah keanggotaan ditutup |
| GET dan POST `/offers` | Lihat penawaran; buat oleh Manajer |
| POST `/capital`, `/savings`, `/withdrawal` | Pengajuan sesuai jenis |
| POST `/{id}/revise`, `/{id}/cancel` | Koreksi atau pembatalan yang diizinkan |
| POST `/{id}/review`, `/{id}/generate`, `/{id}/upload-signed` | Tahap Admin pada pengajuan |
| GET `/{id}/proof`, `/{id}/contract`, `/{id}/signed` | Bukti, draft, dan akad lengkap |
| GET `/finance/reconciliations`; POST `/finance/reconcile` | Daftar dan keputusan rekonsiliasi |
| GET `/finance/payouts`; POST `/finance/payouts/complete` | Jadwal dan penyelesaian persiapan bagi hasil |
| POST `/{id}/maturity`; GET `/maturity/report` | Pilihan anggota dan laporan Manajer |
| GET `/finance/returns`; POST `/finance/returns/{id}/complete` | Pengembalian modal |
| GET `/finance/withdrawals`, `/manager/withdrawals` | Antrean pengunduran diri per tahap |
| POST `/finance/withdrawals/{id}/pay`, `/manager/withdrawals/{id}/close` | Pengembalian pokok dan penutupan final |
| GET `/financing`; GET dan POST `/staff/financing` | Register pembiayaan anggota dan Admin |
| POST `/staff/financing/{id}/settle` | Pencatatan pelunasan |
| GET `/staff/tasks`; POST `/staff/activity/start` | Daftar tugas dan mulai pengerjaan |
| GET `/staff/activity`; POST `/staff/role` | Laporan Manajer dan pilihan portal berizin |
| GET dan POST `/reports`; GET `/reports/{id}/file` | Publikasi dan pembacaan laporan |
| GET dan POST `/staff/accounts` | Daftar dan pengaturan akses petugas oleh Manajer |

Konteks anggota untuk pemeriksaan petugas saat ini memakai rute `/member/{profileId}/...` atau referensi anggota yang divalidasi server. Referensi tersebut bukan bukti kewenangan. Identitas pemilik tidak boleh ditentukan hanya dari isian klien.

### Kontrak input dan kegagalan

- Pengajuan modal memakai `id`, `offerId`, `amount`, `proof`, dan `signatureConsent`. Perbaikan juga membawa `version`.
- Rekonsiliasi membawa jenis dan ID sumber, versi sumber serta rekonsiliasi, nominal diterima, tanggal, referensi, keputusan, konfirmasi, dan catatan koreksi.
- Respons menyertakan ID, status, versi, waktu server, dan tautan berkas berizin; jangan mengirim lokasi penyimpanan privat atau rahasia akses.
- Gunakan kesalahan terstruktur: 400 untuk input, 401 untuk belum masuk, 403 untuk izin, 404 untuk objek tidak tersedia, 409 untuk konflik atau syarat belum terpenuhi, 413 untuk ukuran, dan 503 untuk gangguan layanan.
- Retry dengan ID sama harus aman. Pencatatan aktivitas dan perubahan bisnis harus berhasil atau gagal bersama. Dalam implementasi baru, tambahkan kesalahan per kolom dan ID penelusuran tanpa menampilkan data sensitif.

## 15 Rancangan implementasi SvelteKit

Bagian ini merupakan **usulan arsitektur**, bukan perubahan yang sudah dilakukan. Svelte menangani komponen antarmuka; SvelteKit dapat menyediakan halaman, pemuatan data server, form actions, dan endpoint. Backend terpisah juga dapat dipakai selama kontrak layanannya setara.

### Pembagian tanggung jawab

| Lokasi usulan | Isi |
| --- | --- |
| `src/routes` | Halaman publik, anggota, Admin, Finance, dan Manajer; adapter tipis untuk setiap layanan |
| `src/lib/components` | Field, tabel tugas, badge status, unggah file, kanvas tanda tangan, dialog, kartu, layout |
| `src/lib/domain` | Tipe data, status, validasi umum, aturan tanggal, penomoran, dan perhitungan tanpa akses jaringan |
| `src/lib/server/services` | Registrasi, simpanan, penawaran, akad, rekonsiliasi, jatuh tempo, pengunduran diri |
| `src/lib/server/repositories` | Query database dan transaksi, terpisah dari tampilan |
| `src/lib/server/auth` | Sesi, autentikasi, role, dan izin terhadap objek |
| `src/lib/server/documents` | Pengisian template dan penyimpanan PDF privat |
| `src/hooks.server.ts` | Memuat sesi dan identitas; layanan tetap memeriksa izin setiap tindakan |
| `static` | Logo, favicon, aset publik; tidak berisi KTP, tanda tangan anggota, atau bukti |
| `tests` | Uji aturan, integrasi API, akses, transaksi bersamaan, dan alur browser |

`+page.svelte` menampilkan halaman. `+page.server.ts` dapat memuat data dan menangani form actions. `+server.ts` dapat menyediakan endpoint. Kode server ditempatkan pada direktori server agar tidak masuk ke bundle browser. Acuan framework: [S1]–[S3].

### Pemetaan kode saat ini

| Sumber lama | Modul tujuan |
| --- | --- |
| `portal.js`, `workflow.js`, `petugas.js` | Halaman dan komponen per fitur |
| `membership.js`, `membership-letter.js` | Keanggotaan dan surat |
| `savings.js`, `finance.js` | Simpanan, rekonsiliasi, jadwal bagi hasil |
| `offers.js`, `contract-rules.js`, `contract-pdf.js`, `document-names.js` | Penawaran, aturan akad, dokumen |
| `maturity.js`, `withdrawal.js` | Jatuh tempo, pengembalian, penutupan, register pembiayaan |
| `access.js`, `activity.js`, `staff-queue.js`, `manager.js`, `reports.js` | Izin, tugas, audit, monitoring, laporan |
| `db/schema.ts`, `drizzle/`, `templates/` | Migrasi data dan aset template yang dipertahankan |

**DEV-01.** Gunakan TypeScript, formatter, lint, nama fungsi yang menjelaskan tugas, dan satu modul per domain. Hindari satu file besar berisi HTML string, aturan uang, SQL, serta event handler sekaligus. Komentar menjelaskan alasan aturan, misalnya pergeseran tanggal 31.

**DEV-02.** Komponen tidak menghitung saldo otoritatif atau memberi role. Aturan utama harus dapat diuji tanpa browser dan tanpa Svelte. Setiap layanan menerima aktor serta input tervalidasi, menjalankan transaksi, lalu mengembalikan hasil terstruktur.

## 16 Persyaratan produksi dan keamanan

Ketentuan berikut merupakan **usulan produksi yang harus diverifikasi saat pembangunan ulang**. Tidak ada klaim bahwa semua kontrol sudah tersedia atau bahwa pratinjau telah memenuhi standar sertifikasi tertentu.

**NFR-01.** Sediakan autentikasi milik koperasi atau penyedia identitas yang dipilih, sesi server, pemulihan akun, dan pencabutan sesi. Tetapkan autentikasi tambahan untuk petugas. Header identitas ChatGPT pada pratinjau tidak boleh dianggap sebagai login yang aman jika backend dipindah ke server umum.

**NFR-02.** Terapkan izin role dan kepemilikan pada setiap endpoint dan berkas. Pemisahan URL, penyembunyian menu, serta `noindex` bukan pengganti kontrol akses. Uji dengan akun berbeda, termasuk mantan anggota.

**NFR-03.** Gunakan HTTPS, perlindungan permintaan lintas situs pada operasi berbasis cookie, cookie sesi yang aman, pembatasan percobaan login, sanitasi keluaran, dan kebijakan konten yang sesuai. Rahasia berada di konfigurasi server. Log tidak boleh berisi nomor KTP lengkap, tanda tangan, kata sandi, atau token.

**NFR-04.** Simpan berkas anggota secara privat. Validasi ekstensi, MIME, isi, ukuran, dan keterbacaan di server. Tambahkan pemeriksaan berkas berbahaya sesuai layanan penyimpanan. Unduhan memeriksa izin saat diminta; tautan tidak memberikan akses permanen tanpa kontrol.

**NFR-05.** Gunakan transaksi, kendala unik, kontrol versi, dan operasi aman diulang untuk mencegah kuota lebih, nomor ganda, kredit ganda, dan pengembalian ganda. Bila penyimpanan file berhasil tetapi database gagal, bersihkan objek baru yang tidak dipakai tanpa menghapus bukti historis.

**NFR-06.** Pisahkan lingkungan pengembangan, uji, dan produksi. Buat cadangan database serta berkas; uji pemulihan. Target waktu pemulihan, toleransi kehilangan data, masa simpan, dan hak penghapusan perlu diputuskan pemilik proses.

**NFR-07.** Proses rutin harus dapat mengejar tanggal yang terlewat. Zona waktu bisnis adalah Asia/Makassar. Jam pada komputer pengguna tidak boleh menentukan nomor, keputusan jatuh tempo, atau timestamp KPI.

**NFR-08.** Sediakan pemantauan kegagalan, jejak perubahan yang tidak dapat diedit melalui portal biasa, dan prosedur koreksi administrasi. Halaman keuangan memakai data server yang terbaru. Pengajuan gagal tidak menghapus formulir.

**NFR-09.** Gunakan pagination untuk daftar panjang dengan urutan terbaru yang stabil. Tetapkan target kapasitas, jumlah pengguna bersamaan, dan waktu respons sebelum uji beban; dokumen ini tidak mengklaim kapasitas yang belum diukur.

**NFR-10.** Kelulusan aksesibilitas mencakup navigasi keyboard, fokus dialog, label formulir, keterbacaan, alternatif gambar, pengurangan motion, serta tampilan ponsel tanpa tindakan utama terpotong. Kesetaraan visual diverifikasi terhadap pratinjau yang disetujui.

## 17 Skenario penerimaan

Setiap skenario dijalankan pada lingkungan uji dengan data fiktif. Hasil dan bukti uji dicatat menurut ID. Daftar ini adalah syarat penerimaan implementasi baru, bukan pernyataan semua pengujian produksi telah dilakukan.

| ID | Skenario | Hasil yang diterima |
| --- | --- | --- |
| UAT-01 | Daftar tanpa KTP, bukti, atau tanda tangan | Ditolak di server; kolom diberi penjelasan |
| UAT-02 | Kirim ulang pendaftaran yang sama | Tidak ada profil atau nomor baru |
| UAT-03 | Admin menyetujui sebelum rekon | Ditolak; tugas tetap belum selesai |
| UAT-04 | Finance mengembalikan bukti | Anggota dapat memperbaiki tanpa menunggu Admin |
| UAT-05 | Surat anggota bulan September | Nomor memuat IX; PDF satu halaman; nama SPA benar |
| UAT-06 | Daftar pada akhir bulan dan melewati Februari | Alokasi sesuai tanggal acuan tanpa kewajiban ganda |
| UAT-07 | Sisa wajib Rp30.000 lalu di bawahnya | Pengingat muncul; total setoran tidak terhapus |
| UAT-08 | Simpanan tidak aktif mengirim modal lewat API | Ditolak meskipun tombol browser diubah |
| UAT-09 | Dua anggota berebut sisa kuota | Total reservasi tidak melebihi kuota |
| UAT-10 | Bukti atau nominal pengajuan berubah | Rekon lama tidak meloloskan persetujuan baru |
| UAT-11 | Generate bersamaan atau diulang | Satu nomor dan satu dokumen otoritatif per pengajuan |
| UAT-12 | Tanggal akad 21 Agustus 2026 | Efektif 1 September 2026; selesai 1 September 2027 |
| UAT-13 | Nomor lengkap 0007 dan project MRBH-001 | Nama dokumen memakai 0007 saja; separator file aman |
| UAT-14 | Render akad dan tanda tangan besar | Layout dua halaman sama; tanda tangan proporsional |
| UAT-15 | Unggah PDF lengkap, lalu unggah ulang | Arsip pertama utuh; penimpaan biasa ditolak |
| UAT-16 | Bagi hasil 5 September 2026 | Kelompok efektif sesuai BHS-02; nominal 5% dan total benar |
| UAT-17 | Selesaikan persiapan bagi hasil | Tidak muncul klaim transfer telah dibayar |
| UAT-18 | Pilih jatuh tempo pada H-31 dan H-30 | H-31 ditolak; H-30 tersedia |
| UAT-19 | Kirim dua pilihan jatuh tempo | Hanya satu berhasil; keputusan tidak dapat diganti |
| UAT-20 | Lanjut ke project baru | Kuota ditahan, tanpa bukti baru dan tanpa +10 hari |
| UAT-21 | Pilih kembali sebelum tanggal selesai | Finance tidak bisa membayar lebih awal dalam sistem |
| UAT-22 | Dua petugas mencatat pengembalian bersamaan | Hanya satu pencatatan berhasil |
| UAT-23 | Pengunduran diri dengan kontrak aktif atau belum lunas | Ditolak dan penghambat ditampilkan |
| UAT-24 | Pengunduran diri lengkap | Admin lalu Finance Rp100.000 lalu Manajer; nomor ditutup |
| UAT-25 | Daftar ulang dengan data identik | Nomor baru; saldo dan dokumen lama tidak pindah |
| UAT-26 | Anggota A membuka file B; Admin memakai endpoint Finance | Ditolak; Manajer tetap dapat memakai izin yang sah |
| UAT-27 | Tugas baru dan kirim ulang koreksi | Tahap terbaru tampil teratas; waktu lama tetap ada |
| UAT-28 | Lihat KPI dari Admin atau Finance | Tidak dapat diakses; Manajer dapat melihat rentang izin |
| UAT-29 | Biarkan formulir terbuka saat data diperbarui | Isian, lampiran, fokus, dan dialog tetap ada |
| UAT-30 | Unggah laporan sebagai Admin | Ditolak; unggah Manajer dapat dibaca anggota berizin |
| UAT-31 | Pulihkan cadangan pada lingkungan uji | Relasi, saldo, nomor, file, hash, dan riwayat konsisten |

Uji integrasi lama dapat dijadikan bahan awal: `test:workflow`, `test:finance`, `test:activity`, `test:savings`, `test:manager`, `test:access`, `test:maturity`, `test:withdrawal`, dan `test:portal`. Adaptasi tes harus mengikuti perilaku bisnis, bukan meniru struktur kode lama.

## 18 Rencana migrasi keputusan dan sumber

### Urutan pengerjaan

1. Bekukan acuan versi 24, tangkapan layar yang disetujui, template, serta kamus data. Putuskan kebijakan yang berdampak pada saldo dan akses.
2. Bangun fondasi SvelteKit atau framework pilihan: komponen, routing, autentikasi, role, database, penyimpanan privat, audit, dan lingkungan uji.
3. Bangun pendaftaran, rekonsiliasi, surat anggota, simpanan, serta perbaikan. Setelah lolos, lanjutkan penawaran, pengajuan modal, PDF, dan arsip.
4. Tambahkan bagi hasil, jatuh tempo, pengembalian, pengunduran diri, laporan, akses petugas, serta monitoring Manajer. Pembiayaan operasional menunggu spesifikasi tersendiri.
5. Lakukan latihan migrasi pada salinan data. Pertahankan ID dan hubungan, urutan tertinggi nomor, saldo terverifikasi, snapshot, waktu historis, bukti, dan hash PDF. Jangan menjalankan reset demo lama pada data tujuan.
6. Cocokkan jumlah anggota, jumlah dan nominal akad, kredit simpanan, keputusan jatuh tempo, pengembalian tertunda, jumlah file, dan dokumen final. Setelah UAT disetujui, lakukan perpindahan dengan batas waktu penulisan yang jelas dan rencana kembali bila gagal.

**Hasil serah terima minimum:** kode yang terbaca dan diformat, requirement versi yang disetujui, kamus data, dokumentasi API, migrasi database, daftar konfigurasi tanpa rahasia, template asli, bukti UAT, petunjuk deployment, cadangan dan pemulihan, serta prosedur koreksi transaksi. Migrasi kode tidak otomatis memindahkan database atau berkas.

### Keputusan yang masih diperlukan

| ID | Keputusan | Kondisi kode saat ini |
| --- | --- | --- |
| K-01 | Simpanan transaksi, khusus, dan biaya administrasi tetap dipakai atau dihapus | Form masih memiliki nilai awal transaksi Rp50.000 dan administrasi Rp30.000; jangan dianggap biaya final yang disepakati |
| K-02 | Identitas wajib KTP saja serta aturan duplikasi NIK lintas akun | KTP foto wajib; tipe SIM atau Paspor masih ada; validasi unik lintas akun perlu dirancang |
| K-03 | Surat anggota setelah Finance saja atau juga setelah Admin | Saat ini dapat tersedia setelah Finance sebelum persetujuan Admin |
| K-04 | Penyelesaian wajib dan simpanan lain saat keluar | Hanya pengembalian pokok Rp100.000 yang diotomatisasi |
| K-05 | Prioritas tenor 365 hari atau jumlah 12 pembayaran pada tahun kabisat | Pembayaran tidak boleh melewati +365 hari; periode ke-12 dapat berada sesudah batas |
| K-06 | Bagi hasil boleh untuk draft generated atau harus signed | Saat ini keduanya dapat masuk jadwal jika dana valid |
| K-07 | Minimum setoran, batas waktu reservasi, pengubahan dan penutupan penawaran | Belum ada kebijakan produk lengkap pada fitur penawaran |
| K-08 | Kanal pengingat, frekuensi, dan SLA petugas | Portal saja; durasi kalender; belum ada kalender jam kerja |
| K-09 | Pencatatan pembayaran bagi hasil dan bank tujuan yang berubah | Saat ini hanya persiapan daftar; rekening berasal dari snapshot akad |
| K-10 | Autentikasi, penyedia backend, retensi, pemulihan, dan skala | Pratinjau memakai ChatGPT serta D1 dan R2; pilihan operasional belum ditetapkan |
| K-11 | Cakupan pembiayaan penuh dan revisi keputusan setelah transaksi | Belum dispesifikasikan; Manajer hanya memiliki persetujuan final penutupan pada alur saat ini |

### Acuan yang digunakan

**Sumber proyek P1.** Kode versi 24 pada commit yang dicatat di bagian 1. Sumber utama: `worker/`, `dist/assets/`, `db/schema.ts`, `drizzle/`, serta `tests/`. README dipakai sebagai petunjuk; bila berbeda, perilaku kode terbaru dan instruksi pengguna menjadi dasar.

**Aset P2.** `templates/akad-penyertaan-modal.docx`, `contract-source.pdf`, `contract-original-layout.pdf`, `contract-layout.json`, `membership-letter-source.docx`, `membership-letter-base.pdf`, gambar pada template, dan font dalam `templates/fonts/`. Logo tersedia dalam `dist/assets/kspps-logo-*`. Dokumen ini mencatat rujukannya; paket sumber serta template perlu ikut diserahkan saat implementasi.

**S1. Struktur proyek SvelteKit.** https://svelte.dev/docs/kit/project-structure — digunakan untuk pemisahan routes, lib, server, dan aset publik.

**S2. Form actions SvelteKit.** https://svelte.dev/docs/kit/form-actions — acuan pengolahan formulir di server.

**S3. Hooks SvelteKit.** https://svelte.dev/docs/kit/hooks — acuan penanganan sesi pada permintaan server.

Dokumentasi SvelteKit diperiksa pada 24 September 2026. Versi framework dan adapter hosting harus dikunci saat implementasi. Dokumen ini tidak mengubah website maupun menerapkan keputusan yang masih terbuka.
