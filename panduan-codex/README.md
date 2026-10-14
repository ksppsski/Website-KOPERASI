# Serah terima proyek ke Codex

Diperbarui: **14 Oktober 2026, WITA**. Baseline aplikasi: **v39**.

Dokumen ini membawa konteks kerja website KSPPS Syirkah Kebaikan Indonesia ke repository agar pengembangan bisa dilanjutkan tanpa mengandalkan ingatan sesi ChatGPT. Ini adalah rangkuman keputusan dan implementasi yang tersedia, bukan salinan seluruh percakapan, database, atau pemindahan akun/layanan.

## Tujuan produk

Website menyediakan landing page koperasi serta portal anggota, Admin, Finance, Manajer, dan Avalist. Fokusnya adalah pendaftaran anggota, simpanan, penyertaan modal, rekonsiliasi, dokumen akad, daftar pembayaran, pengunduran diri, jatuh tempo, dan fee avalist. Aplikasi menyiapkan data dan mencatat pekerjaan; transfer bank dilakukan di luar aplikasi.

Pengguna menghendaki website yang mudah dipakai dan mudah dirawat tim IT. Bahasa komunikasi adalah Indonesia. Istilah pada layanan anggota adalah **anggota koperasi** dan **penyertaan modal**, mengikuti teks fitur saat ini. Kode wajib tetap memakai Svelte dan disusun per fitur dengan baris yang terbaca.

## Alamat dan baseline

| Bagian | Referensi | Makna |
| --- | --- | --- |
| Repository | https://github.com/ksppsski/Website-KOPERASI | Tempat kerja Codex dan tim IT |
| Branch saat serah terima | `main` | Verifikasi HEAD lagi saat mulai sesi baru |
| Baseline kode aplikasi di GitHub | `b0a9a3a32c0c0626fc109bd2e8ebc51da5fa0471` | Commit v39 sebelum penambahan dokumen serah terima |
| Commit sumber Site v39 | `409106c3d9cfd671d005f605421cc494ab431126` | Repository Site berbeda dari repository GitHub |
| Website Site | https://kspps-syirkah-kebaikan-preview.makongsifinance.chatgpt.site | Aplikasi dengan lingkungan backend Sites dan autentikasi yang didukungnya |
| Domain milik pengguna | https://syirkahkebaikanindonesia.com | Tercatat di `docs/CNAME`; jalur publikasi yang diverifikasi adalah GitHub Pages |
| Identitas rilis | [VERSI.json](../VERSI.json) | Versi source/build, batas ekspor dan aset yang dikecualikan |

Domain dibeli melalui Hostinger. Pembahasan penyelesaian DNS/Cloudflare pernah ditunda pengguna. Jangan menganggap pembelian domain, koneksi repository, atau keberhasilan Pages berarti backend dan login mandiri sudah aktif pada domain tersebut. Konfigurasi DNS aktif dan tampilan domain perlu diperiksa kembali bila pekerjaan berikutnya menyentuhnya.

## Urutan baca

| Dokumen | Isi |
| --- | --- |
| [AGENTS.md](../AGENTS.md) | Aturan kerja untuk Codex dan batas arsitektur |
| [ATURAN-BISNIS.md](ATURAN-BISNIS.md) | Hak akses, alur anggota, akad, fee dan pengecualian |
| [STATUS-DAN-LANJUTAN.md](STATUS-DAN-LANJUTAN.md) | Apa yang selesai, apa yang belum operasional, dan langkah berikutnya |
| [KEPUTUSAN-DAN-REFERENSI.md](KEPUTUSAN-DAN-REFERENSI.md) | Keputusan yang menggantikan ide lama, preferensi UI, dan bahan rujukan |
| [PROMPT-MULAI.md](PROMPT-MULAI.md) | Teks pembuka untuk sesi Codex |
| [PETA-KODE.md](../source-lengkap/docs/PETA-KODE.md) | Pemetaan fitur ke komponen, controller, dan backend |
| [WORKFLOWS.md](../source-lengkap/docs/WORKFLOWS.md) | Detail implementasi dan perilaku edge case |
| [PINDAH-HOSTING.md](../source-lengkap/docs/PINDAH-HOSTING.md) | Autentikasi, database, aset privat, dan pemindahan layanan |
| [to-do.md](../source-lengkap/to-do.md) | Daftar fitur dan pekerjaan teknis |

## Memulai sesi pengembangan

1. Buka repository ini dan baca `AGENTS.md` serta dokumen sesuai fitur yang akan dikerjakan.
2. Periksa `git status` dan versi terbaru. Commit di atas adalah titik serah terima, bukan alasan menurunkan versi atau menimpa perubahan baru.
3. Pasang dependensi lewat `npm run setup` dari root. Sumber aplikasi berada di `source-lengkap/`.
4. Ikuti permintaan berikutnya dengan tes yang relevan. Jangan menganggap daftar prioritas sebagai izin mengubah aturan keuangan, akun, atau hosting tanpa konteks tugas.
5. Catat keputusan baru dan hasil pemeriksaan agar konteks tetap terawat.

## Batas pengetahuan yang dipindahkan

Kode, kebutuhan produk, keputusan desain/arsitektur, aturan bisnis, kendala, dan hasil validasi tersedia di repository. Riwayat chat, lampiran Library, kredensial, akses hosting, database produksi, dan objek unggahan tidak ikut pindah otomatis. Referensi yang belum ada dijelaskan dalam [KEPUTUSAN-DAN-REFERENSI.md](KEPUTUSAN-DAN-REFERENSI.md).

Sumber untuk serah terima adalah percakapan proyek yang tersedia, dokumen source, pembacaan implementasi, serta hasil tes/publikasi v39. Jika suatu kebutuhan baru hanya berupa diskusi produk dan belum diterapkan di website, statusnya ditandai secara terpisah. Dokumen ini tidak menetapkan legalitas atau persetujuan syariah suatu produk.
