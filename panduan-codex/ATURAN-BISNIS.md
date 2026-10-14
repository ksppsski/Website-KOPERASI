# Aturan bisnis dan perilaku yang harus dipertahankan

Baseline: implementasi website **v39**, 14 Oktober 2026. Nilai dan aturan di sini menggambarkan konfigurasi yang telah dibuat; perubahan produk memerlukan instruksi bisnis yang jelas. Detail algoritme dan bukti pengujian ada di [WORKFLOWS.md](../source-lengkap/docs/WORKFLOWS.md).

## 1. Portal dan kewenangan

| Peran | Kewenangan utama | Batas |
| --- | --- | --- |
| Anggota | Mengelola pendaftaran/profil sendiri, simpanan, pengajuan, dokumen, pilihan jatuh tempo dan pengunduran diri | Hanya data dan berkas miliknya |
| Admin | Memeriksa identitas/KTP, pendaftaran dan pengajuan; membuat/unggah akad; meninjau pengunduran diri; mengirim usulan avalist | Tidak menggantikan rekonsiliasi Finance atau mengesahkan perubahan fee |
| Finance | Rekonsiliasi dana, daftar bagi hasil, pembayaran avalist, pengembalian modal dan simpanan pokok | Tidak menyetujui pendaftaran/akad atau mengubah penerima/persentase avalist |
| Manajer | Membuat penawaran, mengelola akses, laporan, memantau pekerjaan, mengesahkan avalist/koreksi dan pengunduran diri | Setiap perubahan tetap divalidasi dan dicatat server |
| Avalist | Melihat periode hak, ringkasan fee, pembayaran dan bukti miliknya di portal sendiri | Tidak mendapat akses operasional Admin/Finance, KTP, rekening atau dokumen akad anggota |

Manajer dapat membuka tampilan Admin dan Finance. Pemilih role pada UI tidak memberikan izin baru. Avalist dapat berasal dari internal kantor tanpa menjadi petugas Admin/Finance. Hak akses pemeriksaan server tetap menentukan, meskipun menu tidak ditampilkan.

Portal: `/anggota.html`, `/petugas.html`, dan `/avalist.html`; landing berada di `/`. Pintu masuk petugas dipisahkan dari navigasi landing/anggota. Keputusan ini bukan pengganti otorisasi.

## 2. Pendaftaran dan identitas keanggotaan

- Anggota mengisi identitas, alamat, kontak, rekening, foto KTP, tanda tangan, dan bukti setoran awal. KTP dan bukti setoran wajib. Bukti transfer menerima JPG/PNG/PDF sesuai validasi server.
- KTP tampil di kanan tanda tangan pada layar lebar dan ditumpuk pada layar kecil.
- Nomor anggota: `SKI-<tahun daftar>-<nomor urut>`, minimal empat digit urutan. Tahun mengikuti waktu pendaftaran yang dicatat server di Asia/Makassar.
- Urutan global terus bertambah lintas tahun; nomor tidak digunakan ulang. Edit, refresh atau kirim ulang tidak memberi nomor kedua.
- Finance merekonsiliasi setoran. Admin memeriksa identitas dan menyetujui sesuai tahap; persetujuan yang mensyaratkan dana menunggu rekonsiliasi sah.
- Surat keanggotaan satu halaman tersedia setelah rekonsiliasi pembayaran awal. Tanggal surat mengikuti tanggal rekonsiliasi WITA; bulan nomor surat memakai Romawi.
- Nama file surat: `SPA <nomor anggota> a.n <nama anggota>.pdf`.
- Foto, tanda tangan, rekening dan dokumen adalah data privat, bukan contoh untuk dimasukkan ke repository.

## 3. Simpanan

