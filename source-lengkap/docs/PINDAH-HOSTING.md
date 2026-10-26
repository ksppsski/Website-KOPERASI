# Menjalankan aplikasi pada hosting sendiri

Sumber aplikasi v39 berasal dari aplikasi pratinjau yang memakai Svelte 5, Vite dan Cloudflare Worker APIs. Sinkronisasi GitHub tidak mengekspor database, unggahan atau konfigurasi rahasia dari hosting asal.

## Build dan resource

Jalankan `npm ci` dan `npm test` dari `source-lengkap/`. Sediakan aset tanda tangan privat sesuai [panduan template](../backend/templates/README.md), lalu jalankan `npm run build`. Untuk frontend saja, gunakan `npm run build:frontend`. Hasil frontend dan Worker ada di `dist/`. `.openai/hosting.json` mempertahankan nama binding logis, tanpa identitas proyek hosting asal.

Backend memerlukan database D1 bernama binding `DB` dan bucket R2 privat bernama binding `BUCKET`. Buat resource tujuan, konfigurasi lingkungan dan jalankan migrasi berurutan dari `backend/migrations/`. Migrasi terakhir pada revisi ini adalah `0014_tense_exodus.sql`. Jangan mengubah migrasi yang sudah diterapkan.

GitHub Pages hanya menayangkan file statis dalam `../docs/`. Memasang bundle Worker di folder tersebut tidak membuat API atau database berjalan. Deployment aplikasi perlu menjalankan frontend dan backend dengan pemetaan rute yang sesuai.

## Identitas dan izin

Integrasi masuk/keluar ChatGPT dan pembacaan header identitas platform lama dihapus pada 26 Oktober 2026. Backend tidak menganggap header identitas atau isian email sebagai bukti masuk akun.

`backend/src/authentication.js` memverifikasi sesi melalui binding layanan server `AUTH`. Resolver membuat permintaan `GET https://auth.internal/session` dan meneruskan hanya header `Cookie` serta `Authorization`. Alamat internal ini bukan URL yang dibuka pengguna atau layanan yang sudah disediakan repository. Binding harus menunjuk layanan terpercaya yang memverifikasi kredensial sesi, bukan membaca identitas langsung dari browser.

Kontrak respons layanan: JSON `{ "id": "ID-stabil", "name": "Nama akun", "email": "email-terverifikasi", "emailVerified": true }`. ID harus stabil dan tidak kosong. Email hanya diteruskan ke aturan Avalist bila dinyatakan terverifikasi; email yang belum terverifikasi tidak dapat mengklaim akses Avalist. Respons 401/403 berarti tidak ada sesi sah. Respons gagal atau identitas tidak valid ditolak. Tanpa binding `AUTH`, endpoint privat menolak akses.

Siapkan layanan masuk, keluar, verifikasi email, reset sandi dan pengelolaan sesi pada hosting tujuan. Resolver bukan penerbit sesi dan tidak membuat akun atau kata sandi baru. Petakan ID akun anggota, petugas dan avalist dengan hati-hati agar kepemilikan data dan riwayat tetap benar. Formulir email/kata sandi yang terlihat belum merupakan autentikasi mandiri; mengisinya tidak memberi akses. GitHub Pages tetap tidak menerima pengisian atau penyimpanan.

Aktivasi Manajer memakai konfigurasi rahasia `KSPPS_MANAGER_SETUP`; nilainya tidak ada dalam repository. Ikuti implementasi `backend/src/access.js` untuk bootstrap tujuan dan simpan secret pada environment hosting. Jangan memasukkan nilainya ke source atau GitHub Pages.

## Data dan pekerjaan pemeliharaan

`backend/src/reset-demo.js` mempertahankan pekerjaan pembersihan demo historis dengan cutoff `2026-09-21T05:53:39.000Z`. Sebelum mengimpor data operasional atau menghubungkan resource lama, tinjau dan nonaktifkan pekerjaan historis tersebut agar data lama tidak terhapus. Sinkronisasi source ini tidak menjalankan pekerjaan itu pada database mana pun.

Pindahkan database dan objek privat melalui prosedur migrasi terpisah, dengan backup serta pemeriksaan hubungan akun, anggota, akad, pembayaran dan avalist. Pengujian di repository menggunakan database sementara; jangan mengarahkannya ke data produksi.

## Batas fitur

Pengajuan pembiayaan/angsuran tertentu masih berupa simulasi. Integrasi transfer bank, email/WhatsApp otomatis dan tanda tangan elektronik tersertifikasi belum diaktifkan. Sistem mencatat bukti transfer yang dilakukan petugas; status pembayaran bukan eksekusi transfer oleh aplikasi.

Setelah hosting dan autentikasi tujuan siap, uji pendaftaran, isolasi data antar akun, verifikasi Admin/Finance, pembuatan akad, pergantian avalist, periode fee, jatuh tempo dan pengunduran diri. Baru hubungkan domain ke deployment aplikasi yang telah diverifikasi.
