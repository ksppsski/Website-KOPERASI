# Template dokumen dan aset privat

Template PDF kosong, font dan logo yang diperlukan aplikasi tersedia dalam repository. Data anggota diisi saat dokumen dibuat oleh backend yang berwenang.

Dua aset dari proyek asal sengaja tidak dilacak Git karena memuat tanda tangan ketua:

- `spa-image2.png`: gambar tanda tangan yang dipasang pada surat keanggotaan.
- `membership-letter-source.docx`: sumber Word surat keanggotaan yang menyematkan gambar tersebut. Berkas ini hanya untuk penyuntingan template, bukan kebutuhan runtime.

Simpan berkas asli pada penyimpanan privat. Sebelum membangun backend, sediakan gambar PNG yang sah dan arahkan variabel lingkungan berikut ke lokasinya:

```sh
KSPPS_MEMBERSHIP_SIGNATURE_FILE=/lokasi/privat/tanda-tangan-ketua.png npm run build
```

Jalankan dari `source-lengkap/`. Alternatif lokal adalah menaruh file pada `backend/templates/spa-image2.png`, yang sudah dikecualikan melalui `.gitignore`. Jangan memasukkannya dengan `git add -f` atau menyimpan isi base64-nya dalam file source publik. Pada layanan build, ambil aset dari penyimpanan privat dengan akses terbatas.

Build backend berhenti dengan pesan yang jelas jika gambar tidak tersedia. Tidak ada pengganti kosong yang menghasilkan surat seolah sudah ditandatangani. Build frontend (`npm run build:frontend`) dan seluruh pengujian dapat dijalankan tanpa aset privat; pengujian PDF menggunakan gambar sintetis khusus tes.
