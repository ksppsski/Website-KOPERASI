# Peta kode dan panduan pemeliharaan

Framework frontend tetap **Svelte 5 + Vite**. Backend tetap Worker JavaScript dengan database dan penyimpanan yang sama. Pemisahan ini tidak mengubah aturan pembagian fee, otorisasi, nomor dokumen, atau data anggota.

## Mulai dari fitur yang bermasalah

| Gejala / perubahan                | Tampilan Svelte                                                                                 | Logika browser                                                                                                | Aturan server                                                              |
| --------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Pendaftaran, KTP, bukti setoran   | `frontend-user/src/components/member/MemberRegistration.svelte`                                 | `frontend-user/src/features/member/registration-identity.js`, `registration-proof.js`, `registration-form.js` | `backend/src/features/registration/service.js`                             |
| Saldo dan setoran wajib           | `frontend-user/src/components/member/MemberSavings.svelte`                                      | `shared/features/workflow/savings.js`                                                                         | `backend/src/features/savings/service.js`, `backend/src/savings.js`        |
| Penawaran dan batas tampil 3 hari | `frontend-petugas/src/components/workflow/CapitalOffers.svelte`                                 | `shared/features/workflow/offers.js`, `shared/lib/offer-visibility.js`                                        | `backend/src/offers.js`                                                    |
| Pengajuan penyertaan modal        | `frontend-user/src/components/member/MemberCapital.svelte`                                      | `shared/features/workflow/application-forms.js`                                                               | `backend/src/features/capital/service.js`                                  |
| Kartu akad anggota                | `frontend-user/src/components/member/CapitalContractCard.svelte`                                | `frontend-user/src/features/member/queries.js`                                                                | `backend/src/features/workflow/records.js`                                 |
| Rekonsiliasi Finance              | `frontend-petugas/src/components/finance/ReconciliationQueue.svelte`                            | `frontend-petugas/src/features/finance/reconciliation-dialog.js`, `events.js`                                 | `backend/src/finance.js`, `backend/src/http/routes/finance.js`             |
| Daftar bagi hasil harian          | `frontend-petugas/src/components/finance/DailyPayout.svelte`                                    | `frontend-petugas/src/features/finance/controller.js`, `export.js`                                            | `backend/src/finance.js`                                                   |
| Generate / unggah akad            | `frontend-petugas/src/components/staff/ContractDocuments.svelte`                                | `shared/features/workflow/documents.js`                                                                       | `backend/src/features/contracts/service.js`, `backend/src/contract-pdf.js` |
| Usulan dan pergantian avalist     | `frontend-petugas/src/components/avalist/AssignmentForm.svelte`, `ProposalList.svelte`          | `frontend-petugas/src/features/avalist/client.js`                                                             | `backend/src/features/avalist/assignments.js`                              |
| Pendaftaran email avalist         | `frontend-petugas/src/components/avalist/RegistryForm.svelte`                                   | `frontend-petugas/src/features/avalist/client.js`                                                             | `backend/src/features/avalist/people.js`, `backend/src/avalist-email.js`   |
| Koreksi fee selesai               | `frontend-petugas/src/components/avalist/CorrectionForm.svelte`                                 | `frontend-petugas/src/features/avalist/client.js`                                                             | `backend/src/features/avalist/payments.js`                                 |
| Pembayaran avalist                | `frontend-petugas/src/components/avalist/FeeSchedule.svelte`, `PaymentDialog.svelte`            | `frontend-petugas/src/features/avalist/client.js`                                                             | `backend/src/features/avalist/payments.js`                                 |
| Total fee pribadi/bulanan         | `shared/components/avalist/PersonalView.svelte`                                                 | `frontend-avalist/src/Portal.svelte`                                                                          | `backend/src/features/avalist/schedule.js`, `queries.js`                   |
| Jatuh tempo / pengembalian modal  | `frontend-petugas/src/components/maturity/`                                                     | `shared/features/maturity/`                                                                                   | `backend/src/maturity.js`, `backend/src/http/routes/settlements.js`        |
| Pengunduran diri                  | `shared/components/workflow/WorkflowPage.svelte`, `frontend-petugas/src/components/withdrawal/` | `shared/features/withdrawal/`                                                                                 | `backend/src/withdrawal.js`                                                |
| Waktu kerja / KPI                 | `frontend-petugas/src/components/activity/ManagerActivity.svelte`                               | `frontend-petugas/src/features/activity/`                                                                     | `backend/src/activity.js`, `backend/src/manager.js`                        |
| Warna status                      | `shared/components/Badge.svelte`                                                                | `shared/lib/status-colors.js`                                                                                 | Tidak mengubah aturan server                                               |
| Mode terang/gelap dan gerakan     | `shared/components/ThemeToggle.svelte`, `Brand.svelte`                                         | `shared/lib/theme.js`, `theme-motion.js`, `public/theme-preference.js`                                         | Tidak memakai API atau mengubah data aplikasi                              |
| Masalah akses akun                | `frontend-petugas/src/components/staff-access/StaffAccess.svelte`                               | `frontend-petugas/src/features/staff-access/controller.js`                                                    | `backend/src/access.js`, `backend/src/http/routes/accounts.js`             |

