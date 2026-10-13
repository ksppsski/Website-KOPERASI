# To-do pengembangan website KSPPS

Diperbarui: 13 Oktober 2026 — sinkronisasi sumber v36.

Project dibagi menjadi **frontend user**, **frontend petugas**, **frontend avalist**, dan **backend**. Daftar ini mengikuti fitur terakhir yang sudah disepakati. `[x]` berarti sudah tersedia pada implementasi/pratinjau; `[ ]` berarti masih perlu dikerjakan atau diverifikasi. Status tersedia tidak berarti seluruh kebutuhan operasional produksi sudah selesai.

| Bagian           | Folder              | Tanggung jawab                                            |
| ---------------- | ------------------- | --------------------------------------------------------- |
| Frontend user    | `frontend-user/`    | Landing page, pendaftaran dan portal anggota              |
| Frontend petugas | `frontend-petugas/` | Portal admin, finance dan manajer                         |
| Frontend avalist | `frontend-avalist/` | Portal pribadi avalist dan ringkasan fee |
| Backend          | `backend/`          | API, otorisasi, aturan keuangan, database, berkas dan PDF |

`shared/` memuat komponen, CSS dan controller browser yang memang dipakai lintas frontend. `public/` memuat aset bersama. Keduanya adalah pendukung, bukan aplikasi atau backend tambahan. Semua bagian masih dibangun dari satu repository dan dipublikasikan pada satu origin.

## 1. Frontend user

### Struktur dan tampilan

- [x] Pisahkan entry landing page dan portal anggota ke `frontend-user/src/entries/`.
- [x] Pisahkan router anggota ke `frontend-user/src/Portal.svelte` tanpa mengimpor halaman khusus petugas.
- [x] Pertahankan palet logo KSPPS, susunan halaman, favicon dan tampilan responsif.
- [x] Pertahankan animasi kartu: awal horizontal menutupi portal, klik bergeser ke kiri sambil miring dan lingkaran berputar.
- [x] Gunakan istilah penyertaan modal pada layanan anggota.
- [x] Pisahkan pintu masuk petugas dari navigasi landing page dan portal anggota.

### Pendaftaran dan profil

- [x] Sediakan halaman masuk, pendaftaran bertahap dan pemulihan akun.
- [x] Kumpulkan identitas, alamat, kontak, rekening dan data yang diperlukan akad.
- [x] Wajibkan foto KTP serta tanda tangan pada pendaftaran.
- [x] Wajibkan bukti transfer simpanan dalam format JPG, PNG atau PDF.
- [x] Tampilkan nomor anggota `SKI-<tahun daftar>-<nomor urut>`.
- [x] Tampilkan tanda tangan dan foto KTP; KTP di kanan tanda tangan pada layar lebar, ditumpuk pada layar kecil.
- [x] Sediakan tindakan perbaikan ketika admin atau finance meminta koreksi.
- [x] Tampilkan surat keanggotaan setelah pembayaran awal direkonsiliasi finance.
- [ ] Hubungkan formulir masuk dan pemulihan akun ke autentikasi email/kata sandi yang nyata; tampilan saat ini belum melakukan autentikasi mandiri.

### Simpanan, penyertaan modal dan dokumen

- [x] Tampilkan simpanan pokok, simpanan wajib, setoran dan alokasi bulanan dari data API.
- [x] Tampilkan pengingat ketika sisa simpanan wajib di muka paling banyak Rp30.000.
- [x] Batasi pengajuan baru penyertaan modal/pembiayaan ketika simpanan tidak aktif; perbaikan pengajuan lama tetap dapat diakses sesuai statusnya.
- [x] Tampilkan penawaran manajer beserta kode project, kuota dan sisa kuota; penawaran penuh tidak dapat diajukan.
- [x] Penawaran penuh tampil di portal anggota selama 3 × 24 jam sejak terpenuhi; setelah itu disembunyikan tanpa menghapus riwayat Manajer. Kuota yang terbuka kembali memulai periode baru saat penuh lagi.
- [x] Sediakan formulir nominal dan bukti transfer penyertaan modal, beserta persetujuan penggunaan tanda tangan.
- [x] Pertahankan isi formulir, file dan persetujuan saat refresh latar belakang atau percobaan kirim ulang.
- [x] Tampilkan status pengajuan, catatan pemeriksa, akad lengkap dan surat keanggotaan pada portal pemiliknya.
- [x] Tampilkan laporan penggunaan dana dan laporan keuangan yang diunggah manajer.
- [ ] Lengkapi alur pengajuan pembiayaan dan pembayaran angsuran yang masih berupa simulasi; pencatatan kontrak pembiayaan oleh petugas sudah tersedia.

