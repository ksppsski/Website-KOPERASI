# Website KSPPS Syirkah Kebaikan Indonesia

Sumber aplikasi sudah disinkronkan dengan **revisi v37** pada 14 Oktober 2026. Kode terbaru berada di **[`source-lengkap/`](source-lengkap/)**. Gunakan folder tersebut sebagai direktori kerja saat melanjutkan pengembangan di Codex.

| Bagian | Lokasi | Status |
| --- | --- | --- |
| Aplikasi terbaru | `source-lengkap/` | Svelte 5 + Vite, Worker, skema/migrasi, template dokumen dan pengujian v37 |
| Website GitHub Pages | `docs/` | Pratinjau statis v18, tanpa login, database atau transaksi aktif |
| Identitas versi | `VERSI.json` | Versi sumber aplikasi dan versi pratinjau dicatat terpisah |
| Panduan domain | `PANDUAN-DOMAIN.md` | Domain dan alur penerbitan |

Domain yang tercatat di `docs/CNAME`: **syirkahkebaikanindonesia.com**. Pembaruan kode di `source-lengkap/` belum memindahkan backend atau data ke domain tersebut. Folder `docs/` tetap menjadi sumber pratinjau statis yang sudah ada, sehingga portal tidak berpura-pura menerima pendaftaran atau transaksi tanpa backend.

## Panduan tim IT

Mulai dari **[Peta kode dan panduan pemeliharaan](source-lengkap/docs/PETA-KODE.md)**. Kode aplikasi dipisahkan per fitur, hubungan antarmodul memakai import eksplisit, dan pemeriksaan otomatis mencegah import melingkar serta baris source yang terlalu panjang. Framework tetap Svelte 5 + Vite.

## Revisi yang sudah masuk

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

## Penerbitan dan data

Perubahan file `docs/` yang dikirim ke branch sumber GitHub Pages akan diterbitkan melalui konfigurasi Pages yang sudah terpasang. Sumber aplikasi dalam `source-lengkap/` memerlukan alur build dan deployment backend tersendiri agar tampil sebagai aplikasi operasional pada domain sendiri.

Sebelum berpindah hosting, ikuti [`source-lengkap/docs/PINDAH-HOSTING.md`](source-lengkap/docs/PINDAH-HOSTING.md). Kode masih memakai identitas terpercaya dari lingkungan Sites; login email/kata sandi mandiri belum diaktifkan. GitHub Pages tidak menjalankan Worker, D1 atau R2.

Sinkronisasi ini hanya membawa source, template dan pengujian. Database anggota, berkas unggahan, password, token dan secret deployment tidak disertakan. Konfigurasi `.openai/hosting.json` hanya mempertahankan nama binding `DB` dan `BUCKET`.
