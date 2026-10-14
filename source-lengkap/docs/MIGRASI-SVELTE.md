# Migrasi sumber ke Svelte

Tujuan: kode lebih mudah dibaca dan dikembangkan, dengan hasil dan alur yang tetap sama.

## Perubahan struktur

Sebelumnya, file dalam `dist/assets/` sekaligus menjadi sumber yang diedit. Render halaman, HTML panjang, event formulir, dan permintaan API bercampur dalam file yang padat.

Sekarang:

1. `frontend-user/src/entries/` dan `frontend-petugas/src/entries/` membuka landing page, portal anggota, atau portal petugas.
2. `frontend-user/src/Portal.svelte` dan `frontend-petugas/src/Portal.svelte` memilih komponen sesuai rute dan role yang sudah diizinkan controller.
3. `frontend-user/src/components/`, `frontend-petugas/src/components/` dan `shared/components/` berisi halaman dan bagian tampilan yang bernama sesuai fungsinya.
4. `frontend-user/src/features/` dan `frontend-petugas/src/features/` mengelompokkan interaksi khusus masing-masing portal. `shared/features/` memuat interaksi yang dipakai keduanya. `getViewContext()` memasok data/helper yang diperlukan halaman.
5. `backend/src/` tetap menjadi sumber kebenaran untuk otorisasi dan transaksi. Memilih role atau mengubah nilai di browser tidak mengganti pemeriksaan server.
6. Vite menyusun komponen menjadi HTML/CSS/JavaScript untuk browser. `backend/scripts/build.mjs` membungkus hasilnya bersama API dan template PDF.

Ini menggunakan Svelte dengan Vite, bukan SvelteKit. URL `index.html`, `anggota.html`, `petugas.html` dan rute `#...` tetap digunakan agar tautan lama berfungsi.

## Mempertahankan perilaku

Store tampilan diperbarui saat controller menerima perubahan data. `flushSync` memastikan halaman tersedia sebelum controller memasang kanvas tanda tangan, filter, atau unggahan. Dialog berada di luar bagian halaman yang diganti, sehingga refresh tidak menghapus draft, file bukti, atau persetujuan anggota.

Formulir pendaftaran dipisahkan menjadi komponen halaman dan bagian simpanan. Tampilan bersama seperti ikon, brand, badge, input, review data, dan statistik memakai komponen reusable. Data pengguna pada markup Svelte memakai interpolasi biasa yang di-escape otomatis. Dialog dan tabel kini memakai snippet Svelte dalam `features/<fitur>/views/*.svelte`, dengan props yang di-escape oleh Svelte.

## Cara mengembangkan

Contoh: untuk mengganti susunan ringkasan anggota, buka `frontend-user/src/components/member/MemberDashboard.svelte`. Untuk mengubah respons setelah mengirim pengajuan, cari handler formulir di `shared/features/workflow/controller.js`. Untuk mengubah aturan tanggal, mulai dari `backend/src/contract-rules.js`, lalu samakan pratinjau tanggal dan jalankan pengujian.

Jangan mengubah `backend/templates/` saat hanya mengubah UI. Jangan mengedit `dist/` karena build berikutnya menimpanya. Jangan memindahkan keputusan keuangan atau otorisasi dari server ke komponen.

Migrasi berikutnya menghapus renderer string HTML dan layanan singleton. Setiap portal memiliki instance layanan, store, event internal, dan fungsi disposal sendiri. Format sumber dirapikan dengan Prettier; file JavaScript hasil build tetap dipadatkan untuk pengiriman.

## Bukti kesetaraan

`tests/fixtures/portal-parity.json` menyimpan hash struktur DOM yang direkam dari renderer sebelum migrasi. `tests/portal-parity.mjs` membandingkan tampilan Svelte dengan acuan itu, termasuk kelas CSS, label, field, dan kontrol. Variasi loading yang sah memiliki lebih dari satu hash. Jangan memperbarui acuan hanya untuk membuat tes lulus: tinjau perubahan tampilan lebih dahulu.

Tes tambahan memeriksa formulir yang tetap terbuka saat refresh, file bukti saat retry, pendaftaran/KTP, pembatasan role, koreksi, laporan, kuota, jatuh tempo, pengunduran diri dan penutupan akun. Tes aturan server memeriksa alur dokumen dan transaksi secara terpisah.
