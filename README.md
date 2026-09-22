# KSPPS — paket website untuk GitHub

Paket ini berasal dari website KSPPS Syirkah Kebaikan Indonesia yang telah dikerjakan, versi v18 tanggal 22 September 2026. Warna, logo, susunan halaman, dan desain dasarnya dipertahankan. Versi siap tayang diberi penanda layanan belum aktif, bukan diubah menjadi desain baru.

**HTML dan CSS saja belum cukup.** Website ini juga memakai JavaScript dan gambar. Semua sudah ada dalam paket; Anda tidak perlu menyalin potongan kode satu per satu.

## Isi paket

| Folder / file | Kegunaan |
|---|---|
| `docs/` | Website statis siap ditayangkan melalui GitHub Pages. |
| `docs/index.html` | Halaman utama koperasi. |
| `docs/anggota.html` | Tampilan login, pendaftaran, dan portal anggota. |
| `docs/petugas.html` | Pratinjau Admin, Finance, dan Manajer; tidak ditautkan dari halaman utama. |
| `docs/assets/` | CSS, JavaScript, dan seluruh versi logo. |
| `source-lengkap/` | Kode aplikasi lengkap, backend, struktur database, template akad, serta pengujian untuk tim IT. |
| `PANDUAN-DOMAIN.md` | Cara menghubungkan domain milik Anda. |
| `VERSI.json` | Identitas versi kode yang diekspor. |

## 1. Ekstrak ZIP

Ekstrak paket ini di komputer. Buka folder `kspps-untuk-github`. File `README.md` dan folder `docs` harus terlihat langsung di dalamnya.

Anda bisa mencoba membuka `docs/index.html` di browser. Untuk peninjauan semua halaman yang lebih konsisten, tim IT dapat menjalankan `python3 -m http.server 8080 --directory docs` dari folder paket, lalu membuka `http://localhost:8080`. Situs daring nantinya menggunakan HTTPS.

## 2. Unggah ke GitHub

1. Masuk atau buat akun di https://github.com.
2. Buat repository baru, misalnya `kspps-website`. Repository adalah folder proyek di GitHub.
3. Untuk GitHub Pages pada akun gratis, gunakan repository **Public**. Pilihan ini membuat kode di dalam repository terlihat publik. Repository private memerlukan paket GitHub yang mendukung Pages.
4. Pilih **Add file → Upload files**. Unggah **isi folder hasil ekstrak**, bukan file ZIP atau folder pembungkusnya.
5. Simpan dengan **Commit changes**.

Untuk kebutuhan tampilan sekarang, cukup unggah folder `docs` dan panduan ini. Folder `source-lengkap` bisa Anda kirim terpisah kepada tim IT, atau unggah ke repository kode yang mereka kelola. Bila Anda memilih mengunggah semua isi paket sekaligus, tetap gunakan folder `docs` sebagai sumber Pages. Jangan memasukkan data anggota atau hasil unggahan ke repository.

Jika unggahan seluruh folder sekaligus melewati batas jumlah file di layar GitHub, unggah bertahap atau gunakan GitHub Desktop. Untuk publikasi statis, `docs` hanya berisi sekitar 20 file.

## 3. Tampilkan website

Buka **Settings → Pages** di repository. Pada **Source**, pilih **Deploy from a branch**. Pilih branch `main` dan folder **`/docs`**, lalu **Save**. Setelah deployment berhasil, buka alamat yang ditampilkan GitHub.

Tidak ada langkah instalasi Node.js atau build untuk versi statis ini. Anda juga dapat menyalin seluruh isi `docs` ke folder publik hosting statis lain.

## 4. Pasang domain

Ikuti `PANDUAN-DOMAIN.md`. Domain adalah alamat website, sedangkan GitHub Pages menyediakan tempat menayangkan file tampilannya. Paket ini belum memasang domain tertentu karena nama domain baru Anda belum disebutkan.

## Yang sudah dapat dilihat

- Halaman utama, navigasi, warna, dan logo koperasi.
- Tampilan login anggota dan empat langkah formulir pendaftaran.
- Portal anggota dengan keadaan kosong: simpanan, penyertaan modal, pembiayaan, dokumen, laporan, profil, dan pengunduran diri.
- Pratinjau ruang kerja Admin, Finance, serta Manajer melalui alamat langsung `petugas.html`.

Di halaman masuk anggota, pilih **Jelajahi portal anggota**. Formulir pendaftaran memiliki tombol **Lihat langkah berikutnya** agar seluruh tampilannya dapat diperiksa tanpa mengisi data.

## Yang belum aktif di versi statis

Login sungguhan, pendaftaran, penyimpanan data, unggahan KTP/tanda tangan/bukti/laporan, persetujuan, transaksi, serta pembuatan akad PDF belum berjalan. Kolom formulir dinonaktifkan. Angka nol dan daftar kosong menunjukkan bahwa versi ini tidak terhubung ke database; bukan saldo atau laporan operasional.

Tombol pilihan peran di pratinjau petugas hanya menampilkan rancangan layar. Halaman tersebut bersifat publik tanpa data, **bukan sistem autentikasi**. Memisahkan alamat petugas dan menghapus tautannya dari halaman utama tidak membatasi akses secara teknis. Pembatasan akun yang sesungguhnya ada dalam backend dan perlu diaktifkan tim IT saat pindah hosting.

Tidak ada data anggota, password, token aktivasi Manajer, database, atau berkas unggahan dari website lama di dalam paket. Website yang sebelumnya sudah tayang tidak berubah akibat ekspor ini.

## Saat siap mengaktifkan layanan

Berikan `source-lengkap` kepada tim IT. Baca `source-lengkap/README.md` untuk kebutuhan database, penyimpanan berkas, login, dan build. Mengunggah source backend ke GitHub tidak otomatis menjalankannya.

GitHub Pages digunakan di sini untuk **pratinjau tampilan tanpa transaksi atau pengumpulan data**. Portal koperasi operasional memerlukan hosting aplikasi yang sesuai, bukan layanan Pages statis.

Referensi resmi (diperiksa 22 September 2026):
- https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits

Untuk tim IT: pemeriksaan versi statis dapat dijalankan dengan `npm test` dari folder paket, tanpa instalasi dependensi. Pemeriksaan mencakup navigasi, formulir baca-saja, penolakan perubahan data, serta API yang tidak mengirim permintaan jaringan.