Favicon tab mengikuti mode perangkat. `public/assets/kspps-symbol.svg` berisi bentuk vektor logo, `scripts/generate-favicons.mjs` menghasilkan varian terang/gelap secara otomatis saat build.

## Tema terang dan gelap

`shared/lib/theme-motion.js` mengurus efek visual terpisah dari preferensi: circular reveal berpusat pada tombol selama 650 ms, fallback warna 420 ms dan penerapan langsung untuk pengurangan gerak. `ThemeToggle.svelte` menunggu `tick()` sebelum snapshot baru, mempertahankan fokus dan menahan klik berulang selama animasi. Pseudo-element dan gerakan ikon berada di `shared/styles/theme-motion.css`. Dispose melewati transisi dan membersihkan animation/timer.

`Brand.svelte` menumpuk aset warna dan putih transparan dengan satu nama aksesibel. Aturan opacity di `portal.css` mengikuti `data-theme` atau perangkat sebelum bootstrap; prop `white` tetap putih untuk latar auth. Logo tidak lagi diberi kotak putih dalam tema gelap.

Build Vite menormalkan urutan stylesheet melalui penelusuran dependensi per HTML pada hook `transformIndexHtml` di `vite.config.js`. Ini mempertahankan urutan CSS dasar sebelum workflow dan mencegah perbedaan urutan link antarpembangunan, tanpa menggabungkan CSS seluruh portal atau melonggarkan pemeriksaan kesesuaian Pages.

Pada 25 Oktober 2026, banner statis serta strip/badge/footer pengembangan dihapus dari semua frontend. `PreviewBanner.svelte` tidak lagi dipakai. Adapter dan guard di `shared/preview/` tetap menolak pengumpulan data dan operasi simpan pada Pages. Pesan penolakannya kini memakai bahasa fungsi yang tidak tersedia pada alamat tersebut. `tests/static-preview.mjs` memeriksa tidak adanya penanda pengembangan sekaligus mempertahankan perlindungan formulir dan nol permintaan API.

Pembaruan 23 Oktober 2026 memakai `ThemeToggle.svelte` sekali pada `PortalFrame.svelte` untuk Anggota/Petugas, serta pada `Landing.svelte` dan `frontend-avalist/src/Portal.svelte`. Komponen berada di luar konten rute agar pergantian tema tidak membuat ulang formulir.

