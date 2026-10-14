# Menjalankan aplikasi pada hosting sendiri

Sumber aplikasi v39 berasal dari aplikasi pratinjau yang memakai Svelte 5, Vite dan Cloudflare Worker APIs. Sinkronisasi GitHub tidak mengekspor database, unggahan atau konfigurasi rahasia dari hosting asal.

## Build dan resource

Jalankan `npm ci` dan `npm test` dari `source-lengkap/`. Sediakan aset tanda tangan privat sesuai [panduan template](../backend/templates/README.md), lalu jalankan `npm run build`. Untuk frontend saja, gunakan `npm run build:frontend`. Hasil frontend dan Worker ada di `dist/`. `.openai/hosting.json` mempertahankan nama binding logis, tanpa identitas proyek hosting asal.

Backend memerlukan database D1 bernama binding `DB` dan bucket R2 privat bernama binding `BUCKET`. Buat resource tujuan, konfigurasi lingkungan dan jalankan migrasi berurutan dari `backend/migrations/`. Migrasi terakhir pada revisi ini adalah `0014_tense_exodus.sql`. Jangan mengubah migrasi yang sudah diterapkan.

GitHub Pages hanya menayangkan file statis dalam `../docs/`. Memasang bundle Worker di folder tersebut tidak membuat API atau database berjalan. Deployment aplikasi perlu menjalankan frontend dan backend dengan pemetaan rute yang sesuai.

## Identitas dan izin

Versi pratinjau menerima identitas dari dispatch Sites yang terpercaya, termasuk header `oai-authenticated-user-id`, serta memakai `/signin-with-chatgpt` dan `/signout-with-chatgpt`. Pada hosting lain, header yang dikirim klien tidak boleh dianggap sebagai bukti login.

Siapkan autentikasi dan sesi yang diverifikasi server sebelum menjalankan backend pada hosting tujuan. Bersihkan header identitas dari klien, lalu tetapkan identitas hanya dari sesi yang sah. Petakan ID akun anggota, petugas dan avalist dengan hati-hati agar kepemilikan data dan riwayat tetap benar. Email avalist harus berasal dari identitas yang terverifikasi. Formulir email/kata sandi yang sudah terlihat belum merupakan autentikasi mandiri.

Aktivasi Manajer memakai konfigurasi rahasia `KSPPS_MANAGER_SETUP`; nilainya tidak ada dalam repository. Ikuti implementasi `backend/src/access.js` untuk bootstrap tujuan dan simpan secret pada environment hosting. Jangan memasukkan nilainya ke source atau GitHub Pages.

## Data dan pekerjaan pemeliharaan

`backend/src/reset-demo.js` mempertahankan pekerjaan pembersihan demo historis dengan cutoff `2026-09-21T05:53:39.000Z`. Sebelum mengimpor data operasional atau menghubungkan resource lama, tinjau dan nonaktifkan pekerjaan historis tersebut agar data lama tidak terhapus. Sinkronisasi source ini tidak menjalankan pekerjaan itu pada database mana pun.

Pindahkan database dan objek privat melalui prosedur migrasi terpisah, dengan backup serta pemeriksaan hubungan akun, anggota, akad, pembayaran dan avalist. Pengujian di repository menggunakan database sementara; jangan mengarahkannya ke data produksi.

## Batas fitur

Pengajuan pembiayaan/angsuran tertentu masih berupa simulasi. Integrasi transfer bank, email/WhatsApp otomatis dan tanda tangan elektronik tersertifikasi belum diaktifkan. Sistem mencatat bukti transfer yang dilakukan petugas; status pembayaran bukan eksekusi transfer oleh aplikasi.

Setelah hosting dan autentikasi tujuan siap, uji pendaftaran, isolasi data antar akun, verifikasi Admin/Finance, pembuatan akad, pergantian avalist, periode fee, jatuh tempo dan pengunduran diri. Baru hubungkan domain ke deployment aplikasi yang telah diverifikasi.