### Akhir akad dan pengunduran diri

- [x] Tampilkan pemberitahuan mulai H-30 hingga anggota menentukan pilihan, termasuk bila sudah lewat jatuh tempo.
- [x] Sediakan pilihan sekali saja: lanjut ke project baru atau pengembalian modal; tampilkan konfirmasi bahwa pilihan tidak dapat diganti.
- [x] Tampilkan permohonan pengunduran diri, hasil pemeriksaan dan alasan penolakan.
- [x] Blokir pengunduran diri ketika masih ada kewajiban kontrak sesuai keputusan backend.
- [x] Tampilkan status penutupan keanggotaan serta pilihan daftar ulang dengan nomor baru.

## 2. Frontend petugas

### Struktur dan akses

- [x] Pisahkan entry dan router petugas ke `frontend-petugas/src/`.
- [x] Tampilkan menu sesuai izin akun: admin, finance atau manajer.
- [x] Izinkan manajer membuka portal admin dan finance; kedua role lain hanya membuka portalnya sendiri.
- [x] Tampilkan tugas terbaru paling atas dan antrean bersama tanpa pencarian nama anggota sebagai syarat membuka tugas.
- [x] Tampilkan waktu kerja/KPI hanya pada portal manajer.

### Admin

- [x] Periksa identitas, foto KTP, tanda tangan dan kelengkapan pendaftaran.
- [x] Berikan persetujuan atau permintaan perbaikan pendaftaran sesuai tahap dan hasil rekonsiliasi.
- [x] Periksa penyertaan modal; pembuatan akad harus menunggu rekonsiliasi finance.
- [x] Tampilkan data akad dan pratinjau tanggal otomatis sebelum pembuatan PDF.
- [x] Unduh PDF hasil generate dengan tanda tangan anggota yang proporsional.
- [x] Unggah ulang PDF yang sudah ditandatangani pihak koperasi agar masuk arsip anggota.
- [x] Tinjau pengunduran diri dengan pilihan setuju atau tolak beserta alasan.
- [x] Catat kontrak pembiayaan yang telah disepakati dan penyelesaiannya.

### Finance

- [x] Rekonsiliasi bukti transfer pendaftaran, simpanan wajib dan penyertaan modal.
- [x] Catat keputusan, mutasi/referensi dan permintaan perbaikan bukti transfer.
- [x] Tampilkan daftar bagi hasil harian, rincian per anggota/rekening dan total transfer hari itu.
- [x] Tampilkan tugas pengembalian modal sesuai hari jatuh tempo; konfirmasi anggota lebih awal tidak mempercepat tanggal transfer.
- [x] Catat pengembalian modal dengan nominal, tanggal, referensi dan bukti transfer.
- [x] Catat pengembalian simpanan pokok Rp100.000 setelah pengunduran diri disetujui admin.

### Manajer

- [x] Buat penawaran dengan judul, kode project dan kuota penerimaan.
- [x] Lihat pekerjaan admin dan finance untuk hari ini serta tujuh hari sebelumnya.
- [x] Lihat waktu masuk, mulai, selesai, respons dan pengerjaan; durasi merupakan waktu kalender, bukan absensi/jam kerja aktif.
- [x] Unggah laporan penggunaan dana dan laporan keuangan untuk anggota.
- [x] Lihat nominal/jumlah akad berakhir, lanjut, pengembalian dan belum memilih.
- [x] Kelola akses akun petugas melalui mekanisme yang sudah tersedia.
- [x] Berikan persetujuan final pengunduran diri setelah tahap admin dan finance selesai.

### Pekerjaan lanjutan frontend petugas

- [ ] Hubungkan akun petugas dengan autentikasi mandiri ketika backend autentikasi siap.
- [ ] Lakukan uji penerimaan bersama admin, finance dan manajer memakai skenario kerja nyata.

## 3. Backend

### Struktur, akses dan penyimpanan