`shared/lib/theme.js` memiliki controller per instance. Nilai `light` atau `dark` disimpan dengan key `kspps-theme`, diterapkan ke `<html data-theme>` dan `color-scheme`, lalu disinkronkan melalui event penyimpanan browser. Tanpa pilihan manual, tema mengikuti perangkat. Listener media dan penyimpanan dibersihkan saat komponen dilepas. Jika penyimpanan ditolak atau penuh, perubahan tema tetap bekerja pada laman tersebut.

Keempat HTML memuat `public/theme-preference.js` secara sinkron sebelum CSS agar tema awal sudah sesuai pilihan. Vite menyalin script publik ke `/theme-preference.js` pada build aplikasi dan memakai `./theme-preference.js` pada build Pages dengan base relatif. Pertahankan bootstrap dan controller tetap selaras; `tests/theme-preference.mjs` menguji kesamaan keduanya.

Token dasar serta permukaan portal berada di `shared/styles/portal.css`. Tampilan fitur memakai stylesheet bersama dan stylesheet tiap frontend. Jalankan `npm run test:theme` dari `source-lengkap/` untuk memeriksa perilaku tema, lalu build frontend/Pages dan periksa tampilan browser bila warna atau posisi tombol berubah.

## Tanggung jawab file

- `components/**/*.svelte`: halaman dan komponen utama.
- `features/<fitur>/views/*.svelte`: markup tabel/formulir/dialog dalam snippet Svelte bernama. Bagian terkait berada dalam satu file agar tidak perlu membuka banyak fragmen kecil.
- `features/<fitur>/*.js`: persiapan data dan tindakan pengguna. `view()`/`snippetView()` hanya menyusun komponen Svelte beserta props, bukan string HTML.
- `shared/lib/formatters.js`, `view-helpers.js`, `icons.js`, `status-colors.js`: format rupiah/tanggal, komponen umum, ikon, dan warna status.
- `shared/runtime/`: masa hidup portal, store, transport, dan region Svelte. `Region` menerima pembaruan data; controller tidak mengganti HTML DOM.
- `shared/features/workflow/client.js`: HTTP, header pemilik berkas, decoding respons, dan error. Tidak menyimpan state atau merender UI.
- `shared/features/workflow/coordinator.js`: menyinkronkan respons ke state dan memberi tahu fitur di instance portal yang sama.
- `shared/create-portal.js`: merakit layanan per portal dan menyediakan `dispose()`. Tidak ada singleton layanan global.
- `shared/preview/`: adapter pratinjau statis. Mengembalikan data kosong, menolak penyimpanan/unggahan, dan tidak memanggil API.

## Memperbaiki bug

1. Cari fitur pada tabel di atas. Ubah markup di `.svelte`, bukan file hasil build.
2. Untuk bug interaksi, buka controller/events fitur tersebut. Dependensi antarfitur diakses melalui instance `app`, bukan `window`.
3. Untuk nominal, izin, atau status tersimpan, periksa handler backend dan tes domain yang terkait.
4. Daftarkan listener/timer melalui `app.scope`; lepaskan resource per komponen ketika komponen selesai digunakan.
5. Jalankan tes fitur, kemudian `npm test` dan build. Tes arsitektur menolak `{@html}`, penulisan `innerHTML`, import melingkar, dan layanan global.

## Publikasi

Sumber Svelte yang sama menghasilkan aplikasi dengan backend (`dist/`) dan pratinjau aman (`dist-preview/`). Folder `docs/` di repository GitHub adalah hasil build, bukan sumber portal terpisah. Gunakan `npm run build:pages` dari root repository untuk memperbaruinya. File `CNAME` dipertahankan saat ekspor.

## Batas validasi

Tes UI berjalan melalui DOM simulasi, termasuk 40 perbandingan struktur halaman, formulir yang sedang diisi, isolasi peran, dan mode statis tanpa jaringan. Pengujian ini tidak menggantikan pemeriksaan visual browser nyata. Login email/kata sandi mandiri belum diaktifkan oleh refactor ini; hosting aplikasi tetap memakai identitas yang didukung backend.