- Simpanan pokok **Rp100.000**, sekali per keanggotaan.
- Simpanan wajib **Rp10.000 per bulan**, dapat menggunakan saldo di muka. Tanggal acuan mengikuti pendaftaran dan disesuaikan pada bulan pendek.
- Pilihan setoran tahunan adalah Rp120.000. Alokasi dimulai bulan pendaftaran; pembayaran terlambat menutup kewajiban terlama lebih dulu. Tidak ada denda atau masa tenggang baru yang ditambahkan.
- Status aktif membutuhkan pendaftaran disetujui, simpanan pokok cukup, dan seluruh kewajiban sampai hari ini tertutup. Saldo di muka nol tetap aktif bila bulan berjalan sudah terbayar; menjadi tidak aktif saat kewajiban berikutnya belum tertutup.
- Pengingat top up muncul saat sisa simpanan wajib di muka **paling banyak Rp30.000**.
- Simpanan aktif menjadi syarat pengajuan baru penyertaan modal/pembiayaan. Perbaikan pengajuan lama tetap mengikuti status dan izin pengajuan tersebut.
- Setoran wajib tambahan masuk antrean rekonsiliasi Finance; belum dianggap dana sah hanya karena bukti diunggah.
- Perubahan bukti atau nominal yang diharapkan membatalkan validitas rekonsiliasi sebelumnya bila tidak lagi cocok.

## 4. Penawaran modal dan kuota

- Manajer membuat penawaran berisi judul, kode project, dan kuota.
- Penawaran penuh tidak dapat menerima pengajuan baru. Pemeriksaan kuota dilakukan server, termasuk pengajuan bersamaan, revisi, dan perpanjangan.
- Penawaran yang terpenuhi tetap terlihat di portal anggota selama **3 × 24 jam / 72 jam sejak terpenuhi**, lalu disembunyikan dari daftar anggota.
- Riwayat penawaran, pengajuan dan akad tetap ada di portal Manajer; aturan ini tidak menghapus data.
- Timestamp penuh berubah hanya sesuai transisi kuota. Perubahan dokumen/nominal yang tidak mengubah pemenuhan tidak memulai ulang 72 jam.
- Bila kapasitas terbuka lagi, timestamp penuh dihapus; saat kembali penuh, hitungan 72 jam dimulai lagi.
- Halaman yang sudah terbuka ikut menyembunyikan kartu kedaluwarsa, tanpa menutup atau mengosongkan formulir yang sedang diisi.
- Timestamp penawaran lama yang sudah penuh pernah direkonstruksi dari histori sebagai estimasi. Transisi baru dicatat tepat oleh server.

## 5. Penyertaan modal dan akad

Alur utama: anggota mengajukan nominal dan bukti → Finance merekonsiliasi dana → Admin memeriksa/menyetujui → Admin membuat PDF → tanda tangan koperasi diperoleh di luar aplikasi → Admin mengunggah PDF lengkap → anggota melihat arsip miliknya.

- Template asli dipertahankan: layout dua kolom, halaman, klausul tetap, header/footer dan tempat tanda tangan tidak didesain ulang tanpa instruksi.
- Tanda tangan anggota berasal dari pendaftaran dan dipasang proporsional. Area tanda tangan pihak koperasi pada PDF awal tetap kosong.
- Nomor internal akad memakai urutan global, contoh `0001/SPK-SKI-MRBH-9/IX/2026`.
- Kode otomatis: `SPK-SKI-MRBH-<bulan akad angka>/<bulan akad Romawi>/<tahun akad>`.
- Akad dana baru: tanggal efektif nisbah = tanggal akad **+10 hari kalender**. Jika hasilnya tanggal 31, pindah ke tanggal 1 bulan berikutnya.
- Tanggal selesai = tanggal efektif yang sudah disesuaikan **+365 hari kalender**, bukan penambahan satu tahun kalender.
- Server menghitung nomor/tanggal turunan. Nilai kiriman browser tidak boleh menimpa aturan tersebut.
- Label dokumen: `SPK <kode project> / <nomor urut surat> a.n <nama anggota>`. Tanda `/` menjadi `-` dalam nama file unduhan.
- Pengulangan generate untuk pengajuan yang sama mempertahankan nomor dan file awal. Nomor yang sudah dipesan tidak dialokasikan ke pengajuan lain.
- PDF final disimpan beserta hash, tidak ditimpa. Unggah ulang PDF awal tanpa perubahan ditolak. Petugas mengonfirmasi kelengkapan tanda tangan; sistem belum memverifikasi tanda tangan tersertifikasi.
- Tidak ada integrasi Privy/e-meterai yang aktif. Jangan menyamakan gambar tanda tangan dengan layanan tanda tangan elektronik tersertifikasi.

