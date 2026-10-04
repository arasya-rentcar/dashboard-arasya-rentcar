# Rencana uji lengkap: API, dashboard, aplikasi driver

Disusun 3 Oktober 2026 dari kode `main` ketiga repo (API `f5bb7cb`, dashboard `fb847e6`, mobile `6aa3787`) dan `docs/HANDOFF.md`. Dokumen ini menggantikan daftar uji pendek di HANDOFF §0.5 dan §00.7; keduanya tercakup di sini.

**Status 4 Okt:** T1–T3 sudah diperbaiki dan dirilis (API arasya-rentcar/api-arasya-rentcar#2, dashboard arasya-rentcar/dashboard-arasya-rentcar#4). Uji API otomatis ada di repo API: `scripts/e2e/run-local.sh` (Postgres lokal + API asli, ±155 cek; hasil terakhir 154 lolos, 0 gagal, 2 "known" = T5). Yang tersisa: keputusan T4, dan T5 (P2).

**Status 4 Okt (sesi 2):** T4 diputuskan pemilik dan diperbaiki, T5 diperbaiki, plus fitur baru F1–F6 (lihat §1.1). API arasya-rentcar/api-arasya-rentcar#3: `run-local.sh` 230 lolos, 0 gagal, 0 known. Kasus yang menyebut "Tetapkan untuk Semua" (API-93/94, DSB-43/82, APP-11, E2E-1) sekarang usang: tombolnya disembunyikan dan semua cara menugaskan berperilaku sama.

Isi:
- [1. Temuan saat menyusun rencana ini](#1-temuan-saat-menyusun-rencana-ini) (5 bug terbukti; T1–T4 harus selesai atau diputuskan sebelum uji di HP)
- [2. Cara memakai dokumen ini](#2-cara-memakai-dokumen-ini)
- [3. Persiapan](#3-persiapan)
- [4. Peta status (acuan semua kasus)](#4-peta-status-acuan-semua-kasus)
- [5. Uji API](#5-uji-api)
- [6. Uji dashboard](#6-uji-dashboard)
- [7. Uji aplikasi driver (HP asli)](#7-uji-aplikasi-driver-hp-asli)
- [8. Skenario ujung ke ujung](#8-skenario-ujung-ke-ujung)
- [9. Syarat sebelum aplikasi dibagikan ke semua driver](#9-syarat-sebelum-aplikasi-dibagikan-ke-semua-driver)
- [10. Lampiran: query cek database](#10-lampiran-query-cek-database)

---

## 1. Temuan saat menyusun rencana ini

Semua di bawah ini **dibuktikan** di lingkungan lokal (Postgres 16 + API asli dari `main` + tiruan storage dan push), 3 Okt 2026 malam: 103 cek lolos dan 11 gagal; ke-11 kegagalan itu berasal dari T1–T4 di bawah. T5 ditemukan saat memeriksa ulang dokumen ini (dua cek tambahan).

### T1. Edit Order menghapus semua hari order yang sudah berjalan (P0) — DIPERBAIKI 4 Okt

- **Gejala.** Tombol **Edit Order** tampil untuk order `CREATED`, `ASSIGNED`, dan `IN_PROGRESS`. Form selalu mengirim `service_items`, dan API (`updateOrder`) menggantinya dengan `deleteMany` + `create`. Mengubah catatan saja pun sudah cukup memicunya.
- **Terbukti (cek C5–C11, E0):** pada order `IN_PROGRESS` dengan driver yang sudah berangkat, satu struk bensin disetujui, dan fee sudah **dibayar**:
  - hari diganti baris baru (id baru), status `SCHEDULED`, tanpa driver, mobil, fee, dan uang jalan;
  - payable yang **sudah dibayar** terhapus (cascade), jadi riwayat pembayaran fee hilang;
  - struk/biaya perjalanan terhapus;
  - laporan driver (foto, odometer, dan lain-lain) lepas dari harinya (`order_service_item_id` jadi null);
  - order tetap `IN_PROGRESS` padahal satu-satunya hari `SCHEDULED`;
  - di HP driver, tugas yang sedang berjalan hilang (404) dan antreannya dibuang, tanpa notifikasi;
  - driver tetap `ON_DUTY` walau tidak punya trip aktif, sehingga "Tetapkan untuk Semua" berikutnya ditolak "Driver is not available".
- **Juga menurut kode (tidak dijalankan):** hari rekanan menjadi hari internal (`is_external` kembali ke default `false`, vendor dan driver rekanan hilang); status konfirmasi WhatsApp per hari ikut hilang.
- **Sementara belum diperbaiki:** jangan pakai Edit Order setelah ada driver/rekanan di hari mana pun. Ubah per hari lewat **Edit Hari**.
- **Perbaikan (dirilis):**
  - Dashboard mengirim id setiap hari. API memperbarui hari berdasarkan id; hanya isi yang berubah yang ditulis (tanggal dibandingkan per hari WIB).
  - Hari yang sudah punya driver, mobil, perjalanan, laporan, biaya, uang jalan, tagihan, atau konfirmasi tidak bisa dihapus lewat Edit Order (409 dengan pesan jelas). Hari yang dibatalkan dan menyimpan data tetap tercatat.
  - Menghapus semua hari yang masih terbuka ditolak (pakai Batalkan Pesanan). Simpan dobel atau tab lain ditolak, bukan membuat hari ganda.
  - Memindah jam/tanggal/lokasi hari milik driver mengirim push "Jadwal tugas diubah" dan mengosongkan status konfirmasi supaya dikirim ulang.
  - Alasan perubahan harga diminta tepat saat harga hari diubah.

### T2. Revisi invoice yang belum dibayar mengubah status bayar (P0) — DIPERBAIKI 4 Okt

- `reviseInvoice` menghitung `payment_status` dari total yang **ditagihkan**, bukan uang yang diterima.
- **Terbukti (A5, A6):** order Rp 1.000.000, invoice DP Rp 200.000 diterbitkan tetapi belum dibayar. Setelah DP direvisi ke Rp 250.000, `payment_status` = `DP_PAID` walau `paid_to_date` = 0, dan driver **bisa ditugaskan** (aturan DP pemilik terlewati).
- **Juga menurut kode:** revisi invoice FULL yang belum dibayar menjadikan `PAID`. GA4 `purchase` untuk order dari lead ikut terkirim tanpa ada pembayaran.
- "Mulai perjalanan" tetap aman karena memakai `paid_to_date`.
- **Perbaikan (dirilis):**
  - Revisi tidak lagi mengubah `payment_status`, dan `payment_status` tidak bisa diisi lewat `PUT /orders/:id`.
  - Satu aturan dipakai di semua tempat: status = uang diterima (dikurangi refund) dibanding total order. Akibatnya status ikut berubah saat total naik/turun (lihat N2).
  - Revisi yang bersamaan dengan pembayaran tidak bisa menimpa invoice yang baru dibayar. `total_billed` pelanggan ikut berubah.

### T3. Klik ganda "Tandai Terbayar" mencatat pembayaran dua kali (P1) — DIPERBAIKI 4 Okt

- **Terbukti (G1, G2):** dua permintaan bersamaan untuk invoice yang sama menghasilkan **dua kwitansi** (dua nomor) dan `total_paid` pelanggan bertambah dua kali (Rp 400.000 untuk DP Rp 200.000).
- `paid_to_date` order tetap benar, karena dihitung ulang dari kwitansi invoice lain ditambah pembayaran ini.
- **Perbaikan (dirilis):**
  - Invoice berubah menjadi PAID secara bersyarat, lalu baris order dikunci. Hanya satu permintaan yang menulis kwitansi (nomor tanpa celah) dan totalnya.
  - Dua invoice yang dibayar bersamaan dihitung keduanya. Uang pada invoice yang dibatalkan oleh pembatalan order tetap dihitung.
  - Push "sudah lunas" terkirim sekali. PDF kwitansi dibuat setelah tersimpan.

### T4. Dua cara menugaskan driver menghasilkan keadaan berbeda (P1) — DIPUTUSKAN & DIPERBAIKI 4 Okt

**Keputusan pemilik (4 Okt):** satu cara menugaskan. (1) Memberi driver ke satu hari otomatis membuat hari itu `ASSIGNED`. (2) Aplikasi selalu meminta "Terima tugas" sampai driver menekannya (`driver_accepted_at`). (3) Driver `ON_DUTY` (mobil `IN_USE`) hanya pada hari WIB tripnya atau selama trip berjalan; ketersediaan dicek per tanggal/jam. (4) Tombol "Tetapkan untuk Semua" disembunyikan di dashboard ("Ganti Semua" dan per hari tetap).

**Perbaikan (dirilis):** semua jalur menugaskan sama; penerimaan dihapus bila driver diganti; ketersediaan dicek di dalam transaksi dengan kunci driver/mobil (dua admin tidak bisa memesan driver yang sama); status driver/mobil disegarkan saat start dan tiap 10 menit (`RESOURCE_STATUS_REFRESH_ENABLED`). Driver `OFF` / mobil `MAINTENANCE` tetap ditolak. Hari rekanan tidak ikut aturan ASSIGNED otomatis. Belum: memindah jam/tanggal hari yang sudah punya driver tidak dicek bentrok (perlu keputusan).

Temuan awal (sebelum perbaikan), untuk arsip:

Terbukti (B3–B15):

| | **Per hari** (Edit Hari, laci hari di Jadwal) | **Tetapkan untuk Semua** (halaman order) |
|---|---|---|
| Status hari | tetap `SCHEDULED`, kecuali admin mengganti pilihan Status ke "Ditugaskan" | `ASSIGNED` |
| Status order | tetap `CREATED` | `ASSIGNED` |
| Status driver | tetap `AVAILABLE` | `ON_DUTY` sejak hari ditugaskan, walau tripnya minggu depan |
| Aplikasi | kartu "Tugas baru", tombol **Terima tugas** muncul | `tripState.isAccepted()` menganggap `ASSIGNED` = sudah diterima: tombol **Terima tugas tidak pernah muncul**, chip "Diterima", padahal `accepted_at` kosong. Badge angka di tab Tugas hanya menghitung trip `SCHEDULED`. |
| Ganti Semua | ditolak 409 ("No assignable lines…") | bisa |
| Order lain | driver tetap bisa dipakai | driver tidak bisa "Tetapkan untuk Semua" di order lain, tanggal berbeda pun ("Driver is not available"); per hari tetap bisa |

HANDOFF §0.4 menulis "Edit baris → trip menjadi ASSIGNED", padahal itu hanya terjadi bila admin mengganti Status secara manual.

**Perlu keputusan:**
1. Apakah menugaskan per hari otomatis menjadikan hari `ASSIGNED`?
2. Apakah aplikasi tetap meminta "Terima tugas" untuk trip `ASSIGNED` (`isAccepted` cukup melihat `accepted_at`)?

Sampai diputuskan, uji §7 dijalankan untuk **kedua** cara.

### T5. Edit Hari tidak dikunci pada order Selesai atau Dibatalkan (P2) — DIPERBAIKI 4 Okt

**Perbaikan (dirilis):** semua perubahan hari pada order `DONE`/`CANCELLED` ditolak 409 ("Order ini sudah selesai/dibatalkan…"): Edit Hari, Ganti Semua, Tetapkan untuk Semua, assign lewat bot, Edit Order. Tetap boleh: tinjau biaya perjalanan, bayar driver/rekanan di Utang, invoice, pembayaran, refund, catatan keuangan, kirim konfirmasi. Dashboard menonaktifkan tombol ubah hari dengan alasannya. Impor sheet ulang masih mengganti hari (alat impor, dibiarkan).

Temuan awal:

- Komentar di API sendiri (`assertOrderStructurallyEditable`) menyatakan hari pada order `DONE`/`CANCELLED` tidak boleh diubah, tetapi `PUT /schedule/lines/:id` tidak memeriksanya.
- **Terbukti:**
  - hari dari order yang sudah difinalisasi bisa dikembalikan ke `IN_PROGRESS` (order tetap `DONE`). Hari itu akan muncul lagi di daftar Tugas driver, karena daftar aktif memuat semua trip `IN_PROGRESS`.
  - hari dari order yang dibatalkan bisa kembali ke `SCHEDULED` (order tetap `CANCELLED`).
- Yang sudah aman: fee, uang jalan, dan driver hari yang sudah dibayar tetap terkunci (409).
- **Usulan perbaikan:** tolak perubahan hari bila order `DONE`/`CANCELLED`, kecuali perubahan yang memang sah sesudah selesai (bila ada, sebutkan satu per satu).

### 1.1 Fitur baru 4 Okt dan kasus ujinya

Diminta pemilik 4 Okt; dirilis bersama perbaikan T4/T5 (API #3, lalu dashboard dan aplikasi).

| ID | Fitur | Langkah | Hasil yang diharapkan |
|---|---|---|---|
| NEW-01 | F1 notifikasi biaya | Driver kirim struk/biaya dari aplikasi | Lonceng dashboard bertambah dalam ±15 detik; item kuning "Biaya perjalanan baru: Tol Rp … — perlu ditinjau", klik membuka order |
| NEW-02 | F4 notifikasi status | Driver: Terima tugas → Berangkat → Sampai → Mulai perjalanan → Selesai | Tepat satu notifikasi per langkah (kirim ulang/tanpa sinyal tidak menggandakan); halaman order/Trip yang terbuka ikut diperbarui; judul tab "(N) …" |
| NEW-03 | F4 laporan | Driver kirim Foto/Catatan | Notifikasi "laporan" di lonceng dan halaman Notifikasi |
| NEW-04 | F4 baca | Klik satu item; "Tandai semua dibaca" | Badge turun; status baca per admin (admin lain tetap belum baca) |
| NEW-05 | F5 e-toll | Isi "Kartu e-toll" driver di menu Driver; di aplikasi Profil → "Minta top-up e-toll" (saldo + catatan opsional) | Notifikasi "… minta top-up e-toll" dengan kartu dan saldo; halaman Notifikasi → "Permintaan driver" |
| NEW-06 | F5 ulang | Tekan lagi saat masih menunggu; tanpa sinyal lalu sinyal kembali | Tidak ada permintaan ganda ("Sudah diminta … menunggu admin"); terkirim sekali setelah sinyal kembali |
| NEW-07 | F5 selesai | Admin "Tandai sudah top-up" (catatan opsional) | Driver dapat push + kotak masuk "Top-up e-toll sudah diproses"; klik kedua ditolak (409) |
| NEW-08 | F2 checkpoint | Foto/Catatan di beberapa lokasi | Kamera GPS dengan cap waktu, driver, nama tempat, koordinat; label "Checkpoint 1, 2, …" di foto dan daftar laporan |
| NEW-09 | F6 nama tempat | Foto sampai lokasi dan checkpoint, dengan sinyal | Nama jalan/kelurahan/kota di atas koordinat (di foto, aplikasi, dashboard). Tanpa sinyal: hanya koordinat, tidak error |
| NEW-10 | F6 cadangan | Foto checkpoint terkirim tanpa cap dari HP | Server memberi cap yang sama seperti foto sampai lokasi |
| NEW-11 | F3 biaya ditagih | Biaya "Dibayar driver" + centang "Ditagih ke pelanggan (Invoice Tambahan)" | Driver tetap diganti lewat fee; pelanggan ditagih di Invoice Tambahan; ringkasan panel "Yang bayar dulu" / "Akhirnya ditanggung" tidak tampak dobel. Bila dibayar e-toll/kartu kantor pilih "Dibayar kantor" (tidak jadi utang ke driver) |
| NEW-12 | T4 | Tugaskan driver per hari untuk minggu depan | Hari `ASSIGNED`, order `ASSIGNED`, driver tetap "Tersedia" sampai hari H; aplikasi menampilkan "Terima tugas"; driver yang sama bisa ditugaskan di tanggal lain, ditolak bila jamnya bentrok |
| NEW-13 | T5 | Order Selesai/Dibatalkan: buka Edit Hari / Trip | Tombol ubah hari nonaktif dengan alasan; API menolak 409 |

### 1.2 Kartu e-toll kantor (5 Okt) dan kasus ujinya

Kartu e-toll kantor sekarang satu daftar bersama (±10 kartu, campuran bank). Driver mengambil kartu saat berangkat dan mengembalikannya saat kembali ke garasi. Uji API otomatis: grup N di `scripts/e2e/run-local.sh`.

| ID | Langkah | Hasil yang diharapkan |
|---|---|---|
| ETL-01 | Dashboard → Kartu E-Toll → Tambah kartu (bank, nama, nomor 16 angka, saldo sekarang) | Kartu tampil "Di kantor" dengan perkiraan saldo; nomor sama dua kali ditolak "Nomor kartu sudah terdaftar" |
| ETL-02 | Aplikasi (APK baru): Profil → Kartu e-toll → "Ambil kartu", pilih kartu, saldo opsional | Dashboard: kartu "Dipegang <driver> sejak …", notifikasi "… mengambil kartu e-toll …"; aplikasi hanya menampilkan 4 angka terakhir |
| ETL-03 | Driver lain mengambil kartu yang sama | Kartu pindah; riwayat "Lepas dari … : diambil driver lain"; notifikasi menyebut "sebelumnya dipegang …" |
| ETL-04 | Driver: "Minta top-up" untuk kartu yang dipegang (sisa saldo opsional) | Permintaan tercatat dengan kartu; saldo yang diketik jadi "Cek saldo" di riwayat; driver lain yang meminta kartu yang sama mendapat "masih menunggu admin" |
| ETL-05 | Admin: Notifikasi → "Tandai sudah top-up", isi nominal (dan saldo sesudahnya bila tahu) | Riwayat kartu "Top-up +Rp …", perkiraan saldo naik; driver dapat push "… sudah diisi Rp …" + pengingat update saldo kartu (tempel kartu) |
| ETL-06 | Permintaan dari APK lama tanpa kartu | Dialog meminta memilih kartu; nominal wajib |
| ETL-07 | Admin: Catat saldo / Catat tol / Batalkan catatan | Perkiraan saldo dihitung ulang; catatan yang dibatalkan tetap terlihat dicoret |
| ETL-08 | Driver: "Kembalikan kartu" (saldo opsional) | Kartu "Di kantor"; tanpa sinyal: terkirim sekali saat sinyal kembali |
| ETL-09 | Admin: Nonaktifkan kartu yang sedang dipegang (alasan "Hilang") | Kartu lepas dari driver, permintaan top-up yang menunggu dibatalkan, kartu hilang dari daftar di aplikasi; Hapus hanya untuk kartu tanpa riwayat |
| ETL-10 | Aplikasi: Profil → "Tes kartu NFC" (HP dengan NFC) | Menampilkan apa yang terbaca dari kartu (nomor, saldo, data mentah) dan tombol Bagikan; tidak menulis apa pun ke kartu |

### Catatan lain (bukan bug, tetapi penguji perlu tahu supaya tidak salah lapor)

| # | Perilaku | Bukti |
|---|---|---|
| N1 | `payment_status` (badge "Terbayar") dihitung dari harga final termasuk biaya tambahan, sedangkan "Mulai perjalanan" hanya butuh uang ≥ harga sewa hari yang tidak dibatalkan. Order bisa "DP Terbayar" di dashboard sementara aplikasi sudah membuka "Mulai perjalanan". | kode `startPayment` |
| N2 | (Berubah 4 Okt) `payment_status` sekarang ikut total order: bila total naik karena hari atau biaya tambahan, order "Terbayar" kembali menjadi "DP Terbayar" sampai tambahan dibayar. Order hasil import sheet yang tercatat terbayar tanpa `paid_to_date` tetap statusnya. | e2e A9, J5, G20 |
| N3 | Melepas driver dari hari (tanpa pengganti) mengirim push berjudul "Tugas dialihkan" dengan teks "dialihkan ke driver lain". | B9 |
| N4 | Pembatalan tier 2 (50%) berlaku sampai pukul **10.00 lewat 59 detik** (menit 00 masih dihitung) dan hanya melihat `trip_started_at`. Driver yang menandai "Sampai" tanpa "Berangkat" lewat API tidak membuat tier 3; aplikasi selalu mewajibkan Berangkat lebih dulu. | kode `computeCancellationPenalty` |
| N5 | Tidak ada menu di dashboard untuk membuat **akun login** driver baru. Tambah Driver hanya memilih akun berperan DRIVER yang sudah ada (`POST /users` lewat API atau SQL). | kode `driversPage` |
| N6 | `scripts/e2e-test-orders.js` di repo API sudah usang (memanggil `/trips/:id/next-status` yang sudah tidak ada). Jangan dipakai. | kode |
| N7 | Hari yang sudah dimulai tetap menyimpan driver dan fee setelah order dibatalkan; hari yang belum dimulai dilepas dengan fee 0. | J8, E2 |
| N8 | Trip yang lebih tua dari kemarin (WIB) dan belum ditutup tidak tampil di daftar aplikasi, tetapi masih bisa dibuka lewat ketukan notifikasi. | J9–J11 |

---

## 2. Cara memakai dokumen ini

- **ID kasus:** `API-…` (dijalankan dengan curl/skrip), `DSB-…` (dashboard di browser), `APP-…` (aplikasi di HP), `E2E-…` (lintas sistem).
- **Prioritas:** **P0** wajib lolos sebelum aplikasi dibagikan; **P1** wajib sebelum dipakai sehari-hari; **P2** bila sempat.
- **Kolom "Lokal 3 Okt":** ✅ lolos di uji lokal (kode cek dalam kurung = id cek di `scripts/e2e/flows.mjs` repo API); ❌ gagal karena bug yang belum diperbaiki (T5); ✅ fix = gagal pada 3 Okt, lolos setelah perbaikan 4 Okt; kosong = belum dijalankan (kebanyakan karena perlu HP atau tampilan).
- **Hasil yang diharapkan** ditulis menurut kode dan keputusan pemilik di HANDOFF §4. Kasus yang bertentangan dengan keputusan pemilik ditandai.
- Satu orang mencatat hasil per ID: ✅ / ❌ + tangkapan layar atau baris DB. Kegagalan baru dicatat di HANDOFF.

---

## 3. Persiapan

### 3.1 Lingkungan lokal (untuk API, dan dashboard terhadap data uji)

Cara cepat: `scripts/e2e/run-local.sh` di repo API menjalankan semua langkah di bawah dan ±155 cek API (lihat `scripts/e2e/README.md`). Resep manual (detail ada di `CLAUDE.md` repo API):

1. Postgres 16: `initdb` di `/var/tmp`, jalankan di port 5433 (`-k /var/tmp/...`), `createdb arasya`, lalu `prisma migrate deploy`.
2. API: `npm ci`, `prisma generate`, `npm run build`, lalu jalankan `node dist/src/server.js` dengan:
   - `PORT`, `JWT_SECRET`;
   - `SUPABASE_URL` diarahkan ke server tiruan lokal yang menjawab `POST /storage/v1/object/...` dan `/object/sign/...`;
   - `EXPO_PUSH_URL` ke tiruan yang menyimpan setiap push (supaya isi notifikasi bisa dicek);
   - `CONFIRMATION_SWEEP_ENABLED=false`, `GA4_*` kosong.
3. Admin: satu baris `users` dengan hash bcrypt. Driver: `POST /users` (role DRIVER) → `POST /drivers` → `PUT /drivers/:id/app-password` → login dengan nomor HP.
4. Dashboard terhadap API lokal: `NEXT_PUBLIC_API_URL=http://localhost:<port>/api/v1 npx next build && npx next start -p 3100`.
5. Aplikasi (web, untuk alur tanpa HP): `node scripts/mock-api.mjs` atau API lokal, `EXPO_OFFLINE=1 npx expo export --platform web`, lalu Playwright Chromium dengan kamera palsu dan izin `geolocation` + `camera` (lihat `CLAUDE.md` mobile).
6. Uji tanggal: hari layanan dibuat relatif terhadap **hari ini WIB** (`…T00:00:00+07:00`), jangan dari `toISOString()`.

### 3.2 Produksi + HP asli (uji §7 dan §8)

| Kebutuhan | Isi |
|---|---|
| APK | build `d603a395…` (HANDOFF §1) dipasang **di atas** APK lama (sekalian menguji upgrade, APP-85) |
| HP 1 | driver uji **Sutan Arief** (nomor unik pemilik), notifikasi aktif, baterai "Tanpa pembatasan", lokasi aktif |
| HP 2 | driver uji kedua (buat akun lewat `POST /users` + Tambah Driver, nomor HP unik, atur password). Perlu untuk kasus alih tugas. |
| Mobil | 3 mobil internal `AVAILABLE` (bulk assign menolak mobil yang `IN_USE`) |
| Pelanggan | `TEST UJI APLIKASI` + nomor HP pemilik; kode order uji dicatat di lembar hasil |
| Bukti bayar | tangkapan layar apa saja (JPG/PNG/PDF ≤ 10 MB) |
| Pengecek DB | Claude (konektor Supabase, izin baca/SQL dari pemilik) mengecek `order_service_items`, `trip_reports`, `expenses`, `payables`, `driver_notifications` di setiap langkah |
| Lokasi | satu titik jemput yang bisa didatangi (untuk foto GPS asli), satu tempat tertutup (GPS lemah) |

**Aturan data uji:**
- Nama pelanggan diawali `TEST`, catatan order "UJI APLIKASI".
- Jangan memakai Batalkan Pesanan untuk membersihkan data. Itu juga membuat invoice denda; bersihkan di akhir dengan SQL seperti HANDOFF §0.3, termasuk file di bucket `invoices`, `payment-proofs`, `driver-reports`.
- Edit Order aman dipakai pada order yang sudah punya driver sejak perbaikan T1 (4 Okt).

### 3.3 Pembagian peran saat uji

| Peran | Tugas |
|---|---|
| Admin (laptop) | dashboard.haikuy.com |
| Driver HP 1 / HP 2 | aplikasi |
| Pencatat | lembar hasil per ID, jam tiap langkah (WIB) |
| Claude | cek DB setiap langkah, membaca log bila gagal |

---

## 4. Peta status (acuan semua kasus)

### 4.1 Status hari (`line_status`) dan siapa yang mengubahnya

| Dari → ke | Oleh | Syarat |
|---|---|---|
| (baru) → `SCHEDULED` | Buat Order, Edit Order (T1) | – |
| `SCHEDULED` → `ASSIGNED` | Tetapkan untuk Semua; Edit Hari bila Status dipilih "Ditugaskan" | driver internal: order `DP_PAID`/`PAID` |
| `SCHEDULED`/`ASSIGNED` → `IN_PROGRESS` | app **Berangkat**; app **Mulai perjalanan** (bila Berangkat dilewati); Edit Hari | Mulai perjalanan: lunas sewa |
| `*` → `DONE` | app **Selesai**; Edit Hari | app: lunas sewa bila belum "Mulai perjalanan"; tidak dari `CANCELLED` |
| `*` → `CANCELLED` | Batalkan Pesanan (semua hari), Edit Hari (satu hari) | – |
| `DONE`/`CANCELLED` → lain | Edit Hari (admin) | tidak dikunci API, juga pada order Selesai/Dibatalkan (T5); uji API-103, DSB-54 |

"Terima tugas" hanya mengisi `driver_accepted_at`. "Sampai di lokasi jemput" hanya mengisi `actual_pickup_at`. Keduanya tidak mengubah status.

### 4.2 Status order (diturunkan dari hari)

- Semua hari dibatalkan → `CANCELLED`.
- Ada hari `IN_PROGRESS` → `IN_PROGRESS`.
- Ada hari `ASSIGNED` → `ASSIGNED`.
- Semua hari aktif `DONE` → `IN_PROGRESS` + "Menunggu Finalisasi".
- Selain itu → `CREATED`.
- `DONE` hanya lewat **Finalisasi**. Setelah `DONE` atau `CANCELLED`, status tidak berubah lagi oleh edit hari.

### 4.3 Uang

| Nilai | Berubah saat | Membuka |
|---|---|---|
| `payment_status` UNPAID → DP_PAID → PAID | invoice ditandai terbayar (dan, karena T2, saat revisi) | penugasan driver internal (DP_PAID/PAID) |
| `paid_to_date` | invoice ditandai terbayar (jumlah diterima) | "Mulai perjalanan" bila ≥ harga sewa hari yang tidak dibatalkan (`start_ready` / `payment_ready`) |
| Payable driver | dibuat saat driver pertama ditugaskan, total = fee + ganti biaya disetujui − uang jalan + extras | Utang; terkunci setelah TERBAYAR |

### 4.4 Langkah berikutnya di aplikasi (`nextAction`)

1. Trip `DONE`/`CANCELLED` → tidak ada tombol.
2. Belum diterima (`accepted_at` kosong **dan** status `SCHEDULED`, lihat T4) → **Terima tugas**.
3. Belum berangkat → **Berangkat dari garasi**.
4. Belum sampai → **Sampai di lokasi jemput** (kamera GPS).
5. `customer_onboard_at` kosong → **Mulai perjalanan**, terkunci bila `payment_ready=false`, dengan tombol WhatsApp admin.
6. Lainnya → **Selesai**.

---

## 5. Uji API

Bisa dijalankan dengan curl atau skrip terhadap API lokal (§3.1). Dengan HP, sebagian besar kasus ini juga teruji lewat §7 dan §8.

### 5.1 Sesi, peran, batas

| ID | P | Kasus | Hasil yang diharapkan | Lokal 3 Okt |
|---|---|---|---|---|
| API-01 | P0 | Login admin email | 200 + token (berlaku `JWT_EXPIRES_IN`, bawaan 7 hari) | ✅ |
| API-02 | P0 | Login driver dengan `08…`, `628…`, `+62 8xx-…`, spasi/titik/kurung | 200, token 90 hari | ✅ (F1) |
| API-03 | P0 | Kata sandi salah / nomor tidak terdaftar | 401 "Nomor HP/email atau kata sandi salah" | ✅ (F2) |
| API-04 | P1 | Nomor dipakai >1 driver (data lama): sandi benar / salah | 409 "terdaftar untuk lebih dari satu driver" / 401 biasa | |
| API-05 | P1 | 21 login gagal dalam 15 menit dari satu IP | 429 (yang berhasil tidak dihitung) | |
| API-06 | P0 | Token driver ke API admin (`/orders`) | 403 | ✅ (F3) |
| API-07 | P0 | Token admin ke `/driver/*` | 403 | ✅ (F4) |
| API-08 | P1 | Akun DRIVER tanpa profil driver ke `/driver/me` | 403 "Driver profile not found" | |
| API-09 | P1 | Tanpa token / token rusak / kedaluwarsa | 401; aplikasi keluar sendiri dan menyimpan antrean (APP-08) | |
| API-10 | P2 | `/health` | 200 tanpa token, tidak dicatat di log | |
| API-11 | P2 | >1000 permintaan / 15 menit ke `/api/*` | 429 | |
| API-12 | P1 | `/api/v1/bot/*` tanpa token bot | 401 (bot sudah pensiun; cukup cek tertutup) | |
| API-13 | P1 | CORS: Origin dashboard / origin lain | diizinkan / ditolak; tanpa Origin (aplikasi) tetap jalan | |

### 5.2 Driver, mobil, perangkat

| ID | P | Kasus | Hasil yang diharapkan | Lokal |
|---|---|---|---|---|
| API-20 | P0 | Simpan nomor HP driver yang sudah dipakai driver lain (dalam bentuk `628…`) | 409 "sudah dipakai driver lain"; disimpan sebagai `08…` | ✅ (F5) |
| API-21 | P1 | Simpan ulang nomor sendiri dengan format lain | 200 | |
| API-22 | P0 | Atur password aplikasi (<6 karakter / ≥6) | 400 / 200; password lama tidak berlaku | |
| API-23 | P1 | Daftar perangkat `POST /devices` token Expo valid / `abc` | 204 / 400 | ✅ (K5) |
| API-24 | P1 | Token yang sama didaftarkan driver lain (ganti akun di satu HP) | token pindah ke user baru; driver lama tidak dapat push lagi | |
| API-25 | P2 | `DELETE /devices` token milik user lain | tidak terhapus (204) | |
| API-26 | P1 | Push Expo menjawab `DeviceNotRegistered` | token dihapus dari `device_tokens` | |
| API-27 | P2 | Mobil `MAINTENANCE` / driver `OFF` | tidak diubah otomatis oleh sinkron status; ditolak "not available" di Tetapkan untuk Semua | |

### 5.3 Lead website

| ID | P | Kasus | Hasil yang diharapkan | Lokal |
|---|---|---|---|---|
| API-30 | P0 | `POST /public/leads` dari origin website | 204, lead `NEW`, push "Lead website baru" ke admin | ✅ (H1, H2) |
| API-31 | P0 | Kirim ulang `lead_code` sama | 204, tetap satu baris | ✅ (H1) |
| API-32 | P1 | Isi tidak valid (kode bukan `ARS-XXXXX`, nama kosong) | 204 tetapi tidak disimpan (dicatat di log) | ✅ (H3) |
| API-33 | P1 | Honeypot `website` terisi | 204, tidak disimpan | ✅ (H4) |
| API-34 | P1 | Body `text/plain` (sendBeacon) | disimpan | ✅ (H5) |
| API-35 | P2 | 31 kiriman / 15 menit dari satu IP | 429 | |
| API-36 | P0 | Buat order dengan `web_lead_id` | `order_code` = kode lead, lead `CONVERTED` | ✅ (H6, H7) |
| API-37 | P1 | Kode lead sudah dipakai order lain | order memakai kode biasa | |
| API-38 | P1 | Order kedua dari lead yang sama | 409 "Lead is already linked" | ✅ (H9) |
| API-39 | P1 | Abaikan lead `CONVERTED` / buka lagi lead `IGNORED` | 409 / `NEW` | ✅ (H8) |
| API-40 | P1 | Hubungkan lead ke order yang sudah ada / yang sudah punya lead lain | kode order tidak berubah / 409 | |
| API-41 | P0 | GA4: invoice pertama order-dari-lead ditandai terbayar (dengan `ga_client_id`) | satu event `purchase`; `purchase_reported_at` terisi; pembayaran berikutnya tidak mengirim lagi | |
| API-42 | P1 | GA4 menolak (non-2xx) | klaim dilepas (`purchase_reported_at` null), dicoba di pembayaran berikutnya | |
| API-43 | P0 | Revisi invoice yang belum dibayar pada order-dari-lead | tidak mengirim `purchase` | ✅ fix (revisi tidak memanggil GA4) |

### 5.4 Pelanggan dan data pribadi

| ID | P | Kasus | Hasil yang diharapkan | Lokal |
|---|---|---|---|---|
| API-50 | P0 | NIK 15 digit / huruf / 16 digit / kosong | 400 / 400 / 200 / dihapus | |
| API-51 | P0 | Daftar pelanggan, lookup nomor, daftar order | hanya `id_number_masked` (4 + 8 bintang + 4); NIK penuh hanya di detail pelanggan | |
| API-52 | P1 | Cari dengan NIK lengkap | pelanggan ditemukan, hasil tetap tersamar | |
| API-53 | P0 | Unggah dokumen KTP (JPG/PDF ≤10 MB), GIF, >10 MB | 200 / 415 / 413; file di bucket privat `customer-docs/<id>/` | |
| API-54 | P0 | URL dokumen | URL bertanda tangan 5 menit; setelah 5 menit ditolak storage | |
| API-55 | P1 | Hapus dokumen | baris hilang, file dihapus (best effort) | |
| API-56 | P1 | Tandai terverifikasi / batalkan | `id_verified_at/by` terisi / kosong | |
| API-57 | P1 | Buat pelanggan dengan nomor yang sudah ada (bentuk lain) | 409 | |
| API-58 | P0 | Endpoint lain (order, jadwal, driver app, payable) | tidak pernah mengirim objek `customer` lengkap / NIK | |

### 5.5 Order: buat, ubah, keuangan

| ID | P | Kasus | Hasil yang diharapkan | Lokal |
|---|---|---|---|---|
| API-60 | P0 | Buat order 1 hari / 3 hari (satu baris per hari) | hari `SCHEDULED`, harga final = jumlah hari, pelanggan dibuat/dipakai dari nomor HP | ✅ |
| API-61 | P1 | Buat order tanpa `service_items` | satu hari default dari `service_start_at` | |
| API-62 | P1 | `end_at` < `start_at` | 400 | |
| API-63 | P1 | Buat order rekanan (`is_external`, vendor, mobil vendor milik vendor lain) | semua hari eksternal / 400 "does not belong to the given vendor" | |
| API-64 | P0 | Ubah harga final tanpa `change_reason` / lebih kecil dari invoice aktif | 400 / 409 | |
| API-65 | P0 | **Ubah order yang sudah punya driver / sedang berjalan** | hari, driver, payable, biaya tetap utuh | ✅ fix (C5–C12) |
| API-65a | P0 | Edit Order: hapus hari berjalan / hari dengan mobil / hari rekanan berisi / hari batal yang menyimpan data / semua hari terbuka | 409 dengan pesan jelas, tidak ada yang berubah | ✅ (C13, C23, C24, C28, C29) |
| API-65b | P1 | Edit Order: tambah hari (order campuran → hari internal), simpan dobel, id tak dikenal, daftar hari kosong | hari baru `SCHEDULED`; dobel 409; 400; 400 | ✅ (C16, C22, C26, C15, C21) |
| API-65c | P1 | Edit Order: pindah jam hari milik driver / tanggal yang sama dikirim tengah malam | push "Jadwal tugas diubah" + konfirmasi dikosongkan / tidak dianggap pindah | ✅ (C27, C30) |
| API-65d | P1 | Edit Order: alasan harga, total basi dengan biaya tambahan, `final_price` saja | alasan wajib bila harga hari diubah; total basi diperbaiki + log SYSTEM; 400 | ✅ (C18, C32, C31) |
| API-66 | P0 | Ubah / tambah biaya pada order `DONE` atau `CANCELLED` | 409 "read-only" | ✅ (D25) |
| API-67 | P1 | Tambah biaya tambahan (billable / tidak) | billable: harga final naik, log perubahan; tidak: hanya log | |
| API-68 | P2 | `PUT /orders/:id/finance` | hanya catatan keuangan yang berlaku (angka dihitung dari hari) | |

### 5.6 Invoice dan pembayaran

| ID | P | Kasus | Hasil yang diharapkan | Lokal |
|---|---|---|---|---|
| API-70 | P0 | DP < 20% sewa / > harga sewa / sah | 409 / 409 / 201 | ✅ (G3) |
| API-71 | P0 | Menerbitkan invoice | `payment_status` tidak berubah | ✅ (A2) |
| API-72 | P0 | Pelunasan tanpa DP sebelumnya | 409 | ✅ (G6) |
| API-73 | P1 | FULL atau Gabungan bila sudah ada invoice aktif | 409 | ✅ (G5) |
| API-74 | P1 | Tambahan bila ada Gabungan aktif | 409 | |
| API-75 | P0 | Jumlah melebihi sisa (harga final − invoice aktif) | 409 | ✅ (G4) |
| API-76 | P0 | Tandai terbayar tanpa bukti | 400 | ✅ (G8) |
| API-77 | P0 | Tandai terbayar DP (bukti) | invoice PAID, kwitansi bernomor, bukti di bucket privat, `paid_to_date`, `DP_PAID` | ✅ (B1, B2) |
| API-78 | P0 | **Klik ganda** tandai terbayar | satu kwitansi, `total_paid` sekali | ✅ fix (G1, G2, G11–G18) |
| API-79 | P1 | Kelebihan bayar (`amount_received` > invoice) | `PAID`, `paid_to_date` = uang diterima, refund due = kelebihan | ✅ (G7) |
| API-80 | P0 | Pelunasan dibayar → lunas sewa | push "Order … sudah lunas" ke setiap driver yang harinya belum "Mulai perjalanan" (sekali per driver) | ✅ (D9) |
| API-81 | P0 | Revisi invoice yang belum dibayar | `payment_status` tetap | ✅ fix (A5–A10, G14, G19) |
| API-82 | P1 | Revisi invoice PAID / CANCELLED / REVISED | 409 | ✅ (G10) |
| API-83 | P1 | Kirim invoice WA (mode manual) / status REVISED/CANCELLED / tanpa nomor | `wa_url` + log kirim / 409 / 400 | |
| API-84 | P1 | Kirim kwitansi sebelum PAID | 409 | |
| API-85 | P2 | Statement gabungan dengan pilihan invoice / id asing | PDF / 400 | |
| API-86 | P1 | Bukti bayar | URL bertanda tangan; tanpa bukti 404 | |
| API-87 | P0 | PDF invoice, kwitansi, denda: rekening | hanya **BCA 0954840782 a.n. PT Ayomi Raya Karsa**; teks pembatalan 20% / 50% s.d. 10.00 WIB / 100% | |

### 5.7 Penugasan

| ID | P | Kasus | Hasil yang diharapkan | Lokal |
|---|---|---|---|---|
| API-90 | P0 | Driver internal ke order `UNPAID` (Edit Hari, Tetapkan untuk Semua, Ganti Semua) | 409 "Order belum dibayar…" | ✅ (A3) |
| API-91 | P0 | Order belum dibayar: lepas driver, simpan ulang driver sama, pilih mobil, hari rekanan | 200 | ✅ (I1, K6) |
| API-92 | P0 | Per hari setelah DP | 200; status tetap seperti dikirim (T4); fee default dari tabel (12 jam = 200.000); payable UNPAID; push "Tugas baru"; trip hari ini juga dapat "Pengingat trip" | ✅ (B3–B9, D9) |
| API-93 | P0 | Tetapkan untuk Semua | hari tanpa driver jadi `ASSIGNED`, order `ASSIGNED`, driver `ON_DUTY`, mobil `IN_USE`, satu push "N tugas baru" | ✅ (B11–B14) |
| API-94 | P1 | Tetapkan untuk Semua dengan driver/mobil yang punya trip `ASSIGNED` di tanggal lain | 409 "not available" (T4) | ✅ (B15) |
| API-95 | P1 | Ganti Semua: hanya hari `ASSIGNED`; hari per-hari (`SCHEDULED`) | dipindah + push "Tugas dialihkan" ke driver lama / 409 | ✅ (B10) |
| API-96 | P0 | Ganti driver di hari yang payable-nya **sudah dibayar** | 409 "sudah dibayar ke …" | |
| API-97 | P0 | Ubah fee / uang jalan / RTR di hari yang sudah dibayar | 409 | |
| API-98 | P1 | Kirim `ops_cost` (dashboard lama) | diabaikan, fee tidak berubah | |
| API-99 | P1 | Batalkan satu hari (Edit Hari) sebelum berangkat / setelah berangkat | fee 0 "Dibatalkan sebelum berangkat" / fee tetap | |
| API-100 | P1 | Hari rekanan: driver/plat rekanan, RTR | plat huruf besar; payable VENDOR = RTR | ✅ (I2) |
| API-101 | P1 | Ubah hari rekanan → internal | data driver/plat rekanan dikosongkan | |
| API-102 | P0 | Lepas driver | payable UNPAID dihapus; driver lama 404 di trip itu; push "Tugas dialihkan" (N3) | ✅ (K6–K8) |
| API-103 | P2 | Ubah status hari pada order `DONE` / `CANCELLED` | 409 (**gagal: T5**, hari bisa dibuka lagi) | ❌ T5 |

### 5.8 Endpoint aplikasi driver

| ID | P | Kasus | Hasil yang diharapkan | Lokal |
|---|---|---|---|---|
| API-110 | P0 | `GET /driver/trips?scope=active` | trip mulai kemarin (WIB) yang belum selesai + semua `IN_PROGRESS`; yang berjalan paling atas | ✅ (B8, J9) |
| API-111 | P1 | Trip lebih tua dari kemarin, belum ditutup | tidak tampil; tampil di `GET /schedule?overdue=true`; tetap bisa dibuka by id | ✅ (J9–J11) |
| API-112 | P1 | `scope=history` | `DONE` 60 hari terakhir, terbaru dulu | |
| API-113 | P0 | Trip milik driver lain / hari rekanan / sudah dialihkan | 404 | ✅ (D18, K8) |
| API-114 | P0 | Terima | `accepted_at` terisi, status tidak berubah; di `CANCELLED` 409 | ✅ (D1) |
| API-115 | P0 | Berangkat | `IN_PROGRESS`, `actual_start_at`, report START, order `IN_PROGRESS`, push "Driver berangkat" ke admin | ✅ (C1, D2) |
| API-116 | P0 | Kirim ulang aksi dengan `client_ref` sama (juga dua sekaligus) | 200, satu baris report, tidak ada perubahan ganda | ✅ (D2) |
| API-117 | P0 | Sampai dengan GPS (`latitude`+`longitude`+akurasi+mock) | `actual_pickup_at`, GPS di report ARRIVE_CUSTOMER | ✅ (D3) |
| API-118 | P1 | `latitude` tanpa `longitude` | 400 | ✅ (K1) |
| API-119 | P0 | Mulai perjalanan saat belum lunas / sudah lunas | 409 "Order belum lunas…" / 200 `customer_onboard_at` + report ONBOARD | ✅ (D6, D10) |
| API-120 | P1 | Mulai perjalanan tanpa Berangkat | sekaligus `IN_PROGRESS` + `actual_start_at` | |
| API-121 | P0 | Selesai tanpa Mulai perjalanan saat belum lunas (APK lama) | 409 | ✅ (D7) |
| API-122 | P0 | Selesai | `DONE`, `trip_finished_at` (jam HP), `finish_reported_at` (jam server), order "Menunggu Finalisasi", push "Trip selesai" ke admin | ✅ (D19) |
| API-123 | P0 | Berangkat / Sampai / Mulai perjalanan / laporan di trip `CANCELLED`; Berangkat / Sampai / Mulai di trip `DONE` | 409. Selesai di trip `DONE` = no-op 200; Terima di trip `DONE` hanya mengisi `accepted_at` | |
| API-124 | P1 | `occurred_at` di masa depan / 30 hari lalu | dicatat jam server / 7 hari lalu | ✅ (J1, J2) |
| API-125 | P0 | Foto sampai: tanpa GPS / tanpa foto | 400 | ✅ (D4) |
| API-126 | P0 | Foto sampai `stamped=true` + `location_mocked=true` | disimpan tanpa cap ulang; `location_mocked` true | ✅ (D5) |
| API-127 | P1 | Foto sampai tanpa `stamped` (APK lama) | server mencap foto (jimp); foto rusak tetap disimpan tanpa cap | |
| API-128 | P0 | Odometer: akhir sebelum awal / tanpa foto / awal kedua / akhir < awal / urutan benar | 409 / 400 / 409 / 409 / 200 | ✅ (D11–D16) |
| API-129 | P0 | Struk Bensin/Tol/Parkir/Biaya lain | report + `expenses` PENDING, `paid_by` DRIVER; kirim ulang tidak dobel | ✅ (C2, D17) |
| API-130 | P1 | Paket XOPS (bensin/tol/parkir) / ALL-IN X PARKIR (parkir) | `bill_to_customer` true | ✅ (J3) |
| API-131 | P1 | Struk setelah trip `DONE` | diterima | ✅ (D20) |
| API-132 | P1 | Foto GIF / > 10 MB | 415 / 413 | ✅ (K2, K3) |
| API-133 | P1 | `client_ref` yang sama di trip lain | 409 | ✅ (K4) |
| API-134 | P1 | Catatan (NOTE) tanpa foto / PHOTO | diterima | |
| API-135 | P0 | Notifikasi: daftar, `unread`, tandai id / semua, halaman `before` | sesuai; hanya milik driver itu | ✅ (D27, D28) |

### 5.9 Biaya perjalanan (review admin)

| ID | P | Kasus | Hasil yang diharapkan | Lokal |
|---|---|---|---|---|
| API-140 | P0 | Setujui struk dibayar driver | masuk "ganti biaya" di payable | ✅ (D23) |
| API-141 | P0 | Tolak dengan alasan | push "Biaya ditolak: <alasan>" ke driver; tidak dihitung | ✅ (D22) |
| API-142 | P1 | Setujui biaya `bill_to_customer` | penyesuaian "Biaya perjalanan" billable dibuat, harga final naik, masuk Invoice Tambahan; tidak menambah margin | ✅ (J4) |
| API-143 | P1 | Ubah ke tolak / ubah jumlah setelah disetujui | penyesuaian dihapus / ikut berubah | |
| API-144 | P1 | Admin tambah biaya (kantor/driver, ditagih/tidak) dengan `client_ref`; kirim ulang | langsung APPROVED; kirim ulang no-op | |
| API-145 | P1 | Hapus biaya dari aplikasi / dari admin | 409 "Pakai Tolak" / 200 | ✅ (J6) |
| API-146 | P0 | Ubah biaya dibayar driver di hari yang fee-nya sudah dibayar | 409 | |
| API-147 | P1 | `POST /lines/:id/expenses` oleh driver (jalur lama) di hari DONE / milik driver lain | 409 / 403 | |

### 5.10 Utang (payable)

| ID | P | Kasus | Hasil yang diharapkan | Lokal |
|---|---|---|---|---|
| API-150 | P0 | Total = fee + ganti biaya − uang jalan + extras | sesuai; uang jalan > fee → total negatif ("Sisa uang jalan") | ✅ (D23) |
| API-151 | P0 | Tandai dibayar (klik ganda) | sekali; satu push "Fee sudah dibayar" berisi rincian | ✅ (D26) |
| API-152 | P0 | Bayar sekaligus (beberapa hari, beberapa driver) | satu push per driver "N fee sudah dibayar"; klik ulang tidak mengirim lagi | |
| API-153 | P1 | Ubah extras / keterangan di payable TERBAYAR | 409 | |
| API-154 | P1 | Tandai belum terbayar lalu ubah fee | payable ikut angka hari terbaru | |
| API-155 | P1 | Ringkasan & riwayat per driver/vendor | angka sama dengan daftar | |

### 5.11 Finalisasi, pembatalan, refund

| ID | P | Kasus | Hasil yang diharapkan | Lokal |
|---|---|---|---|---|
| API-160 | P0 | Finalisasi saat ada hari belum DONE / ada biaya PENDING / sudah DONE / dibatalkan | 409 untuk semua | ✅ biaya PENDING (D21) |
| API-161 | P0 | Finalisasi sah | order `DONE`, log perubahan; tetap bisa invoice/bayar/refund | ✅ (D24) |
| API-162 | P0 | Batal sebelum hari H | tier 1, denda 20% harga final, invoice aktif dibatalkan, invoice denda bernomor, refund due = bayar − denda | ✅ (E1–E3) |
| API-163 | P0 | Batal hari H sebelum/sesudah 10.00 WIB, belum/sudah berangkat | tier 2 (50%) hanya bila sebelum 10.00 dan belum ada yang berangkat; selain itu tier 3 (100%) | ✅ tier 3 (J7) |
| API-164 | P1 | Batal setelah hari H / tanpa tanggal layanan | tier 3 / tier 1 | |
| API-165 | P0 | Hari belum berangkat vs sudah berangkat vs sudah dibayar | dilepas fee 0 / driver & fee tetap / tetap | ✅ (E2, J8) |
| API-166 | P0 | Driver setelah pembatalan | trip hilang dari HP (404), driver/mobil `AVAILABLE` bila tidak ada trip lain | ✅ (E4) |
| API-167 | P1 | Batal dua kali / batal order `DONE` | 409 | ✅ (E5) |
| API-168 | P1 | Order tanpa pelanggan terhubung | dibatalkan tanpa invoice denda | |
| API-169 | P0 | Tandai refund tanpa bukti / tanpa kelebihan / sah | 400 / 400 / 200 | ✅ (G9) |

### 5.12 Konfirmasi WhatsApp dan pengingat (mode manual)

| ID | P | Kasus | Hasil yang diharapkan | Lokal |
|---|---|---|---|---|
| API-170 | P0 | Kirim konfirmasi hari internal tanpa driver/mobil / tanpa tanggal | 400 | |
| API-171 | P0 | Kirim konfirmasi (driver + mobil lengkap) | `wa_url` pelanggan (`https://wa.me/62…`), push pengingat ke driver, state "Terkirim" | ✅ rekanan (I3) |
| API-172 | P1 | Kirim lagi tanpa perubahan / `force` | 409 / 200 | ✅ (I4) |
| API-173 | P1 | Ganti driver setelah terkirim | state "Berubah"; kirim ulang = pesan UPDATE + pesan berhenti tugas ke driver lama (link + push) | |
| API-174 | P1 | Hari rekanan tanpa nama driver / plat | 400 | |
| API-175 | P1 | Penugasan untuk hari ini | push "Pengingat trip" otomatis (sekali per driver+mobil) | ✅ (D9) |
| API-176 | P1 | Sapuan H-1 pukul 17.00 WIB (`POST /schedule/confirmation-sweep` untuk uji) | push pengingat untuk trip internal besok yang belum diingatkan; dijalankan ulang tidak mengirim dobel | |

### 5.13 Tampilan jadwal, laporan (smoke)

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| API-180 | P1 | `GET /schedule` filter tanggal WIB (trip 23.30 WIB), driver, tipe, status, cari kode/nama/plat rekanan | hari tidak bergeser; filter benar |
| API-181 | P1 | `driver-availability`, `stock`, `week` untuk tanggal WIB | sibuk/bebas sesuai hari |
| API-182 | P1 | `history` filter keuangan (semua/final/menunggu) | sesuai; GPS bukti sampai ikut |
| API-183 | P2 | `analytics/dashboard-v2`, `analytics/revenue`, `invoices` (filter status bayar) | tidak error; angka cocok dengan order uji |

---

## 6. Uji dashboard

Jalankan di dashboard.haikuy.com (atau lokal) dengan data uji. Setiap aksi: cek toast, angka di layar, dan setelah muat ulang halaman, angka masih sama.

### 6.1 Umum

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| DSB-01 | P0 | Login admin / salah | masuk Dashboard / pesan salah |
| DSB-02 | P1 | Token kedaluwarsa | dialihkan ke login |
| DSB-03 | P1 | Ganti bahasa id ↔ en di setiap halaman | tidak ada kunci mentah (mis. `orderDetail.xxx`) |
| DSB-04 | P0 | Semua tanggal/jam | tampil WIB; laptop dengan zona waktu lain (ubah TZ OS ke UTC) tidak menggeser tanggal |
| DSB-05 | P2 | Layar HP (390 px) | menu dan dialog bisa dipakai |

### 6.2 Lead Website

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| DSB-10 | P0 | Kirim form di arasya-web.vercel.app | lead muncul di tab Baru dengan kode ARS sama seperti di WhatsApp |
| DSB-11 | P1 | Badge "Ada di armada" / "Perlu rekanan" | sesuai unit diminta vs mobil internal |
| DSB-12 | P0 | Buat order dari lead (`/dashboard/orders?lead=<id>`) | form terisi (hanya untuk lead Baru; lead yang sudah jadi order tidak membuka form) (tanggal, jam, lokasi, unit, penumpang, durasi), nomor HP wajib, lead "return/multi" menampilkan petunjuk; kode order = kode ARS |
| DSB-13 | P1 | Hubungkan ke order yang sudah ada / Abaikan dengan alasan / Buka lagi | sesuai toast; tab berpindah |
| DSB-14 | P1 | Status bayar di kartu lead + "Omzet sudah tercatat di GA4" | muncul setelah pembayaran pertama |

### 6.3 Order

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| DSB-20 | P0 | Buat Order: pelanggan baru, 1 hari | order `Dibuat`, satu baris hari; harga final terhitung |
| DSB-21 | P0 | Buat Order: nomor pelanggan lama (format lain) | petunjuk "Pelanggan lama", tombol "Pakai data ini", KTP/verifikasi tampil |
| DSB-22 | P1 | Buat Order: 3 hari, biaya tambahan di awal, beberapa PIC | 3 baris hari; tambahan tercatat; PIC utama benar |
| DSB-23 | P1 | Buat Order rekanan (Pelaksana Order = vendor) | hari eksternal, vendor terpilih |
| DSB-24 | P0 | **Edit Order** pada order yang sudah punya driver / `IN_PROGRESS`: ubah lokasi, ubah harga (alasan muncul), hapus hari berjalan | hari, driver, payable tetap utuh; alasan tercatat; hapus ditolak dengan pesan "Batalkan hari itu lewat Edit Hari". Lolos di browser lokal 4 Okt. |
| DSB-25 | P1 | Edit Order: ubah harga tanpa alasan / di bawah total invoice | form meminta alasan / pesan error API |
| DSB-26 | P0 | Order `DONE`/`CANCELLED` | banner hanya-baca; Edit, Tugaskan, Tambah Biaya tidak ada; invoice/bayar/refund masih ada |
| DSB-27 | P1 | Daftar order: bucket (Aktif, Perlu Finalisasi, Tanpa Invoice, Belum Final, Dibatalkan, Sudah Refund), filter, cari (kode ARS, nama/HP/plat driver rekanan, vendor), preset filter, export | hasil benar; preset tersimpan setelah muat ulang |
| DSB-28 | P1 | Kartu Keuangan & Margin | hanya catatan bisa diubah; angka dari hari; fee = jumlah fee semua hari |
| DSB-29 | P1 | Progres trip per hari ("Hari 1 dari 3", LIVE) dan jam Diterima/Berangkat/Tiba/Pelanggan naik/Selesai | sesuai aksi di HP |

### 6.4 Invoice dan pembayaran (halaman order + menu Invoice)

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| DSB-30 | P0 | Invoice Uang Muka: petunjuk minimum 20%, di bawahnya | pesan error API ditampilkan |
| DSB-31 | P0 | Tandai Terbayar: tanpa file / file 12 MB / GIF / sah | pesan wajib / ukuran / tipe / toast "ditandai terbayar — kini jadi kwitansi" |
| DSB-32 | P0 | **Klik "Tandai Terbayar" dua kali cepat** | satu kwitansi (API diperbaiki 4 Okt). Cek tombol dinonaktifkan saat memproses. |
| DSB-33 | P0 | Revisi invoice yang belum dibayar | badge pembayaran tetap "Belum Terbayar" (diperbaiki 4 Okt) |
| DSB-34 | P1 | Pelunasan, Penuh, Tambahan, Gabungan, Statement gabungan (pilih invoice) | aturan sesuai §5.6; PDF terbuka |
| DSB-35 | P0 | Kirim invoice / kwitansi WhatsApp (mode manual) | tab WhatsApp terbuka dengan pesan terisi ke nomor 62…; riwayat pengiriman bertambah; popup tidak diblokir |
| DSB-36 | P0 | Isi PDF invoice, kwitansi, denda | rekening BCA PT Ayomi Raya Karsa saja; kode order ARS; kebijakan batal sama dengan website |
| DSB-37 | P1 | Menu Invoice: filter status bayar/status invoice, cari, pratinjau PDF, bukti bayar | sesuai |

### 6.5 Trip (Jadwal), Edit Hari, konfirmasi

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| DSB-40 | P0 | Order belum DP: Edit Hari | pilihan driver terkunci + catatan "Order ini belum dibayar"; laci hari "Menunggu DP"; halaman order tanpa Tetapkan untuk Semua |
| DSB-41 | P0 | Setelah DP: Edit Hari pilih driver + mobil, Status dibiarkan "Terjadwal" | tersimpan; fee terisi dari tabel; **catat status hari dan tampilan di HP (T4)** |
| DSB-42 | P0 | Edit Hari: Status "Ditugaskan" | hari `ASSIGNED`; order "Ditugaskan" |
| DSB-43 | P0 | Tetapkan untuk Semua / Ganti Semua di halaman order | sesuai §5.7; "Ganti Semua" untuk hari per-hari menampilkan error |
| DSB-44 | P1 | Driver/mobil yang sudah dipakai di tanggal itu | tampil tetapi tidak bisa dipilih; driver/mobil hari itu sendiri tetap bisa |
| DSB-45 | P0 | Fee driver: kosong = tabel; tombol tabel fee; +Menginap; +Overtime; rincian; uang jalan; pratinjau margin | angka benar; hanya yang berubah dikirim |
| DSB-46 | P0 | Hari yang fee-nya sudah dibayar | catatan terkunci; ubah fee/uang jalan/driver ditolak dengan pesan "Tandai belum terbayar dulu" |
| DSB-47 | P1 | Hari rekanan: vendor baru, mobil vendor baru, nama/HP/plat driver rekanan, RTR | tersimpan; plat huruf besar |
| DSB-48 | P0 | Konfirmasi: Kirim ke Customer (+ driver) | WhatsApp terbuka; status "Terkirim"; ganti driver → "Berubah, perlu kirim ulang" → Kirim Perubahan + Beri tahu driver lama |
| DSB-49 | P1 | Badge "Belum lunas" / "Menunggu DP" di Jadwal, laci hari, Edit Hari | sesuai uang order |
| DSB-50 | P1 | Agenda: Hari ini / Besok / Minggu ini / rentang; chip "Belum ditutup (N)" + banner; tutup lewat Edit → Selesai/Dibatalkan | trip hilang dari daftar Belum ditutup |
| DSB-51 | P1 | Ketersediaan Driver (minggu), Stok (driver/mobil terpakai/bebas/rusak) | sesuai trip uji |
| DSB-52 | P0 | Riwayat Trip: linimasa (Diterima, Berangkat, Tiba, Pelanggan naik, Selesai, Lapor selesai), laporan berlabel *Aplikasi*, foto odometer/struk terbuka | sesuai HP |
| DSB-53 | P0 | Bukti sampai lokasi jemput (halaman order + Riwayat): foto bercap, koordinat, akurasi, "Lihat di peta", "Rute ke alamat jemput"; badge merah "Lokasi palsu terdeteksi"; "Tanpa foto/GPS" | sesuai APP-40…46 |
| DSB-54 | P2 | Edit Hari dari Jadwal pada hari milik order Selesai / Dibatalkan | ditolak (**hari ini tidak ditolak: T5**); setelah perbaikan, pesan error tampil |

### 6.6 Biaya perjalanan, Utang, finalisasi

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| DSB-60 | P0 | Biaya perjalanan per hari: "N menunggu dicek", struk terbuka, Setujui, Tolak dengan alasan, Ditagih ke pelanggan, Dibayar driver/kantor, Hapus (hanya biaya admin) | sesuai §5.9; ringkasan "Disetujui: diganti ke driver … · ditagih ke pelanggan … · ditanggung Arasya …" benar |
| DSB-61 | P1 | Tambah biaya (admin), klik Simpan dua kali / koneksi putus lalu ulang | satu biaya saja |
| DSB-62 | P0 | Finalisasi saat ada biaya menunggu | pesan "Masih ada N biaya…"; setelah dicek, dialog konfirmasi (peringatan biaya tambahan) → `Selesai` |
| DSB-63 | P0 | Utang: daftar driver/vendor, filter, cari, pilih beberapa → Bayar Terpilih | ringkasan diperbarui tanpa muat ulang; driver dapat notifikasi |
| DSB-64 | P0 | Utang: Bayar satu (metode), Tandai belum terbayar, Edit (extras negatif = potongan) | total = fee + ganti biaya − uang jalan + extras; TERBAYAR tidak bisa diedit |
| DSB-65 | P1 | Riwayat tagihan driver/vendor | angka cocok |

### 6.7 Batal dan refund

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| DSB-70 | P0 | Batalkan Pesanan tanpa alasan / dengan alasan | wajib alasan / ringkasan tier, denda, sudah dibayar, refund atau sisa utang pelanggan |
| DSB-71 | P0 | Setelah batal | badge "Dibatalkan", invoice lama "Dibatalkan", invoice "Biaya Pembatalan" baru, tombol Tandai Refund bila ada kelebihan |
| DSB-72 | P0 | Tandai Refund: tanpa bukti / sah | ditolak / "Sudah refund" |

### 6.8 Master data dan laporan

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| DSB-80 | P0 | Driver: tambah (perlu akun DRIVER, N5), ubah nomor ke nomor driver lain | daftar akun / pesan "sudah dipakai driver lain" |
| DSB-81 | P0 | Detail driver: Akses aplikasi → Atur password (kurang dari 6, tidak sama, sah) | pesan / pesan / tersimpan; driver bisa login di HP |
| DSB-82 | P1 | Driver status OFF / mobil MAINTENANCE | tidak bisa dipilih di Tetapkan untuk Semua; status tidak berubah sendiri |
| DSB-83 | P1 | Mobil: tambah (plat ganda ditolak), foto mobil, kartu/tabel | sesuai |
| DSB-84 | P1 | Vendor: tambah, PIC/area/rekening, mobil vendor, detail + Riwayat Trip vendor | sesuai |
| DSB-85 | P0 | Pelanggan: daftar NIK tersamar, detail NIK penuh, unggah KTP, Lihat (tab baru, URL 5 menit), hapus, verifikasi | sesuai §5.4 |
| DSB-86 | P1 | Dashboard, Pendapatan (per unit, vendor, fee driver), Panduan | tidak error; angka order uji masuk ke periode tanggal layanan |

---

## 7. Uji aplikasi driver (HP asli)

Prasyarat: APK `d603a395…`, HP 1 dan HP 2 (§3.2). Setiap langkah: catat jam, tangkapan layar, dan Claude mengecek baris DB-nya.

### 7.1 Masuk, keluar, akun

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| APP-01 | P0 | Login nomor HP dengan spasi/strip/+62 | masuk ke Tugas; minta izin notifikasi |
| APP-02 | P0 | Sandi salah / tanpa sinyal | "Nomor HP/email atau kata sandi salah" / pesan koneksi |
| APP-03 | P1 | Login akun admin | layar "Aplikasi ini untuk driver" + Keluar |
| APP-04 | P0 | Tutup paksa lalu buka | tetap masuk (token 90 hari) |
| APP-05 | P0 | Keluar tanpa antrean / dengan antrean | "Ya, keluar" / "Tetap keluar (data hilang)" lalu antrean dihapus dan push berhenti untuk HP ini |
| APP-06 | P1 | Ganti akun di satu HP (driver A keluar, driver B masuk) | B tidak melihat data/antrean/notifikasi A; push A tidak sampai ke HP ini |
| APP-07 | P1 | Password diganti admin saat HP masuk | tetap masuk sampai token habis (token lama masih sah) — catat sebagai perilaku |
| APP-08 | P1 | Sesi berakhir (401) | "Sesi Anda sudah berakhir"; antrean disimpan dan terkirim setelah driver yang sama masuk lagi |

### 7.2 Daftar tugas dan detail

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| APP-10 | P0 | Tugas baru via per-hari (SCHEDULED) | push "Tugas baru" → ketuk → detail; kartu "Buka untuk terima tugas"; badge angka di tab Tugas |
| APP-11 | P0 | Tugas baru via Tetapkan untuk Semua (ASSIGNED) | **T4: tombol Terima tugas tidak muncul, chip "Diterima"**. Catat hasilnya untuk keputusan. |
| APP-12 | P0 | Daftar hanya berisi trip mulai kemarin + yang berjalan; dikelompokkan per hari (Hari ini/Besok/…); yang berjalan paling atas | sesuai |
| APP-13 | P0 | Detail: jadwal (WIB), multi-hari "N hari, sampai …", lokasi + Buka Maps, pelanggan + Telepon/WhatsApp, kontak lain, mobil + plat, layanan/paket/penumpang, catatan | data sama dengan dashboard; tanpa NIK atau harga |
| APP-14 | P1 | Mobil belum ditentukan | "Mobil belum ditentukan. Tanyakan ke admin." |
| APP-15 | P1 | Tarik layar | data terbaru; antrean dicoba kirim |
| APP-16 | P1 | Riwayat | trip `DONE` 60 hari terakhir |
| APP-17 | P1 | Tanpa sinyal saat membuka aplikasi | daftar terakhir dari cache tetap tampil |

### 7.3 Langkah perjalanan

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| APP-20 | P0 | Terima tugas | "Tugas diterima"; dashboard "Diterima driver" ±10 detik |
| APP-21 | P0 | Berangkat dari garasi saat order belum lunas | boleh; banner info "Pelanggan belum lunas…"; trip "Berjalan"; admin dapat push "Driver berangkat" |
| APP-22 | P0 | Sampai di lokasi jemput | membuka kamera GPS (APP-40) |
| APP-23 | P0 | Mulai perjalanan saat belum lunas | tombol abu "Mulai perjalanan (menunggu pelunasan)" + banner + **Hubungi admin (WhatsApp)** ke 0821-2402-4281 dengan pesan terisi (kode order, nama pelanggan) |
| APP-24 | P0 | Admin menandai pelunasan | push "Order … sudah lunas" → ketuk → tombol aktif (tanpa tarik layar pun, setelah push diterima) |
| APP-25 | P0 | Mulai perjalanan → Selesai (dialog konfirmasi + catatan) | "Tugas selesai. Terima kasih!"; pindah ke Riwayat; struk masih bisa dikirim |
| APP-26 | P1 | Order lunas sejak awal | tidak ada banner bayar |
| APP-27 | P1 | Order punya biaya tambahan yang belum dibayar, sewa sudah lunas | Mulai perjalanan tetap aktif (N1) |
| APP-28 | P1 | Langkah ditekan dua kali cepat | satu catatan di server |

### 7.4 Kamera GPS (sampai di lokasi jemput)

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| APP-40 | P0 | Kamera terbuka langsung; cap besar jam, tanggal, kode order, nama driver, GPS ± akurasi, alamat jemput; tombol potret menunggu "GPS siap" | sesuai; tidak ada pilihan galeri |
| APP-41 | P0 | Potret → pratinjau → "Kirim & tandai sampai" | foto bercap terunggah (cap terbaca di dashboard, tidak dobel); GPS di DB; dashboard bukti sampai lengkap |
| APP-42 | P0 | Di dalam gedung / GPS lemah 25 detik | pesan "GPS belum dapat lokasi…"; muncul "Tandai sampai tanpa lokasi" → dashboard "Tanpa foto/GPS" |
| APP-43 | P0 | Lokasi HP dimatikan | Android meminta menyalakan; bila ditolak, pesan "Lokasi (GPS) di HP mati…" |
| APP-44 | P0 | Izin lokasi / kamera ditolak (dan "jangan tanya lagi") | pesan untuk ke Pengaturan; tetap bisa "Tandai sampai tanpa lokasi" |
| APP-45 | P0 | Aplikasi lokasi palsu (mock location) | label "Lokasi palsu terdeteksi"; banner merah; dashboard badge merah |
| APP-46 | P1 | Foto ulang; Batal; buka lagi setelah sampai tercatat | foto terakhir yang dikirim; banner "sudah tercatat" |
| APP-47 | P1 | Tanpa sinyal saat sampai | "dikirim saat ada sinyal"; langkah + foto terkirim sendiri nanti, jam = jam potret |
| APP-48 | P1 | HP kelas bawah (RAM kecil) | cap tetap terbakar ke foto; bila gagal, foto dikirim tanpa cap dan server yang mencap (`stamped` tidak dikirim) |

### 7.5 Laporan dan biaya

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| APP-50 | P0 | Odometer awal: tanpa foto / tanpa angka / sah | pesan / pesan / "Terkirim" |
| APP-51 | P0 | Odometer akhir terkunci sebelum awal ("Kirim odometer awal dulu"); akhir < awal | terkunci / "Angka akhir lebih kecil dari odometer awal (…)" |
| APP-52 | P0 | Odometer awal gagal dikirim | akhir terkunci "Odometer awal gagal dikirim"; Coba lagi / Hapus |
| APP-53 | P0 | Bensin/Tol/Parkir dengan foto struk (kamera dan galeri), tanpa jumlah | wajib jumlah; terkirim "Menunggu dicek" |
| APP-54 | P0 | Biaya lain tanpa catatan | "Tulis biaya untuk apa…" |
| APP-55 | P1 | Foto/Catatan tanpa foto dan tanpa catatan / catatan saja | pesan / terkirim sebagai Catatan |
| APP-56 | P0 | Admin setujui / tolak struk | daftar Biaya perjalanan: "Disetujui" / "Ditolak" + "Alasan: …"; push "Biaya ditolak"; total tanpa yang ditolak |
| APP-57 | P1 | Foto kamera besar (HP 50 MP) | diperkecil sebelum kirim; tidak pernah 413 |
| APP-58 | P1 | Struk setelah Selesai | masih bisa dikirim |

### 7.6 Tanpa sinyal, antrean, sinkron latar belakang

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| APP-60 | P0 | Mode Pesawat → Berangkat, Sampai (foto), struk | layar langsung berubah; banner "Tidak ada sinyal…" dan "N laporan & N perubahan status menunggu dikirim"; kartu tugas "N data menunggu dikirim" |
| APP-61 | P0 | Sinyal kembali (aplikasi terbuka) | semua terkirim berurutan per trip; jam di server = jam tekan; tidak ada data ganda |
| APP-62 | P0 | Offline → tutup aplikasi → nyalakan data → tunggu 15–30 menit tanpa membuka | terkirim oleh tugas latar belakang (cek DB) |
| APP-63 | P0 | "Kirim sekarang" (Profil / banner) | "Semua data sudah terkirim" atau "N data belum terkirim. Penyebab: …"; banner gagal "N data gagal dikirim (…) · ketuk untuk coba lagi" |
| APP-64 | P1 | Sinyal lemah (server tidak menjawab) lama | item hanya menahan trip-nya; setelah ±30 kali menjadi "gagal" dengan Coba lagi / Hapus |
| APP-65 | P1 | Server error berulang (uji lokal: API dimatikan / 500) | backoff; setelah 20 kali gagal: Coba lagi / Hapus |
| APP-66 | P0 | Trip dialihkan ke driver lain saat HP lama masih punya antrean | "Tugas (…) sudah tidak ditugaskan ke Anda. N data … dibatalkan."; trip hilang |
| APP-67 | P0 | Order dibatalkan saat HP offline menyimpan aksi | trip hilang setelah sinkron (404) dengan pesan yang sama |
| APP-68 | P1 | Aksi ditolak server (mis. Selesai di APK lama saat belum lunas) | pesan "Perubahan status tidak bisa dikirim: Order belum lunas…"; layar kembali ke status server |
| APP-69 | P1 | HP mati/restart dengan antrean | antrean masih ada setelah dinyalakan, lalu terkirim |
| APP-70 | P1 | Jam HP salah (maju 1 jam / mundur 10 hari) | server memakai jam server / 7 hari lalu (API-124) |

### 7.7 Notifikasi dan kotak masuk

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| APP-75 | P0 | Push saat aplikasi terbuka / di latar / tertutup (cold start) | banner muncul; daftar dan badge lonceng diperbarui; ketuk membuka trip (atau Notifikasi untuk fee/biaya) dan menandai dibaca |
| APP-76 | P0 | Jenis push: Tugas baru, N tugas baru, Tugas dialihkan, Pengingat trip (hari ini & H-1 17.00), Order … sudah lunas, Fee sudah dibayar (rincian fee + ganti biaya − uang jalan), N fee sudah dibayar, Biaya ditolak | semua masuk kotak masuk walau push terlewat |
| APP-77 | P1 | Notifikasi Android dimatikan | tetap ada di kotak masuk (lonceng) |
| APP-78 | P1 | Tandai semua dibaca tanpa sinyal | badge langsung 0; terkirim saat ada sinyal; tidak menyala lagi |
| APP-79 | P1 | Channel "Tugas perjalanan" | bunyi + getar, prioritas tinggi |

### 7.8 Upgrade dan perangkat

| ID | P | Kasus | Hasil yang diharapkan |
|---|---|---|---|
| APP-85 | P0 | Pasang APK baru di atas lama dengan antrean tersisa | tetap masuk, antrean terkirim (item untuk trip yang sudah dihapus → hilang dengan pesan) |
| APP-86 | P1 | APK lama (`0e492789…`) dengan API baru | jalan tanpa kamera GPS/Mulai perjalanan; Selesai butuh lunas (409); foto sampai dicap server |
| APP-87 | P1 | Android 10 / 13+ / 15, HP layar kecil, font besar | tombol tidak terpotong; izin notifikasi Android 13+ diminta |
| APP-88 | P2 | Hemat baterai agresif (Xiaomi/Oppo/Vivo) | sinkron latar belakang tetap jalan setelah "Tanpa pembatasan" |

---

## 8. Skenario ujung ke ujung

Setiap skenario dijalankan berurutan oleh admin + HP, dengan pengecekan DB oleh Claude di setiap langkah bernomor.

**E2E-01 (P0) Lead → order → lunas → perjalanan → finalisasi → fee.**
1. Kirim form website (unit ada di armada).
2. Lead → Buat order (1 hari, hari ini +2, paket ALL-IN).
3. Coba tugaskan driver → ditolak.
4. Invoice DP 30% → Tandai Terbayar → `DP_PAID`, GA4 `purchase` sekali (DebugView/Realtime).
5. Edit Hari: driver HP 1 + mobil, Status "Ditugaskan" → push.
6. Kirim konfirmasi ke pelanggan.
7. Di hari H, di HP: Terima (bila muncul, T4) → odometer awal → Berangkat → Sampai (kamera GPS) → Mulai perjalanan terkunci.
8. Admin: invoice Pelunasan → Tandai Terbayar → push "sudah lunas" → Mulai perjalanan.
9. Bensin + Parkir → odometer akhir → Selesai.
10. Admin: setujui bensin, tolak parkir dengan alasan → HP dapat "Biaya ditolak".
11. Finalisasi → `DONE`.
12. Utang: Tandai dibayar → HP "Fee sudah dibayar" dengan rincian.
13. Cek Riwayat Trip, Pendapatan, Dashboard.

**E2E-02 (P0) Multi-hari, bulk assign, ganti driver di tengah.**
1. Order 3 hari, DP → Tetapkan untuk Semua (HP 1) → pelunasan sebelum hari 1 (tanpa lunas, "Mulai perjalanan" terkunci).
2. Hari 1 selesai penuh.
3. Ganti Semua ke HP 2: hari 1 tetap milik HP 1; hari 2–3 pindah. HP 1 dapat "Tugas dialihkan" dan trip hilang; HP 2 dapat "2 tugas baru".
4. Hari 2 dijalankan HP 2.
5. Hari 3 dibatalkan lewat Edit Hari (fee 0).
6. Cek: order tidak `DONE` sebelum finalisasi; finalisasi tanpa hari 3; payable hari 1 milik HP 1, hari 2 milik HP 2.

**E2E-03 (P0) Tanpa sinyal satu trip penuh.** Seperti HANDOFF §0.5 langkah 9–10: semua langkah dan laporan dalam Mode Pesawat, lalu sinyal kembali / sinkron latar belakang. Tidak ada data ganda, jam = jam tekan, urutan odometer terjaga.

**E2E-04 (P0) Dialihkan saat offline.** HP 1 offline menyimpan Berangkat + struk; admin mengalihkan hari ke HP 2; HP 1 online → pesan "sudah tidak ditugaskan", antrean dibuang; HP 2 menjalankan trip.

**E2E-05 (P0) Pembatalan di tiap tier.**
- (a) H-2 dengan DP 30% → tier 1, refund 10% → Tandai Refund.
- (b) Hari H 09.00 WIB, belum ada yang berangkat → tier 2 (50%).
- (c) Hari H 09.00 WIB setelah driver Berangkat → tier 3; driver tetap menerima fee hari itu.
- (d) Hari H 10.30 → tier 3.

Untuk setiap tier, cek PDF denda dan teks kebijakan.

**E2E-06 (P1) Rekanan.** Order dari lead dengan unit yang tidak ada di armada ("Perlu rekanan"), belum dibayar → hari rekanan (vendor, driver/plat rekanan, RTR) → konfirmasi ke pelanggan dan driver rekanan lewat WhatsApp → tutup lewat Edit → Selesai → finalisasi → Utang vendor. Driver internal tidak melihat apa pun di aplikasi.

**E2E-07 (P1) Paket XOPS dan ALL-IN X PARKIR.** Struk bensin/tol/parkir disetujui → "Ditagih ke pelanggan" otomatis → harga final naik → Invoice Tambahan → kwitansi. Margin tidak bertambah dari biaya pass-through. `payment_status` tidak turun walau tambahan belum dibayar (N2).

**E2E-08 (P1) Uang jalan.** Uang jalan Rp 300.000 di Edit Hari, fee Rp 200.000, struk disetujui Rp 50.000 → payable −Rp 50.000 → push "Sisa uang jalan …".

**E2E-09 (P1) Koreksi pembayaran fee.** Tandai dibayar → coba ubah fee (409) → Tandai belum terbayar → ubah fee → bayar lagi → satu push per pembayaran.

**E2E-10 (P1) Kelebihan bayar.** Invoice Penuh dibayar lebih → Perlu refund → Tandai Refund dengan bukti.

**E2E-11 (P1) Trip lama belum ditutup.** Hari kemarin lusa dengan driver, belum jalan → hilang dari HP, muncul di "Belum ditutup" → tutup lewat Edit Hari.

**E2E-12 (P0) Regresi bug T1–T3 di produksi.** Ulangi DSB-24, DSB-32, DSB-33, API-43 dengan order uji dan pastikan semuanya lolos (sudah lolos di lokal 4 Okt).

**E2E-13 (P1) Keputusan T4.** Jalankan APP-10 dan APP-11 berdampingan dan tunjukkan ke pemilik untuk memilih perilaku.

**E2E-14 (P2) Dua driver satu hari, dua mobil, satu order 2 unit.** Pastikan push, Ketersediaan, Stok, dan payable terpisah per hari.

---

## 9. Syarat sebelum aplikasi dibagikan ke semua driver

1. T1, T2, T3 sudah diperbaiki (4 Okt); E2E-12 lolos di produksi. T4 diputuskan pemilik dan diterapkan. T5 boleh menyusul, asal admin tahu untuk tidak mengubah hari order yang sudah selesai.
2. Semua kasus P0 di §5–§8 lolos di produksi dengan HP asli (minimal dua merek Android berbeda).
3. E2E-01, E2E-03, E2E-04 lolos dua kali berturut-turut tanpa intervensi.
4. Data uji dibersihkan (HANDOFF §0.3), termasuk file storage dan schema `backup_20261002` bila sudah tidak dipakai.
5. HANDOFF diperbarui dengan hasil per ID.

---

## 10. Lampiran: query cek database

Ganti `:code` dengan kode order uji.

```sql
-- Hari/trip order uji
select id, service_date, line_status, driver_id, car_id, driver_accepted_at, actual_start_at,
       actual_pickup_at, customer_onboard_at, trip_finished_at, finish_reported_at,
       driver_fee, travel_advance, ops_cost, margin_amount
from order_service_items where order_id = (select id from orders where order_code = :code)
order by service_date, sort_order;

-- Laporan dari aplikasi (urutan, jam, GPS, client_ref)
select report_type, created_at, amount, file_url is not null as has_file, latitude, longitude,
       location_accuracy_m, location_mocked, client_ref
from trip_reports where order_code = :code order by created_at;

-- Biaya perjalanan dan review
select type, amount, status, paid_by, bill_to_customer, created_by, review_note, adjustment_id
from expenses e join order_service_items l on l.id = e.order_service_item_id
where l.order_id = (select id from orders where order_code = :code);

-- Uang order
select order_status, awaiting_finalization, payment_status, paid_to_date, final_price
from orders where order_code = :code;

-- Payable per hari
select kind, status, base_amount, reimburse_amount, advance_amount, extras_amount, total_amount, paid_at
from payables where order_id = (select id from orders where order_code = :code);

-- Kotak masuk driver
select type, title, body, read_at, created_at from driver_notifications
where driver_id = :driver_id order by created_at desc limit 20;

-- Kwitansi ganda (T3)
select invoice_id, count(*) from receipts group by invoice_id having count(*) > 1;

-- Driver ON_DUTY tanpa trip aktif (dampak T1)
select d.name, d.status from drivers d
where d.status = 'ON_DUTY' and not exists (
  select 1 from order_service_items l
  where l.driver_id = d.id and l.is_external = false and l.line_status in ('ASSIGNED','IN_PROGRESS'));
```
