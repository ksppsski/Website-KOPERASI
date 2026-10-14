# Prompt pembuka untuk Codex

Buka repository `ksppsski/Website-KOPERASI`, lalu kirim teks berikut. Dokumen proyek sudah ada di repository; tidak perlu menyalin seluruh chat lama ke prompt.

```text
Lanjutkan proyek website KSPPS Syirkah Kebaikan Indonesia dari repository ini.

Sebelum mengubah kode, baca:
1. AGENTS.md
2. panduan-codex/README.md
3. panduan-codex/ATURAN-BISNIS.md
4. panduan-codex/STATUS-DAN-LANJUTAN.md
5. panduan-codex/KEPUTUSAN-DAN-REFERENSI.md
6. source-lengkap/docs/PETA-KODE.md

Gunakan kode terbaru di branch kerja. Baseline serah terima adalah aplikasi v39;
jangan menimpa perubahan yang lebih baru atau membangun ulang dari nol.

Framework harus tetap Svelte. Saya ingin kode mudah dibaca, dipisahkan per fitur,
dan mudah ditelusuri oleh tim IT. Tidak perlu menghemat baris.

Sumber aplikasi ada di source-lengkap/. Folder docs/ di root merupakan build
GitHub Pages dan diperbarui dari sumber yang sama. Pages masih pratinjau tanpa
backend. Login email/kata sandi mandiri belum aktif; jangan menyebutnya selesai
hanya karena formulir login tersedia.

Pertahankan aturan bisnis, hak akses, dokumen, histori dan data yang sudah ada.
Bedakan fakta implementasi dari diskusi produk yang belum diterapkan.
Jangan memasukkan data anggota, secret atau tanda tangan privat ke GitHub.

Untuk langkah awal, periksa kondisi repository lalu jelaskan secara singkat
pemahamanmu, kondisi operasional yang belum selesai dan urutan langkah berikutnya.
Jangan mengubah fitur hanya karena terdapat daftar pekerjaan tertunda.
Setelah saya memberikan tugas berikutnya, kerjakan sampai selesai dan perbarui
dokumentasi konteks bila ada keputusan baru. Komunikasikan dalam bahasa Indonesia.
```

Untuk langsung memberikan pekerjaan tertentu, tambahkan pada akhir prompt: `Tugas sekarang: ...` beserta hasil yang diinginkan. Ikuti prosedur publikasi yang tersedia dan verifikasi hasilnya; jangan mengasumsikan akses hosting, database atau kredensial lama sudah ikut pindah.