- [x] Pindahkan API dan aturan server ke `backend/src/`.
- [x] Pindahkan skema ke `backend/db/`, migrasi ke `backend/migrations/`, template ke `backend/templates/`, dan script build ke `backend/scripts/`.
- [x] Pertahankan izin role, kepemilikan data anggota, akses berkas privat dan validasi unggahan pada server.
- [x] Pertahankan API `/api/workflow`, binding database `DB` dan penyimpanan `BUCKET` pada pratinjau.
- [x] Pertahankan pemeriksaan versi, transaksi dan perlindungan kirim ulang agar pencatatan/penomoran tidak ganda.
- [x] Simpan jejak tindakan serta timestamp berdasarkan waktu server.
- [x] Pertahankan skema dan isi template saat pemisahan folder; pemindahan sumber tidak memindahkan/menghapus data operasional.

### Aturan simpanan dan keanggotaan

- [x] Alokasikan nomor anggota unik otomatis; tahun berdasarkan tanggal daftar WITA, urutan global tidak dipakai ulang.
- [x] Simpan simpanan pokok Rp100.000 sebagai pembayaran sekali per keanggotaan.
- [x] Alokasikan simpanan wajib Rp10.000 per bulan dari saldo di muka, dengan tanggal acuan pendaftaran dan penyesuaian bulan pendek.
- [x] Tentukan status aktif, tunggakan dan pengingat saldo paling banyak Rp30.000.
- [x] Generate surat keanggotaan satu halaman setelah rekonsiliasi pembayaran awal, dengan bulan Romawi pada nomor surat.
- [x] Gunakan nama file `SPA <nomor anggota> a.n <nama anggota>.pdf`.

### Penyertaan modal, akad dan bagi hasil

- [x] Cek status simpanan dan sisa kuota di server, termasuk pengajuan bersamaan dan revisi.
- [x] Wajibkan rekonsiliasi sebelum persetujuan/pembuatan akad baru yang melibatkan transfer dana.
- [x] Buat nomor urut akad otomatis dan kode `SPK-SKI-MRBH-<bulan angka>/<bulan Romawi>/<tahun akad>`.
- [x] Hitung efektif nisbah +10 hari; bila jatuh pada tanggal 31, pindahkan ke tanggal 1 bulan berikutnya; tanggal selesai +365 hari dari efektif.
- [x] Isi template PDF asli tanpa mengubah layout; pasang tanda tangan anggota secara proporsional.
- [x] Simpan PDF awal dan PDF lengkap yang diunggah ulang, dengan akses untuk pemilik dan petugas berwenang.
- [x] Gunakan label/nama dokumen `SPK <kode project> / <nomor urut surat> a.n <nama anggota>`; tanda `/` diganti `-` pada nama berkas unduhan.
- [x] Siapkan bagi hasil sesuai aturan yang disepakati: nominal akad × 5%, berdasarkan tanggal efektif pada 12 bulan sebelumnya, berakhir sesuai periode akad.
- [x] Jumlahkan nilai per anggota/rekening serta total harian; sistem menyiapkan daftar dan mencatat pembayaran, bukan mengeksekusi transfer bank.

### Jatuh tempo dan pengunduran diri

- [x] Simpan pilihan jatuh tempo sekali saja dan sediakan ringkasan untuk manajer.
- [x] Perpanjangan mengikat kuota project baru tanpa tambahan 10 hari; dana lama yang direkonsiliasi menjadi dasar pendanaan, bukan transfer kedua.
- [x] Jadwalkan pengembalian modal pada hari H dan cegah pencatatan pembayaran sebelum waktunya atau secara ganda.
- [x] Terapkan alur pengunduran diri: admin → finance mengembalikan Rp100.000 → manajer menutup keanggotaan.
- [x] Tolak pengunduran diri bila masih ada kontrak/kewajiban yang belum selesai.
- [x] Nonaktifkan nomor lama permanen setelah persetujuan final dan arsipkan riwayatnya.
- [x] Daftar ulang menghasilkan nomor baru meskipun data diri sama; saldo dan dokumen keanggotaan lama tidak dipindahkan otomatis.

### Pekerjaan sebelum penggunaan mandiri di domain sendiri

- [ ] Pilih dan hubungkan layanan autentikasi email/kata sandi, verifikasi email, reset sandi dan sesi pengguna.
- [ ] Sesuaikan pemetaan identitas anggota/petugas serta izin server untuk autentikasi mandiri; backend saat ini memakai identitas ChatGPT.
- [ ] Siapkan hosting backend, database dan penyimpanan privat yang terhubung ke domain sendiri. Unggah source ke GitHub saja tidak memindahkan layanan/data pratinjau.
- [ ] Siapkan konfigurasi lingkungan, pengelolaan secret, backup dan uji pemulihan data.
- [ ] Lengkapi implementasi pembiayaan/angsuran yang masih simulasi sebelum digunakan untuk transaksi nyata.
- [ ] Lakukan pengujian menyeluruh pada hosting tujuan dan persetujuan operasional sebelum digunakan anggota.