## 6. Daftar bagi hasil anggota

- Implementasi saat ini menghitung **nominal akad × 5% per periode bulanan**, mengikuti aturan yang sebelumnya diminta. Dokumen ini tidak mengubah dasar produk menjadi margin realisasi atau rasio baru.
- Dasar jadwal adalah tanggal efektif nisbah; pembayaran pertama satu bulan kalender setelah efektif.
- Contoh pengujian: tanggal pembayaran 5 September 2026 mencakup cohort efektif 5 September 2025 sampai 5 Agustus 2026. Akad efektif 5 September 2026 belum jatuh pembayaran hari itu.
- Periode 1–12, tanpa jadwal melewati tanggal selesai tersimpan. Tanggal bulanan 29/30 yang tidak ada di Februari menggunakan hari terakhir bulan tersebut.
- Akad generated/signed masuk jika pendanaan mempunyai rekonsiliasi yang sesuai. Detail menandai dokumen yang masih menunggu tanda tangan koperasi.
- Hitung dan bulatkan nilai per akad ke rupiah dengan integer arithmetic/half-up, lalu kelompokkan berdasarkan anggota dan rekening. Rekening berbeda tetap menjadi baris transfer berbeda.
- Tanggal default mengikuti WITA dan pergantian hari; pilihan tanggal manual dan formulir terbuka tidak direset oleh refresh.
- CSV adalah daftar persiapan, bukan format unggah bank maupun bukti dana sudah dibayar. Sistem tidak mengirim transfer otomatis.

## 7. Akhir akad

- Notifikasi muncul sejak H-30 dan bertahan sampai anggota memilih, termasuk bila sudah melewati H.
- Anggota memilih **sekali saja**: perpanjangan pokok yang sama ke project baru yang terbuka, atau pengembalian modal.
- Perpanjangan memesan kuota project baru dan membuat draft Admin yang terkait pokok lama. Dana lama yang direkonsiliasi menjadi dasar; tidak meminta transfer kedua.
- Perpanjangan tidak mendapat masa tunggu +10 hari. Efektif mulai pada tanggal selesai lama, atau tanggal konfirmasi bila terlambat; penyesuaian tanggal 31 dan durasi +365 hari tetap berlaku.
- Pengembalian modal dijadwalkan hari H. Memilih lebih awal tidak mempercepat hak pencatatan transfer.
- Finance mencatat nominal tepat, tanggal, referensi dan bukti transfer. Pembayaran sebelum H atau pencatatan ganda ditolak.
- Manajer melihat agregat pokok/jumlah akad berakhir, lanjut, kembali, dan belum memilih berdasarkan rentang tanggal selesai.

## 8. Pengunduran diri

1. Anggota mengajukan permohonan.
2. Admin menyetujui/menolak dengan alasan; masih adanya kontrak atau kewajiban yang belum selesai memblokir proses.
3. Finance mengembalikan simpanan pokok **Rp100.000** dan mencatat bukti, tanggal serta referensi.
4. Manajer memberikan persetujuan final setelah kedua tahap selesai.
5. Keanggotaan ditutup permanen dan riwayat diarsipkan.

Tanggal akad yang sudah lewat tidak otomatis membebaskan kewajiban yang belum diselesaikan. Pengembalian/kelanjutan modal dan status kontrak pembiayaan tetap diperiksa server.

