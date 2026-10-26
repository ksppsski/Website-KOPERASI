# Panduan kerja Codex — Website KSPPS

Repository ini melanjutkan website KSPPS Syirkah Kebaikan Indonesia yang telah dikembangkan bersama pengguna. Baca konteks sebelum mengubah perilaku; jangan membangun ulang dari nol.

## Baca terlebih dahulu

1. `panduan-codex/README.md` — tujuan, baseline dan urutan baca.
2. `panduan-codex/ATURAN-BISNIS.md` — peran, simpanan, akad, avalist dan pembayaran.
3. `panduan-codex/STATUS-DAN-LANJUTAN.md` — fitur selesai, batas operasional dan pekerjaan tersisa.
4. `panduan-codex/KEPUTUSAN-DAN-REFERENSI.md` — preferensi, perubahan keputusan dan bahan sumber.
5. `source-lengkap/docs/PETA-KODE.md` — file yang harus dibuka untuk tiap fitur.

Saat menyentuh alur keuangan atau akses, baca juga bagian terkait di `source-lengkap/docs/WORKFLOWS.md` dan pengujiannya. Saat menyentuh hosting/login, baca `source-lengkap/docs/PINDAH-HOSTING.md`. Instruksi pengguna terbaru mengarahkan pekerjaan; catatan historis menjelaskan keputusan lama, bukan menggantikan instruksi baru. Jika perilaku kode dan kebutuhan tertulis berbeda, jelaskan perbedaannya sebelum mengubah aturan bisnis secara diam-diam.

## Cara bekerja dengan pengguna

- Gunakan bahasa Indonesia yang sederhana. Jelaskan dampak operasional terlebih dahulu; pengguna berlatar finance.
- Pertahankan **Svelte 5 + Vite**. Pengguna secara eksplisit meminta kode yang mudah dibaca, tidak menghemat baris, dan mudah ditemukan saat ada bug.
- Kembangkan proyek yang ada. Hindari pergantian framework, desain ulang besar, atau perubahan angka/periode keuangan yang tidak termasuk permintaan.
- Bedakan hasil tes, hasil publikasi, dan hasil pemeriksaan browser nyata. Jangan mengatakan login aktif, uang ditransfer, atau domain berubah tanpa bukti yang sesuai.
- Simpan pengetahuan baru yang relevan di dokumentasi ini agar sesi selanjutnya tidak bergantung pada chat lama.

## Sumber dan hasil build

- `source-lengkap/` adalah sumber aplikasi: `frontend-user/`, `frontend-petugas/`, `frontend-avalist/`, `shared/`, `backend/`.
- `docs/` di root adalah **hasil build GitHub Pages**, bukan tempat menulis portal. Ubah sumber, lalu jalankan `npm run build:pages` dari root jika perubahan memengaruhi frontend/pratinjau.
- `source-lengkap/docs/` adalah dokumentasi teknis. `panduan-codex/` adalah dokumentasi serah terima. Jangan tertukar dengan `docs/` hasil build.
- `dist/` dan `dist-preview/` adalah keluaran build. Jangan mengedit bundle minified untuk memperbaiki bug.
- Pertahankan `docs/CNAME`. Hosting aplikasi dan GitHub Pages memiliki kemampuan berbeda; commit GitHub tidak otomatis memindahkan backend atau data dari Site.

## Batas arsitektur

- Markup di komponen/snippet `.svelte`; jangan mengembalikan string HTML besar, `{@html}`, atau penulisan `innerHTML` untuk merender UI.
- Controller mengoordinasikan fitur. Transport HTTP, sinkronisasi state, dan tampilan memiliki tanggung jawab terpisah.
- Layanan dan state dimiliki instance portal (`app.services`, `app.state`); jangan membuat singleton mutable atau dependensi pada urutan registrasi global.
- Event internal memakai `app.events`; listener/timer/request mengikuti `app.scope` dan dibersihkan saat selesai. Pertahankan isi formulir/file ketika refresh latar belakang.
- Frontend satu portal tidak mengimpor frontend portal lain atau backend. `shared/` tidak mengimpor implementasi portal atau server. Dependensi bersama yang jelas diperbolehkan; "independen" tidak berarti menyalin kode yang sama.
- Gunakan utilitas rupiah/tanggal, ikon, badge, dan status bersama. Tes arsitektur membatasi baris source maksimal 180 karakter dan menolak import melingkar.
- Mode `static-preview` memakai adapter tanpa jaringan, data kosong, dan formulir nonaktif. Jangan mengaktifkan penyimpanan data pribadi pada Pages tanpa backend.

## Invarian penting

- Otorisasi dan kepemilikan data diperiksa server. Pemilih role dan input email tidak memberi hak akses.
- Identitas hanya berasal dari sesi yang diverifikasi binding server `AUTH`. Integrasi akun platform lama sudah dihapus. Jangan mengembalikan pembacaan header identitas klien atau membuka formulir Pages sebagai pengganti backend.
- Avalist mempunyai portal sendiri; tidak harus menjadi Admin atau Finance. Hanya Manajer mengesahkan perubahan penetapan/persentase/koreksi fee.
- Pembayaran selesai dan dokumen final tidak ditimpa. Koreksi keuangan dicatat terpisah dengan alasan dan jejak pemeriksa.
- Penawaran penuh hilang dari portal anggota setelah 72 jam sejak terpenuhi; riwayat Manajer tetap utuh.
- Perhitungan tanggal operasional memakai Asia/Makassar. Jangan mengganti aturan +365 hari menjadi +1 tahun kalender.
- Jangan mengubah migrasi yang sudah diterapkan. Tambahkan migrasi baru bila diperlukan. Tes memakai data sementara, bukan produksi.
- `backend/src/reset-demo.js` adalah pekerjaan historis dengan cutoff tetap. Jangan menjalankan ulang atau memperluas cutoff untuk data operasional.
- Jangan commit database, KTP, rekening/bukti transfer anggota, token, password, secret, atau tanda tangan privat. Aset privat backend disediakan melalui `KSPPS_MEMBERSHIP_SIGNATURE_FILE`; jangan membuat tanda tangan pengganti.

## Perintah kerja

Gunakan Node.js 24 untuk menyamai workflow CI, dengan dependensi dari lockfile.

```sh
# Dari root repository
npm run setup
npm run check
npm run test:app
npm run build:frontend

# Setelah perubahan yang memengaruhi tampilan Pages
npm run build:pages
npm run check:pages
npm run test:preview
```

`npm test` di root hanya menguji pratinjau statis. `npm run test:app`/`npm run test:all` menjalankan seluruh suite aplikasi, termasuk pratinjau. Tes fitur tersedia dari `source-lengkap/`: `test:portal`, `test:parity`, `test:workflow`, `test:finance`, `test:activity`, `test:savings`, `test:manager`, `test:access`, `test:maturity`, `test:withdrawal`, `test:avalist`, `test:runtime`, `test:preview`.

Pilih tes sesuai risiko perubahan; perubahan dokumentasi saja tidak memerlukan tes transaksi penuh. Build backend lengkap membutuhkan aset privat yang dijelaskan di `source-lengkap/backend/templates/README.md`. Frontend dan pengujian menggunakan aset yang tersedia di repository.

Sebelum menyelesaikan pekerjaan, laporkan perubahan, pemeriksaan yang benar-benar dijalankan, dan batas yang masih ada. Untuk perubahan aplikasi, perbarui dokumentasi yang terpengaruh serta hasil Pages bila relevan. Pastikan tidak ada salinan portal lama atau dokumen status yang bertentangan.