## Verifikasi pemisahan kode

- [x] URL `index.html`, `anggota.html`, `petugas.html` dan `avalist.html` tetap dipertahankan.
- [x] Pemeriksaan Svelte lulus tanpa error/warning.
- [x] Perbandingan 40 tampilan portal dan interaksi landing page lulus.
- [x] Bundle masing-masing frontend tidak mengimpor folder frontend lain atau kode backend.
- [x] Regresi formulir, unggahan, role, dokumen, jatuh tempo dan pengunduran diri lulus.
- [x] Pengujian backend lulus setelah pemindahan path migrasi dan template.
- [x] Verifikasi isi aturan backend, skema/migrasi, template dokumen dan CSS tetap sama setelah pemindahan.
- [x] Build frontend dan backend berhasil.

## Cara menggunakan project ini

Jalankan perintah dari folder utama repository:

```sh
npm ci
npm run dev
npm test
npm run build:frontend
```

`npm run dev` membuka frontend lokal. Data portal tetap memerlukan API dan autentikasi yang sesuai. `npm run build:frontend` menyusun ketiga frontend. `npm run build:backend` membungkus hasil frontend yang sudah dibangun bersama API dan template; untuk paket lengkap sediakan `KSPPS_MEMBERSHIP_SIGNATURE_FILE` sesuai `backend/templates/README.md`, lalu gunakan `npm run build`.

Tetap unggah satu repository lengkap yang berisi keempat bagian, `shared/`, `public/`, konfigurasi dan berkas pendukung. Pemisahan folder ini belum membuat empat aplikasi yang dapat dipasang sendiri-sendiri. Perubahan ke repository GitHub/domain milik Anda masih memerlukan pengaturan publikasi di tempat tersebut.


## Avalist internal

- [x] Sediakan portal Avalist terpisah di `/avalist.html`; Manajer mendaftarkan email tanpa memberikan peran Admin/Finance. Identitas email terverifikasi ditautkan ke ID akun saat masuk pertama.
- [x] Manajer menetapkan/mengganti avalist serta persentase; Admin hanya mengirim usulan.
- [x] Simpan avalist bawaan untuk pengajuan baru dan riwayat penetapan per akad berjalan dengan tanggal mulai periode.
- [x] Pergantian orang dapat mempertahankan persentase; perubahan persentase dapat mempertahankan orang.
- [x] Bagian anggota 5%; avalist 1% atau 2%; koperasi mendapat 4% atau 3% dari modal per periode.
- [x] Finance menyiapkan pembagian per akad, melihat total per avalist, dan mencatat transfer beserta bukti bank.
- [x] Perubahan penetapan/rekening membatalkan kesiapan daftar yang terdampak untuk diperiksa ulang.
- [x] Pembayaran selesai tidak dapat ditimpa. Koreksi disahkan Manajer sebagai transaksi penyesuaian terpisah.
- [x] Avalist melihat hanya periode hak dan riwayat miliknya; tidak mendapat dokumen atau rekening anggota.
- [x] Uji otorisasi server, periode, pembagian rupiah, perubahan bersamaan, pembayaran sekali, koreksi, serta formulir dan navigasi.

## Ringkasan revisi terbaru v36

- [x] Status normal memakai hijau/biru; pengingat top up dan peringatan memakai merah.
- [x] Portal avalist hanya menampilkan data pemiliknya dan tidak membuka API operasional petugas.
- [x] Tampilkan total fee kumulatif beserta rincian pembayaran, hak jatuh tempo, dan penyesuaian.
- [x] Pilihan bulan/tahun menampilkan total hak fee berdasarkan bulan jatuh tempo serta fee yang sudah dibayar berdasarkan bulan tanggal transfer.
- [x] Pisahkan pembayaran untuk periode terpilih dari pembayaran yang dilakukan pada bulan tersebut, agar sisa hak tidak salah dihitung.
- [x] Sertakan koreksi positif/negatif yang disahkan, hindari perhitungan ganda, dan pertahankan riwayat pembayaran.