Daftar ulang membuat keanggotaan dan nomor baru, sekalipun identitasnya sama. Pengguna mengisi ulang data/berkas/setoran awal. Saldo, dokumen dan histori lama tidak dipindah otomatis ke keanggotaan baru. Penutupan keanggotaan tidak menghapus identitas akun penyedia login.

## 9. Avalist: pendaftaran, hak dan perubahan penerima

Avalist adalah referral internal kantor. Ia dapat menerima bagian dari akad anggota yang direferensikan, dan tidak harus menjadi Admin atau Finance.

### Akses

- Manajer mendaftarkan avalist dengan **email**. Nama/rekening dapat dilengkapi kemudian; rekening lengkap wajib sebelum pembayaran.
- Email pendaftaran harus dicocokkan dengan email identitas yang telah terautentikasi, lalu diikat sekali ke ID pengguna yang stabil. Mengisi email pada form bukan bukti identitas.
- Email dinormalisasi kapital/kecil tanpa menafsir ulang alias penyedia email. Duplikasi dan pemindahan ikatan identitas ditolak.
- Pendaftaran belum mengirim undangan email otomatis. Pada Site saat ini orang tersebut memakai login yang tersedia melalui ChatGPT, dengan email yang didaftarkan.
- Portal pribadi ada di `/avalist.html`, terpisah dari portal petugas. Akun yang hanya berhak sebagai avalist ditolak oleh API operasional umum.
- Perubahan kepemilikan fee dilakukan melalui penetapan/koreksi, **bukan mengganti email akun lama**.

### Penetapan dan persetujuan

- **Manajer** menetapkan penerima, persentase, tanggal efektif, menyetujui/menolak usulan Admin, dan mengesahkan koreksi.
- **Admin** mengajukan usulan yang belum berdampak keuangan sampai disetujui. **Finance** menyiapkan/mencatat pembayaran, bukan memindahkan hak.
- Avalist bawaan anggota berlaku untuk pengajuan baru. Nilainya disalin saat pengajuan, termasuk perpanjangan, dibuat.
- Mengubah bawaan tidak mengubah akad lama. Akad berjalan dipilih secara eksplisit, beserta tanggal efektif perubahan.
- Perubahan orang dapat mempertahankan persentase; perubahan persentase dapat mempertahankan orang. Riwayat keduanya diselesaikan terpisah.
- Perubahan berlaku mulai jadwal pembayaran pertama pada/setelah tanggal efektif terpilih. Periode yang sudah dibayar selalu memakai snapshot pembayaran semula.
- Akad lama tanpa avalist tidak diberi penerima diam-diam. Penetapan pertama wajib melengkapi orang dan persentase.
- Usulan yang dahulu belum lengkap dapat dilengkapi Manajer saat persetujuan, hanya pada nilai yang memang kosong. Penetapan lengkap pada akad lain tetap dipertahankan.
- Usulan beberapa akad mengikat daftar akad saat usulan dibuat; persetujuan tidak diam-diam memasukkan akad baru.

### Persentase dan pembayaran

| Anggota | Avalist | Koperasi | Total alokasi implementasi |
| --- | --- | --- | --- |
| 5% | 2% | 3% | 10% |
| 5% | 1% | 4% | 10% |

Sisa 1% ketika fee avalist turun menjadi 1% adalah hak koperasi. Pembulatan rupiah menyisakan selisih pada bagian koperasi agar jumlah tepat sesuai total yang dibulatkan. Penentuan 1%/2% saat ini adalah keputusan Manajer; jangan menambahkan penilaian target otomatis yang belum ditetapkan spesifikasinya.

Finance melihat alokasi per akad dan total penerima. Persiapan pembayaran memiliki versi/snapshot. Perubahan penerima, rekening, atau data sumber membuat persiapan terkait perlu ditinjau ulang. Pencatatan pembayaran mensyaratkan versi valid, nominal tepat, tanggal, referensi, bukti dan konfirmasi eksplisit.

