# KSPPS — kode lengkap untuk tim IT

Ekspor source versi v18, commit `27ef77091976129cfa29364b7720e78083f2cb6e`, 22 September 2026. HTML, CSS, JavaScript aplikasi, Worker, skema/migrasi, font/template akad, lockfile, dan pengujian disalin dari proyek yang telah dikerjakan. Tidak ada data operasional, secrets, riwayat Git, node_modules, atau hasil build dalam paket.

Versi statis yang siap dipublikasikan ada di `../docs/`. Folder `dist/` di sini adalah frontend asli yang mengharapkan backend; jangan menerbitkannya sebagai pengganti versi statis bila API belum tersedia.

## Arsitektur dan build

- `dist/index.html`: landing page asli dengan tampilan di dalam iframe srcdoc; navigasi ke anggota melalui postMessage. Logo landing tersemat di HTML.
- `dist/anggota.html`, `dist/petugas.html`, `dist/assets/`: portal dan aset.
- `worker/index.js`: router, validasi, kepemilikan data, transisi, dan penyimpanan.
- `worker/access.js`: hak akses akun, aktivasi Manajer, persetujuan Admin/Finance.
- `worker/reports.js`: unggahan PDF Manajer dan akses laporan untuk anggota yang disetujui.
- `worker/finance.js`, `savings.js`, `activity.js`, `offers.js`, `manager.js`: rekonsiliasi, simpanan, tugas, kuota penawaran, serta pelaporan Manajer.
- `worker/contract-rules.js`, `contract-pdf.js`: nomor/tanggal akad dan pengisian PDF.
- `db/schema.ts`, `drizzle/`: struktur serta migrasi database.
- `templates/`: dokumen akad asli, PDF layout tetap, pemetaan kolom, dan font berlisensi.
- `tests/`: pengujian alur, isolasi akses, kapasitas, tanggal, dan perhitungan.

Dari folder `source-lengkap` jalankan:

```sh
npm ci
npm run build
```

Build menghasilkan `dist/server/index.js` berupa bundle Worker dengan aset, font, dan template tertanam. `.openai/hosting.json` dalam paket hanya mempertahankan binding logis `DB` dan `BUCKET`; identitas project deployment lama sengaja tidak dibawa. Build bukan perintah deployment dan tidak membuat database.

Runtime aplikasi menggunakan **Cloudflare Worker APIs**, **D1** untuk metadata dan **R2** untuk berkas privat. Bindings yang dibaca kode bernama `DB` dan `BUCKET`. Tim IT perlu membuat resource baru, menerapkan migrasi berurutan, mengonfigurasi bindings, dan memasang Worker pada domain/API yang dipilih. File GitHub Pages tidak menjalankan Worker/D1/R2. Konfigurasi hosting baru dibuat setelah akun/provider tersedia; paket ini bukan janji bahwa deploy backend cukup sekali klik.

## Batas autentikasi yang wajib dipahami

Versi asli bergantung pada identitas **terpercaya dari dispatch Sites**, terutama header `oai-authenticated-user-id`, dan endpoint platform `/signin-with-chatgpt` serta `/signout-with-chatgpt`. Header bukan kredensial yang boleh diterima langsung dari browser di hosting baru.

Sebelum menjalankan backend di luar lingkungan asal, ganti integrasi tersebut dengan login/session koperasi atau middleware identitas yang terverifikasi. Abaikan/bersihkan header identitas dari klien dan tetapkan identitas hanya setelah validasi di server. Tombol email/password di frontend anggota lama masih merupakan tampilan simulasi, bukan autentikasi password operasional.

Manajer utama diaktifkan memakai konfigurasi rahasia `KSPPS_MANAGER_SETUP`. **Tidak ada nilai token atau konfigurasi aktivasi lama dalam paket.** Buat proses bootstrap baru sesuai implementasi `worker/access.js` dan simpan secret di environment hosting. Admin serta Finance meminta akses, kemudian Manajer memberi role. Manajer dapat membuka ketiga ruang kerja; Admin/Finance dibatasi di API pada role masing-masing. Pilihan tampilan tidak memberikan hak akses baru.

## Alur yang tersedia dalam source

