# Website KSPPS Syirkah Kebaikan Indonesia

Sumber aplikasi sudah disinkronkan dengan **revisi v39** pada 14 Oktober 2026. Kode terbaru berada di **[`source-lengkap/`](source-lengkap/)**. Gunakan folder tersebut sebagai direktori kerja saat melanjutkan pengembangan di Codex.

Pembaruan **23 Oktober 2026** menambahkan mode terang dan gelap pada landing serta seluruh portal, termasuk layar masuk. Tombol di kanan atas menyimpan pilihan pada browser; sebelum dipilih, tampilan mengikuti tema perangkat. Perubahan tersedia pada source dan build pratinjau, dengan deployment aplikasi sebagai langkah terpisah.

Pembaruan **25 Oktober 2026** menghapus banner, badge, strip dan footer berlabel pengembangan dari seluruh laman. Label masuk, bantuan, pendaftaran dan dialog memakai bahasa layanan. Pada hasil statis, formulir tetap tidak mengumpulkan data atau menghubungi API; pesan fungsi yang tidak tersedia menjelaskan batas alamat tersebut. Catatan lokal dan draf yang belum disahkan tetap dibedakan dari data yang sudah diterima koperasi.

Penyempurnaan **26 Oktober 2026**: pergantian tema menyebar dari pusat tombol selama 650 ms dengan gerakan ikon. Peramban tanpa View Transitions memakai perpindahan warna 420 ms; preferensi pengurangan gerak menerapkan tema langsung. Logo portal memakai aset putih transparan pada tema gelap, termasuk layar masuk, tanpa latar kotak putih.

Pada **26 Oktober 2026**, integrasi masuk/keluar ChatGPT dan pembacaan header identitas platform lama dihapus dari source. Backend hanya menerima sesi yang diverifikasi layanan `AUTH` terpercaya; tanpa layanan tersebut akses privat ditolak. Login email/kata sandi serta penyimpanan pada domain GitHub Pages belum diaktifkan.

| Bagian | Lokasi | Status |
| --- | --- | --- |
| Aplikasi terbaru | `source-lengkap/` | Svelte 5 + Vite, Worker, skema/migrasi, template dokumen dan pengujian v39 |
| Website GitHub Pages | `docs/` | Hasil build Svelte dari sumber aplikasi yang sama; tanpa backend aktif |
| Identitas versi | `VERSI.json` | Versi dan commit sumber yang dipakai aplikasi serta Pages |
| Panduan domain | `PANDUAN-DOMAIN.md` | Domain dan alur penerbitan |

Domain yang tercatat di `docs/CNAME`: **syirkahkebaikanindonesia.com**. Pembaruan kode di `source-lengkap/` belum memindahkan backend atau data ke domain tersebut. Folder `docs/` kini dihasilkan dari sumber Svelte terbaru. Mode pratinjau menampilkan data kosong dan menonaktifkan pendaftaran, unggahan, login serta transaksi.

## Melanjutkan proyek di Codex

Konteks proyek, aturan bisnis, riwayat keputusan dan pekerjaan tersisa tersedia dalam **[panduan-codex/](panduan-codex/README.md)**. Baca **[AGENTS.md](AGENTS.md)** sebagai petunjuk kerja repository dan gunakan **[prompt pembuka](panduan-codex/PROMPT-MULAI.md)** untuk memulai sesi baru. Dokumentasi ini melengkapi baseline aplikasi v39; tidak memindahkan data produksi, akses hosting atau riwayat chat secara otomatis.

## Panduan tim IT

Mulai dari **[Peta kode dan panduan pemeliharaan](source-lengkap/docs/PETA-KODE.md)**. Kode aplikasi dipisahkan per fitur, hubungan antarmodul memakai import eksplisit, dan pemeriksaan otomatis mencegah import melingkar serta baris source yang terlalu panjang. Framework tetap Svelte 5 + Vite.

## Revisi yang sudah masuk

- Mode terang/gelap memakai komponen dan pengelola preferensi bersama. Pilihan bertahan saat berpindah laman, disinkronkan antar-tab, dan tidak menghapus isian formulir. Jika penyimpanan browser ditolak, tombol tetap bekerja pada laman yang sedang terbuka.
- Tampilan memakai komponen/snippet Svelte; state dan layanan terpisah untuk setiap portal. Listener, timer dan permintaan API dibersihkan saat portal ditutup.
- API transport, koordinasi state dan tampilan memiliki tanggung jawab terpisah.
- Favicon vektor ringkas, dihasilkan otomatis saat build: logo KSPPS biru muda/biru tua pada mode terang, logo putih pada mode gelap. Berlaku di aplikasi dan pratinjau statis `docs/`.