Satu pembayaran reguler per akad/tanggal jatuh hak. Menyiapkan daftar anggota belum membuktikan anggota telah menerima transfer. Pembayaran dilakukan di luar aplikasi dan dicatat sesudahnya.

### Memindahkan fee dari Avalist A ke Avalist B

- Untuk pengajuan berikutnya: ubah avalist bawaan anggota.
- Untuk akad berjalan/periode yang belum dibayar: tetapkan B pada akad terpilih mulai tanggal efektif yang dipilih.
- Untuk fee yang sudah dibayar kepada A: pembayaran A tidak diedit. Manajer menyetujui koreksi terpisah, berupa pemulihan/pengembalian dari A dan pembayaran kepada B sesuai alasan serta nilai yang disahkan. Finance mencatat penyelesaiannya.
- Koreksi positif adalah tambahan transfer; koreksi negatif adalah pemulihan ke koperasi. Semua tetap dapat diaudit dan pengiriman ulang tidak membuat transaksi ganda.

### Ringkasan fee pribadi dan bulanan

- `feeSummary` hanya menghitung milik pengguna yang masuk. Total kumulatif mencakup pembayaran selesai dan hak jatuh tempo sampai tanggal acuan, beserta koreksi terkait; bukan seluruh proyeksi masa depan.
- `monthlyFees.total` mengikuti **bulan hak/jatuh tempo**, mencakup seluruh jadwal bulan itu termasuk tanggal mendatang dan koreksi yang disetujui.
- `monthlyFees.paid` mengikuti **tanggal transfer aktual**, bukan tanggal input (`paid_at`).
- `paidForPeriod` adalah pembayaran atas hak periode yang dipilih. `pending = total - paidForPeriod`, bukan total dikurangi arus kas bulan tersebut.
- Contoh: hak September dibayar Oktober → masuk total hak September dan kas dibayar Oktober. Tidak dihitung dua kali.
- `notDueYet` menandai hak yang belum jatuh tempo. Pilihan bulan/tahun default WITA, tidak hilang saat refresh, dan bulan kosong bernilai nol.
- Pembayaran akad arsip tetap dihitung. Persiapan transfer belum dibayar tidak dihitung sebagai pembayaran selesai. Saldo negatif ditampilkan sebagai pengembalian yang menjadi hak koperasi.
- Avalist hanya melihat data periode miliknya, identitas anggota minimal yang diperlukan, dan riwayat/bukti sendiri; tidak melihat rekening anggota atau penerima lain.

## 10. Pengawasan dan laporan

- Manajer memantau pekerjaan Admin/Finance hari ini sampai tujuh hari sebelumnya, termasuk waktu masuk, mulai, selesai, respons, pengerjaan dan filter.
- KPI/timestamp kerja hanya ditampilkan dalam pemantauan Manajer. Admin/Finance mempunyai tindakan mulai mengerjakan tanpa panel KPI.
- Durasi saat ini adalah waktu kalender, bukan perhitungan absensi atau SLA yang otomatis mengecualikan jam istirahat.
- Antrean pekerjaan bersama tidak mengharuskan petugas mencari anggota dulu. Tugas terbaru berada paling atas.
- Manajer mengunggah laporan penggunaan dana dan keuangan untuk anggota sesuai akses.
- Notifikasi yang ada adalah di dalam portal. Email, WhatsApp dan transfer bank otomatis belum terhubung.

## 11. Invarian lintas fitur

Identitas, role, kepemilikan, kuota, transisi status, tanggal dan nominal diperiksa server. Nomor/transaksi tidak boleh ganda akibat klik ulang atau permintaan bersamaan. Riwayat final dan audit tidak ditimpa. Refresh latar belakang tidak menghapus isian/file/persetujuan. Semua waktu operasional mengikuti Asia/Makassar, kecuali timestamp teknis yang memang disimpan sebagai UTC lalu ditampilkan dalam WITA.
