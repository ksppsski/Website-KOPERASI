# Status proyek dan langkah lanjutan

Snapshot serah terima: **14 Oktober 2026**, aplikasi **v39**. Periksa kode/commit terbaru sebelum memakai dokumen ini pada sesi berikutnya.

## Pembaruan 27 Oktober 2026

Sumber fitur keluhan tersedia pada **Bantuan** anggota dan **Keluhan Anggota** petugas. Keluhan mendapat nomor `KLH-<tahun WITA>-<urutan global minimal enam digit>` dan waktu masuk dari server. Admin atau Manajer menetapkan PIC, divisi dan batas waktu per kasus. Finance hanya melihat serta menindaklanjuti kasus yang ditugaskan kepadanya. Riwayat tanggapan, perubahan penugasan/status dan catatan hasil penyelesaian tersimpan bersama perubahan kasus.

Statusnya **Baru → Dalam penanganan → Menunggu tanggapan anggota / Selesai → Ditutup**. Balasan anggota pada kasus yang menunggu tanggapan atau sudah Selesai mengembalikannya ke Dalam penanganan. PIC/Admin/Manajer juga dapat membuka kembali kasus Selesai melalui tanggapan tindak lanjut sebelum ditutup. Penutupan membutuhkan hasil penyelesaian dan hanya dilakukan Admin/Manajer. Kasus Ditutup tidak dapat diubah atau dibalas; riwayat tetap disimpan. Batas waktu ditetapkan per kasus.

API memakai kepemilikan akun terverifikasi, termasuk bagi akun yang belum disetujui atau keanggotaannya sudah ditutup. Avalist tidak mendapat akses keluhan. Migrasi baru `0015_complaint_tracking.sql` menambah tabel kasus, urutan nomor dan riwayat. Tes backend `tests/complaints.mjs` mencakup otorisasi, penugasan, transisi, hasil wajib, kirim ulang, konkurensi dan rollback riwayat.

Verifikasi pengembangan: seluruh suite aplikasi lulus, termasuk pengujian formulir keluhan, ketahanan draft, kegagalan pembacaan setelah kiriman tersimpan, dan batas Pages tanpa jaringan. Pemeriksaan browser nyata memakai data uji lokal pada lebar 390 px dan 1280 px; formulir, penugasan, hasil penyelesaian dan penutupan terbaca tanpa luapan halaman. Build frontend serta pemeriksaan kesesuaian hasil Pages lulus. Pemeriksaan ini tidak menjalankan transaksi pada database produksi.

Pengguna menunda penyiapan layanan operasional. Kesiapan source ini tidak mengaktifkan backend pada domain: GitHub Pages tetap hanya membaca tampilan, tanpa pengiriman keluhan, penyimpanan data atau API. Aktifkan penyimpanan setelah hosting, migrasi dan sesi server tersedia serta diuji.

## Pembaruan 26 Oktober 2026

Seluruh tautan, instruksi masuk/keluar ChatGPT dan pembacaan header identitasnya telah dihapus dari source. API privat memakai resolver sesi dari binding `AUTH` terpercaya. Tanpa provider atau sesi sah, server menolak akses; nama/email/role dari browser tidak memberikan izin. Form login tidak lagi menandai pengguna masuk hanya karena isian diisi. Domain Pages tetap tidak menyimpan data atau menjalankan login mandiri.

Pergantian tema diperhalus dengan lingkaran yang menyebar dari tombol dan animasi ikon. View Transitions dipakai bila tersedia; fallback warna dan preferensi pengurangan gerak tetap didukung. Klik ditahan selama transisi singkat tanpa melepas fokus, mengganti rute atau membuat ulang formulir. Logo portal kini berganti ke aset putih transparan dalam mode gelap, tanpa kotak putih.

Panel kiri Daftar Anggota tetap tersusun setinggi layar dan mengikuti pengguliran formulir pada desktop. Panel tidak lagi meregang setinggi Data diri yang panjang. Pada layar dengan tinggi paling banyak 600 px, seluruh isi mengikuti scroll dokumen agar tidak terpotong. Tampilan ponsel tetap memakai satu kolom.

## Pembaruan 25 Oktober 2026

Penanda pengembangan pada UI dihapus: banner statis, badge pratinjau, strip konsep, footer pengujian, serta istilah demo/simulasi pada bantuan, layar masuk dan dialog. Tombol peran pada hasil statis bernama `Buka portal Manajer/Admin/Finance`. Tidak ada perubahan izin akun atau aturan finansial.

Pesan formulir nonaktif menyebut fungsi yang tidak tersedia pada alamat tersebut; guard tetap menolak penyimpanan, unggahan dan API pada hasil statis. Pengajuan yang hanya dicatat pada laman berstatus `Belum dikirim`. Ringkasan draf lokal tetap menyebut `Draf belum disahkan` dan tidak dinyatakan sebagai akad. Metadata PDF baru memakai deskripsi akad netral. Publikasi ke hosting aplikasi tetap terpisah dari perubahan source.

## Pembaruan 23 Oktober 2026

