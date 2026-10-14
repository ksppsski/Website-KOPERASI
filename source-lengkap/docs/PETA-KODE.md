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
| Masalah akses akun                | `frontend-petugas/src/components/staff-access/StaffAccess.svelte`                               | `frontend-petugas/src/features/staff-access/controller.js`                                                    | `backend/src/access.js`, `backend/src/http/routes/accounts.js`             |

Favicon tab mengikuti mode perangkat: `public/favicon-theme.js` memilih versi terang/gelap. Aset SVG dihasilkan oleh `scripts/generate-favicons.mjs` dari logo asli dalam `public/assets/`. Jalankan `npm run generate:favicons` setelah mengganti logo; jangan mengedit data gambar di dalam SVG secara manual. Keempat HTML pembuka memakai konfigurasi yang sama.

Semua path pada tabel dihitung dari akar project aplikasi. Di repository GitHub ekspor, akar aplikasi berada di **`source-lengkap/`**.

## Batas tanggung jawab

- **`components/*.svelte`**: markup halaman, isian, dan state lokal komponen. Kartu dan tabel baru ditulis dengan `{#each}`, `{#if}`, props, dan komponen Svelte.
- **`features/<fitur>/controller.js`**: membuat state dan merakit modul fitur. Cari implementasi tindakan di file yang namanya sesuai tindakan tersebut.
- **`client.js`**: permintaan HTTP, header portal, dan hasil/error dari server.
- **`queries.js`**: mengambil dan menyiapkan data untuk ditampilkan.
- **`presentation.js`, `*-views.js`**: renderer tampilan yang masih dipakai dialog dan tabel dinamis lama. Nilai dari pengguna tetap harus di-escape.
- **`dialogs.js`, `*-form.js`**: membuka formulir, validasi isian, dan penanganan unggahan.
- **`events.js`, `*-events.js`**: handler klik, perubahan isian, pengiriman formulir, dan penyegaran data.
- **`shared/services/*.js`**: antarmuka fitur yang diimpor secara eksplisit. Implementasi didaftarkan controller; state tidak disalin ke layanan lain. Kode aplikasi tidak membaca `window.Kspps...`.
- **`backend/src/http/router.js`**: autentikasi umum, pemilihan anggota yang berhak diakses, dan distribusi request.
- **`backend/src/http/routes/`**: endpoint akun, avalist, laporan, Finance, serta penyelesaian/pengembalian.
- **`backend/src/features/<fitur>/`**: proses dan aturan server. Pemeriksaan role, kepemilikan, versi data, dan transaksi tetap berlaku di sini atau pada modul aturan yang dipanggilnya.

Modul saling memakai antarmuka yang jelas. “Independen” berarti tanggung jawab dan ketergantungannya terpisah serta tidak melingkar; aturan keuangan bersama tetap mempunyai satu sumber agar hasil antarportal konsisten.

## Contoh menelusuri masalah

**Fee avalist salah pada satu bulan:** mulai dari `monthlyAvalistFees` di `backend/src/features/avalist/schedule.js`. Periksa data yang diberikan `queries.js`, lalu label/filter bulan pada `PersonalView.svelte`. Hak fee berdasarkan bulan jatuh tempo; pembayaran berdasarkan tanggal transfer.

**Bukti transfer pendaftaran tidak terbaca:** mulai dari `registration-proof.js`. Jika berkas lolos pemeriksaan browser tetapi ditolak server, lihat `backend/src/http/validation.js` dan `backend/src/features/registration/service.js`.

**Manajer tidak bisa menyetujui perubahan avalist:** mulai dari `ApproveProposal.svelte`, lalu endpoint pada `backend/src/http/routes/avalist.js` dan `changeAssignment` di `backend/src/features/avalist/assignments.js`.

## Menambah fitur

1. Buat komponen `.svelte` dalam portal pemilik fitur. Berikan data dan callback melalui props.
2. Letakkan pengambilan data dan tindakan browser pada folder fitur yang sama. Gunakan parameter bernama saat modul memerlukan state atau callback dari controller.
3. Tambahkan rute pada `Portal.svelte`/`FeaturePage.svelte` atau menu pada `features/staff/navigation.js`, sesuai portal.
4. Bila perlu endpoint, tambahkan handler pada `backend/src/http/routes/` dan implementasi di `backend/src/features/`. Periksa izin di server sebelum membaca/mengubah data.
5. Bila perlu perubahan skema, buat migrasi baru; migrasi yang sudah dijalankan tetap dipertahankan.
6. Jalankan uji fitur dan `npm test`, lalu `npm run build`.

Antarportal tidak boleh saling mengimpor implementasi. Komponen atau aturan murni yang benar-benar dipakai bersama ditempatkan di `shared/`. Hindari menyalin perhitungan fee, tanggal, atau validasi hak akses ke tiap halaman.

## Perintah untuk tim IT

```sh
npm ci
npm run dev
npm run check
npm run check:architecture
npm run test:portal
npm run test:avalist
npm test
npm run build
```

`npm run dev` menjalankan tampilan lokal; API dan autentikasi tetap memerlukan lingkungan backend yang sesuai. `npm run check:architecture` memeriksa batas portal, import melingkar, penggunaan global tersembunyi, dan panjang baris sumber. `npm test` mencakup pengujian regresi yang sudah ada, termasuk aturan keuangan dan otorisasi.

Gunakan `npm run format` setelah mengubah kode. Lebar format umum 100 karakter, dengan batas maksimum 180 karakter untuk satu baris source aplikasi. Komentar sebaiknya menjelaskan alasan aturan, bukan mengulang isi baris kode.

## Source dan hasil build

Buka file dalam `frontend-user/`, `frontend-petugas/`, `frontend-avalist/`, `shared/`, dan `backend/src/` ketika memperbaiki fitur. `dist/` dihasilkan oleh build. Pada ekspor GitHub, `docs/assets/` berisi hasil build pratinjau statis, sedangkan kode yang dipelihara berada dalam `source-lengkap/`.

Hasil build dapat dipadatkan dan memuat data font/gambar. Source yang dibaca tim IT tetap diformat dan dipisahkan per fitur. Perubahan hasil build akan tertimpa build berikutnya.

## Batas refactor ini

Sebagian dialog lama masih memakai renderer HTML yang sudah dipisahkan dan diformat; tidak semua dialog telah dimigrasikan menjadi komponen Svelte. Login mandiri dan fitur simulasi tetap mengikuti status sebelumnya. Refactor struktur tidak mengaktifkan fitur operasional baru.