- Pendaftaran dengan data identitas, rekening, foto KTP wajib, tanda tangan, dan bukti setoran.
- Nomor anggota `SKI-<tahun daftar>-<nomor urut>`, berurutan otomatis.
- Simpanan pokok sekali Rp100.000; wajib Rp10.000/bulan atau Rp120.000/tahun. Alokasi bulanan dan pengingat saldo rendah dihitung sistem; status tidak aktif membatasi layanan.
- Pengajuan perbaikan dari anggota atas catatan Admin/Finance.
- Penawaran Manajer dengan kode project, kuota, dan penutupan otomatis saat penuh.
- Rekonsiliasi Finance sebelum Admin menyetujui pendaftaran/penyertaan modal atau membuat akad.
- Nomor akad otomatis `<nomor urut>/SPK-SKI-MRBH-<bulan angka>/<bulan Romawi>/<tahun>`; tanggal efektif +10 hari, jika jatuh tanggal 31 digeser ke tanggal 1; tanggal selesai +365 hari dari tanggal efektif yang telah disesuaikan.
- PDF menggunakan layout template tetap dan tanda tangan anggota yang diperkecil proporsional. Petugas mengunduh, menandatangani bagian koperasi di luar portal, lalu mengunggah PDF lengkap ke arsip anggota.
- Jadwal bagi hasil 5% per akad dan total per anggota/tanggal. Menyiapkan daftar transfer; tidak menjalankan transfer bank.
- Pengunduran diri dan tinjauan kewajiban; persetujuan belum otomatis menutup akun atau mentransfer dana.
- Laporan penggunaan dana dan laporan keuangan: unggahan Manajer, akses anggota yang disetujui.
- Catatan pekerjaan Admin/Finance untuk Manajer, hari ini sampai tujuh hari sebelumnya, zona waktu Asia/Makassar. Durasi merupakan selisih timestamp, bukan pemantauan jam kerja aktif.

Sebagian layar pembiayaan masih berupa simulasi antarmuka. Integrasi Privy, pembayaran bank, email, pembukuan operasional lengkap, dan lifecycle akun produksi belum tersedia. Tim IT perlu meninjau dan menyelesaikan batasan ini sebelum penggunaan nyata.

## Catatan data dan migrasi

Database dan objek unggahan website asal **tidak diekspor**. `worker/reset-demo.js` memuat pekerjaan pemeliharaan historis sekali jalan dengan cutoff `2026-09-21T05:53:39.000Z`; tinjau dan keluarkan mekanisme tersebut sebelum migrasi data operasional. Jangan mengarahkannya ke database/berkas lama tanpa pemeriksaan. Jangan mengubah migrasi yang sudah diterapkan; buat migrasi lanjutan.

Template akad disertakan untuk tim IT, bukan untuk dipublikasikan bersama folder `docs`. Periksa detail tetap dalam template sebelum produksi. Tidak ada verifikasi kriptografi atas tanda tangan dokumen final; petugas mengonfirmasi kelengkapannya.

## Pengujian yang tersedia

Gunakan script pada `package.json`, antara lain `npm run test:portal`, `npm run test:workflow`, `npm run test:finance`, `npm run test:activity`, `npm run test:savings`, `npm run test:manager`, serta `npm run test:access`. Sebagian pengujian memakai `node:sqlite`, jadi gunakan versi Node.js yang mendukungnya. Uji pada database sementara, bukan data produksi.

## Perbedaan versi statis

`../docs` menambahkan `static-mode.js` dan `static-mode.css`, adapter API kosong, pembatasan input/submit, navigasi langkah pendaftaran tanpa mengisi data, serta tombol pratinjau peran. Tidak ada data contoh anggota yang dimasukkan. Adapter tidak meminta backend, tidak menyimpan localStorage, dan menolak mutasi. Ini sengaja bukan autentikasi, bukan server, dan bukan pengganti backend di folder ini.

Font antarmuka memakai Google Fonts dan ikon landing memakai CDN sesuai source asli; browser memerlukan akses internet untuk memuatnya. Logo dan aset proyek sudah disertakan. Untuk deployment tanpa dependensi CDN, tim IT dapat melakukan vendoring aset dengan mempertahankan lisensinya.