Mode terang dan gelap tersedia pada landing, portal Anggota, Petugas dan Avalist, termasuk layar masuk. Tombol di kanan atas menyimpan pilihan browser dan menyinkronkannya antar-tab. Sebelum pengguna memilih, tema mengikuti perangkat. Isian formulir dan halaman yang sedang dibuka tetap dipertahankan.

`npm run test:app` dari root telah lulus, termasuk `test:theme` untuk preferensi perangkat, penyimpanan ditolak/penuh, sinkronisasi tab, pembersihan listener, bootstrap tema awal dan isian formulir. Source dan hasil build Pages diperbarui; catatan ini tidak menyatakan deployment Site atau perubahan backend. Nomor v39 di bawah tetap merujuk baseline serah terima.

## Status implementasi

| Area | Kondisi saat serah terima |
| --- | --- |
| Landing, portal anggota/petugas/avalist | Tersedia dalam Svelte; avalist mempunyai pintu masuk terpisah |
| Pendaftaran, nomor anggota, KTP/tanda tangan | Alur dan backend tersedia pada lingkungan aplikasi yang sesuai |
| Simpanan dan rekonsiliasi | Alur dan pengujian tersedia |
| Penawaran, kuota dan batas 72 jam | Diimplementasikan di server/UI; histori Manajer dipertahankan |
| Akad PDF dan arsip final | Tersedia; layout asli dipertahankan; aset tanda tangan surat keanggotaan tetap privat |
| Daftar bagi hasil | Perhitungan dan daftar persiapan tersedia; tidak mengeksekusi transfer bank |
| Avalist, pergantian, koreksi, fee bulanan | Tersedia dan diuji; pembayaran selesai tidak ditimpa |
| Jatuh tempo/perpanjangan/pengembalian | Alur dan pencatatan tersedia |
| Pengunduran diri | Alur Admin → Finance → Manajer dan pendaftaran ulang tersedia |
| Bantuan dan keluhan | Sumber UI/API dan migrasi tersedia; nomor, PIC, tenggat, riwayat dan hasil penutupan; Pages tetap tidak mengirim data |
| Pembiayaan | Register kontrak petugas tersedia; pengajuan/angsuran tertentu masih simulasi |
| Login email/kata sandi mandiri | **Belum terhubung**; tampilan formulir bukan autentikasi nyata |
| Identitas akun | Integrasi platform lama dicabut; membutuhkan sesi server yang sah dari binding `AUTH` |
| Hosting aplikasi di domain sendiri | **Belum dinyatakan operasional**; sinkronisasi source tidak memindahkan backend/data |
| GitHub Pages | Build pratinjau v39 dari sumber Svelte yang sama; data kosong, formulir nonaktif, tanpa API |
| Bank, email/WhatsApp otomatis, Privy/e-meterai | Belum terintegrasi |
| Uji penerimaan operasional | Masih diperlukan dengan anggota, Admin, Finance, Manajer dan Avalist |

## Tujuh masalah pemeliharaan yang sudah diperbaiki pada v39

1. Tampilan yang mencampur Svelte dengan string HTML diganti komponen/snippet native. Pemeriksaan source menolak `{@html}` dan penulisan `innerHTML` untuk UI.
2. Registrasi layanan global diganti instance per portal dengan dependensi eksplisit.
3. HTTP transport, koordinasi state dan rendering dipisahkan.
4. Listener, timer, request dan state mempunyai lifecycle serta disposal; formulir tetap bertahan saat refresh.
5. Formatter tanggal/rupiah, ikon, badge dan utilitas tampilan digunakan bersama.
6. Favicon berasal dari simbol SVG vektor; tiap varian kurang dari 1 KB, dihasilkan saat build, dan mengikuti mode terang/gelap perangkat.
7. Salinan portal statis lama dihapus. GitHub Pages dibangun dari sumber Svelte terbaru, termasuk avalist, dengan pemeriksaan konsistensi hasil build.

Ini tidak mengaktifkan login mandiri, tidak memigrasikan data, dan tidak mengganti aturan finansial atau skema database.

## Bukti validasi baseline

