# Website KSPPS — Svelte

**Sumber revisi v38**, disalin pada 14 Oktober 2026 dari commit `7a0afab2d89f09e6d7fd27051f085b1f746b4187`. Folder ini adalah sumber aplikasi terbaru untuk dilanjutkan di Codex. Panduan pindah hosting ada di [docs/PINDAH-HOSTING.md](docs/PINDAH-HOSTING.md).

Website KSPPS Syirkah Kebaikan Indonesia menggunakan Svelte 5 + Vite untuk frontend dan Worker untuk backend. **Daftar pekerjaan dan status fitur ada di [to-do.md](to-do.md).**

## Panduan tim IT

Buka **[Peta kode dan panduan pemeliharaan](docs/PETA-KODE.md)** untuk mencari file berdasarkan fitur atau gejala bug. Source tetap memakai Svelte 5; controller telah dipisahkan menjadi pembacaan data, formulir, tampilan, dan handler. Hubungan antarfitur memakai import eksplisit, dengan pemeriksaan otomatis untuk mencegah import melingkar.


## Bagian utama

| Bagian           | Folder              | Isi                                                             |
| ---------------- | ------------------- | --------------------------------------------------------------- |
| Frontend user    | `frontend-user/`    | Landing page, pendaftaran dan seluruh halaman anggota           |
| Frontend petugas | `frontend-petugas/` | Halaman admin, finance dan manajer                              |
| Frontend avalist | `frontend-avalist/` | Halaman masuk dan portal pribadi avalist                        |
| Backend          | `backend/`          | API, izin akses, aturan keuangan, database, PDF dan penyimpanan |

`shared/` berisi komponen, style dan controller browser yang dipakai lintas frontend. `public/` menyimpan logo dan aset bersama. Pengujian integrasi berada di `tests/`. Konfigurasi build serta empat HTML pembuka tetap di root agar URL lama tetap bekerja.

Masing-masing frontend memiliki `src/Portal.svelte`, `src/entries/`, komponen dan fitur miliknya sendiri. Setiap frontend tidak mengimpor folder frontend yang lain atau kode server. Portal Avalist menggunakan API pribadi baca-saja tanpa controller operasional petugas.

Portal Avalist tersedia melalui `/avalist.html`. Pendaftaran email tetap dilakukan oleh Manajer di Pengelolaan Avalist; login dan logout kembali ke portal khusus ini.

## Mulai membaca kode

| Yang ingin diubah                    | Lokasi                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------- |
| Landing page                         | `frontend-user/src/Landing.svelte`                                                           |
| Animasi kartu                        | `frontend-user/src/components/public/Hero.svelte` dan `frontend-user/src/styles/landing.css` |
| Pendaftaran / portal anggota         | `frontend-user/src/components/member/`                                                       |
| Interaksi anggota                    | `frontend-user/src/features/member/controller.js`                                            |
| Halaman admin                        | `frontend-petugas/src/components/staff/`                                                     |
| Rekonsiliasi / bagi hasil            | `frontend-petugas/src/components/finance/`                                                   |
| KPI manajer                          | `frontend-petugas/src/components/activity/ManagerActivity.svelte`                            |
| Penawaran project                    | `frontend-petugas/src/components/workflow/CapitalOffers.svelte`                              |
| Controller petugas                   | `frontend-petugas/src/features/`                                                             |
| Laporan / pengunduran diri bersama   | `shared/components/` dan `shared/features/`                                                  |
| Komponen dan warna kedua portal      | `shared/components/` dan `shared/styles/`                                                    |
| Aturan di server                     | `backend/src/`                                                                               |
| Skema dan migrasi database           | `backend/db/` dan `backend/migrations/`                                                      |
| Template dokumen asli                | `backend/templates/`                                                                         |
| Build backend dan persiapan template | `backend/scripts/`                                                                           |

Jangan mengedit `dist/`: folder itu dihasilkan otomatis dan kode di dalamnya dipadatkan agar lebih cepat diunduh.

## Menjalankan project

Gunakan Node.js 22.12 atau lebih baru. Dari folder utama project:

```sh
npm ci
npm run dev
```

Perintah ini menjalankan **tampilan lokal**. Data portal memerlukan API, autentikasi, database D1 dan penyimpanan R2 di lingkungan hosting. Menjalankan frontend lokal tidak menyalin data situs aktif.

```sh
npm test
npm run build:frontend
```

Untuk `npm run build` lengkap, sediakan gambar tanda tangan privat melalui `KSPPS_MEMBERSHIP_SIGNATURE_FILE` sesuai [panduan template](backend/templates/README.md). Berkas tanda tangan dan sumber Word yang menyematkannya dikecualikan dari GitHub publik; pengujian memakai gambar sintetis. Build backend menolak melanjutkan bila aset privat belum tersedia.

`npm test` memeriksa Svelte, batas arsitektur, tampilan, interaksi dan aturan backend. `npm run build` menghasilkan empat HTML, aset frontend serta `dist/server/index.js`. URL `index.html`, `anggota.html`, `petugas.html`, `avalist.html`, rute `#...` dan API `/api/workflow` tetap digunakan.

Perintah terpisah tersedia untuk proses build: `npm run build:frontend`, lalu `npm run build:backend`. Backend packager memerlukan hasil frontend di `dist/`. Ketiga frontend dan backend masih dipublikasikan sebagai satu Site dengan origin yang sama.

`npm run db:generate` membaca `backend/drizzle.config.ts`. Jangan mengubah migrasi yang sudah diterapkan. `npm run format` merapikan sumber.

## Status penggunaan

Pemisahan sumber mempertahankan tampilan, aturan server, template PDF dan data pratinjau. Ini belum mengaktifkan login email/kata sandi mandiri atau memindahkan database ke domain sendiri. API pratinjau masih memakai identitas ChatGPT; sebagian pengajuan pembiayaan/angsuran masih simulasi.

Sebagian tabel/dialog tetap memakai HTML helper yang meng-escape nilai pengguna. Jangan memasukkan data pengguna mentah ke `{@html}`. Perubahan folder/frontend tidak menggantikan otorisasi server.

Tes frontend memakai DOM simulasi (JSDOM), bukan pemeriksaan visual browser nyata. Rincian aturan ada di [docs/WORKFLOWS.md](docs/WORKFLOWS.md), sedangkan riwayat migrasi di [docs/MIGRASI-SVELTE.md](docs/MIGRASI-SVELTE.md).
