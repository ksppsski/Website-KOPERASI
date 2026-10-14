# Menghubungkan domain

Catatan sinkronisasi 14 Oktober 2026: domain yang sudah tercatat adalah **syirkahkebaikanindonesia.com** di `docs/CNAME`. Folder `docs/` dihasilkan dengan `npm run build:pages` dari sumber Svelte yang sama di `source-lengkap/`. Pages menampilkan pratinjau tanpa backend; login, database dan transaksi memerlukan hosting aplikasi. Lihat [panduan pindah hosting](source-lengkap/docs/PINDAH-HOSTING.md).

Pastikan website sudah tampil di alamat GitHub Pages dahulu.

1. Buka repository → **Settings → Pages → Custom domain**. Isi domain Anda tanpa `https://`, lalu simpan.
2. Buka pengaturan DNS di tempat Anda membeli domain. Pilih skenario berikut.

| Alamat yang diinginkan | Jenis DNS | Nama / host | Tujuan |
|---|---|---|---|
| Subdomain, misalnya `kspps.domainanda.id` | CNAME | `kspps` | `USERNAME.github.io` |
| Subdomain `www.domainanda.id` | CNAME | `www` | `USERNAME.github.io` |
| Domain utama `domainanda.id` | A | `@` | `185.199.108.153` |
| Domain utama `domainanda.id` | A | `@` | `185.199.109.153` |
| Domain utama `domainanda.id` | A | `@` | `185.199.110.153` |
| Domain utama `domainanda.id` | A | `@` | `185.199.111.153` |

Ganti `USERNAME` dengan username GitHub atau nama organisasi pemilik repository. Tujuan CNAME tidak memakai `https://` atau nama repository. Untuk domain utama, gunakan keempat baris A. Pilih hanya konfigurasi yang sesuai alamat Anda; jangan mengubah DNS email.

3. Tunggu pemeriksaan DNS berhasil; perubahan dapat membutuhkan sampai 24 jam. Aktifkan **Enforce HTTPS** saat tersedia.
4. Buka `https://alamat-domain-anda`.

File `docs/CNAME` sudah berisi domain milik koperasi. Pengaturan Custom domain GitHub harus sesuai dengan file tersebut. GitHub juga menyarankan verifikasi kepemilikan domain.

Petunjuk resmi dan nilai DNS terbaru:
https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

Verifikasi kepemilikan:
https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/verifying-your-custom-domain-for-github-pages