- `npm test` dari sumber aplikasi lulus: pemeriksaan Svelte tanpa error/warning, arsitektur, 40 pemeriksaan struktur halaman dan interaksi landing, formulir/unggahan, nomor/akad, rekonsiliasi, simpanan, akses, avalist, jatuh tempo dan pengunduran diri.
- Tes lifecycle memeriksa isolasi state, pembatalan request, pelepasan listener/timer, unmount dan penolakan perubahan state setelah portal selesai.
- Tes mode statis memeriksa halaman anggota/petugas/avalist, formulir nonaktif, penolakan operasi simpan, dan **nol permintaan API**.
- Build frontend/backend Site dan build Pages berhasil. Hasil `docs/` sama dengan build sumber yang diekspor.
- [Publikasi Site v39](https://kspps-syirkah-kebaikan-preview.makongsifinance.chatgpt.site) dilaporkan berhasil oleh layanan deployment.
- [Verify Pages source v39](https://github.com/ksppsski/Website-KOPERASI/actions/runs/38517780213) berhasil.
- [Pages build and deployment v39](https://github.com/ksppsski/Website-KOPERASI/actions/runs/38517778960) berhasil.
- Pemeriksaan visual langsung menggunakan browser nyata **belum dilakukan** pada rilis ini. Tes DOM bukan bukti seluruh layout desktop/ponsel sudah diperiksa secara visual. Respons DNS/TLS dan tampilan domain pribadi juga belum diverifikasi langsung pada serah terima.

## Pekerjaan menuju penggunaan mandiri

Urutan berikut adalah peta kebutuhan teknis, bukan klaim pekerjaan sudah dikerjakan atau keputusan penyedia layanan telah dipilih.

| Urutan | Pekerjaan | Bukti selesai yang dibutuhkan |
| --- | --- | --- |
| 1 | Tentukan target hosting aplikasi dan penyedia autentikasi | Arsitektur yang cocok untuk Worker/API, database dan berkas privat, dengan alur pengguna yang jelas |
| 2 | Implementasikan login mandiri, verifikasi email, reset sandi dan sesi | Pengujian login/logout/reset/expiry, isolasi akun dan role; email avalist berasal dari identitas terverifikasi |
| 3 | Siapkan resource backend dan pemetaan identitas | API terhubung, migrasi berurutan, ID anggota/petugas/avalist dan kepemilikan historis tetap benar |
| 4 | Siapkan aset privat, konfigurasi, backup dan pemulihan | Build lengkap, akses berkas terbatas, backup dapat dipulihkan; tidak ada secret di repository |
| 5 | Rencanakan pemindahan database/objek bila dibutuhkan | Audit jumlah/relasi, saldo, akad dan ledger; reset demo historis ditangani sebelum impor |
| 6 | Lengkapi pembiayaan bila akan dipakai operasional | Persyaratan pengajuan/angsuran disepakati dan alurnya tidak lagi simulasi |
| 7 | Lakukan browser QA dan uji penerimaan | Alur anggota/Admin/Finance/Manajer/Avalist, desktop/ponsel, cetak PDF dan pembatasan akun lolos |
| 8 | Hubungkan domain ke deployment yang sudah layak | Target DNS/HTTPS diverifikasi dan alur pada domain benar-benar diuji |

Pengguna pernah menunda pembahasan DNS. Jangan mengubah nameserver/record DNS sebagai efek samping refactor atau dokumentasi. DNS menentukan tujuan alamat; DNS sendiri tidak menjalankan backend. Penyedia DNS dan penyedia hosting aplikasi dapat berbeda.

## Titik rawan saat pindah hosting

- Backend tidak menerima header identitas platform lama. Hubungkan `AUTH` ke layanan sesi terpercaya; ID stabil dan email terverifikasi harus berasal dari hasil verifikasi server. Tanpa provider, akses privat ditolak.
- Pendaftaran avalist hanya memberikan hak yang belum diklaim; mengganti email bukan cara memindahkan histori. Pertahankan ID pengguna stabil saat migrasi auth.
- `.openai/hosting.json` dalam ekspor GitHub hanya mempertahankan nama binding `DB`/`BUCKET`, tanpa identitas proyek Site. Jangan menebak ID proyek dari URL.
- Bootstrap Manajer memakai secret `KSPPS_MANAGER_SETUP`. Nilainya tidak ikut repository. Jangan mengendurkan pemeriksaan role agar akun dapat masuk.
- Build backend membutuhkan `KSPPS_MEMBERSHIP_SIGNATURE_FILE`. Tanpa berkas sah, build harus berhenti dengan pesan jelas; frontend/tes tetap dapat berjalan.
- `backend/src/reset-demo.js` memiliki cutoff historis tetap `2026-09-21T05:53:39.000Z`. Tinjau dan nonaktifkan pekerjaan reset historis melalui perubahan terarah sebelum mengimpor data operasional lama. Jangan menjalankan tes pada database produksi.
- Migrasi baseline berakhir pada `0014_tense_exodus.sql`; pembaruan 27 Oktober 2026 menambah `0015_complaint_tracking.sql`. Terapkan berurutan dan jangan mengedit migrasi yang sudah diterapkan.

## Alur publikasi setelah pengembangan

Untuk perubahan aplikasi yang memengaruhi Pages: ubah `source-lengkap/`, jalankan pengujian terkait, jalankan `npm run build:pages`, periksa `npm run check:pages`, dan ikutkan hasil `docs/` yang berubah dalam commit. Workflow yang sudah ada memverifikasi kesesuaian source dan build; GitHub Pages menerbitkan folder `docs/` sesuai konfigurasi saat ini.

Workflow verifikasi **tidak otomatis meng-commit hasil build** yang tertinggal. Jika source diubah tanpa memperbarui `docs/`, pemeriksaan akan gagal. Tidak ada sinkronisasi dua arah otomatis yang diasumsikan antara repository Site dan GitHub. Publikasi backend aplikasi adalah alur terpisah; gunakan layanan/konfigurasi yang benar dan bukti deployment.

Perubahan dokumentasi serah terima saja tidak memerlukan rilis baru aplikasi atau perubahan domain. Nomor v39 tetap menunjuk baseline aplikasi sampai ada perubahan aplikasi berikutnya.