- Refactor v37: controller kecil, komponen Svelte terpisah, endpoint/aturan server per fitur, dan panduan penelusuran bug.
- Status normal berwarna hijau/biru; pengingat top up dan peringatan memakai merah.
- Penawaran yang terpenuhi tetap terlihat di portal anggota selama 3 × 24 jam. Riwayat penawaran tetap ada di portal Manajer.
- Portal Avalist terpisah di `/avalist.html`, dengan pendaftaran email oleh Manajer tanpa menjadikan avalist sebagai petugas.
- Penetapan dan pergantian avalist untuk pengajuan baru maupun akad berjalan, berdasarkan periode efektif dan persetujuan Manajer.
- Fee avalist 1% atau 2%, dengan sisa alokasi menjadi hak koperasi. Pembayaran selesai tetap tersimpan; koreksi dicatat terpisah.
- Total fee kumulatif, total hak fee bulanan, pembayaran pada bulan terpilih, dan rincian pembayaran untuk periode hak tersebut.
- Alur anggota, Admin, Finance dan Manajer; rekonsiliasi, akad PDF, simpanan, jatuh tempo, pengunduran diri dan laporan.

Rincian implementasi: [`source-lengkap/to-do.md`](source-lengkap/to-do.md) dan [`source-lengkap/docs/WORKFLOWS.md`](source-lengkap/docs/WORKFLOWS.md).

## Menjalankan dan menguji kode terbaru

Gunakan Node.js 22.12 atau lebih baru:

```sh
cd source-lengkap
npm ci
npm test
npm run build:frontend
npm run dev
```

Build backend lengkap (`npm run build`) memerlukan file tanda tangan privat yang dipasang melalui `KSPPS_MEMBERSHIP_SIGNATURE_FILE`; lihat [panduan aset template](source-lengkap/backend/templates/README.md). Tanda tangan dan DOCX yang menyematkannya tidak dipublikasikan ke repository ini.

`npm run dev` menjalankan frontend lokal. API, identitas pengguna, database D1 dan penyimpanan R2 memerlukan lingkungan backend yang sesuai. Build menghasilkan empat HTML pembuka dan bundle Worker di `dist/server/index.js`; hasil build tidak perlu diunggah sebagai source.

Dari root repository juga tersedia `npm run setup`, `npm run check`, `npm run build`, `npm run dev`, dan `npm run test:app`. `npm test` di root hanya memeriksa pratinjau statis. Gunakan `npm run test:all` untuk memeriksa pratinjau dan aplikasi terbaru sekaligus.

Pengujian khusus tema tersedia melalui `npm run test:theme` dari `source-lengkap/` dan ikut dalam suite aplikasi. Tes mencakup preferensi perangkat, penyimpanan, sinkronisasi tab, pembersihan listener, tampilan awal sebelum CSS, serta isian formulir saat tema diganti.

## Penerbitan dan data

Perubahan file `docs/` yang dikirim ke branch sumber GitHub Pages akan diterbitkan melalui konfigurasi Pages yang sudah terpasang. Sumber aplikasi dalam `source-lengkap/` memerlukan alur build dan deployment backend tersendiri agar tampil sebagai aplikasi operasional pada domain sendiri.

Sebelum berpindah hosting, ikuti [`source-lengkap/docs/PINDAH-HOSTING.md`](source-lengkap/docs/PINDAH-HOSTING.md). Backend membutuhkan layanan sesi `AUTH` yang diverifikasi server; login email/kata sandi mandiri belum diaktifkan. GitHub Pages tidak menjalankan Worker, D1 atau R2.

Sinkronisasi ini hanya membawa source, template dan pengujian. Database anggota, berkas unggahan, password, token dan secret deployment tidak disertakan. Konfigurasi `.openai/hosting.json` hanya mempertahankan nama binding `DB` dan `BUCKET`.

## Satu sumber Svelte untuk aplikasi dan Pages

`source-lengkap/` adalah sumber pengembangan. `docs/` kini dihasilkan dari sumber yang sama, termasuk portal avalist.

```sh
npm run setup
npm run build:pages
npm run check:pages
npm run test:preview
```

`build:pages` mempertahankan `docs/CNAME` dan tidak menyalin backend maupun dokumen privat. `check:pages` membandingkan seluruh hasil build serta sidik sumber; workflow GitHub menandai hasil Pages yang tertinggal. Commit hasil `docs/` bersama perubahan sumber agar publikasi Pages yang sudah terpasang memperbarui domain.

Pages adalah pratinjau statis dengan data kosong. Formulir identitas, unggahan, autentikasi, dan transaksi tidak diaktifkan di mode ini. Gunakan hosting aplikasi dengan backend untuk layanan tersimpan. Panduan pencarian bug dan pembagian tanggung jawab ada di `source-lengkap/docs/PETA-KODE.md`.
