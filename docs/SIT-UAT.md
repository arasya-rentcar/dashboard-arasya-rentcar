# Alur uji SIT dan UAT: website, dashboard, aplikasi driver

Disusun 7 Oktober 2026 dari `docs/TEST-PLAN.md`, `docs/HANDOFF.md` (status sampai 7 Okt sore), `docs/BACKLOG.md`, `CLAUDE.md`, label tombol di `messages/id.json`, dan kode aplikasi driver (`mobile-arasya-rentcar`). Semua jam di dokumen ini **WIB (Asia/Jakarta, UTC+7)**.

Dokumen ini tidak menggantikan TEST-PLAN. TEST-PLAN tetap acuan detail per endpoint dan per layar (ID `API-…`, `DSB-…`, `APP-…`, `E2E-…`); SIT di sini memilih kasus integrasi yang paling penting dan menyebut ID TEST-PLAN-nya di kolom ID. UAT ditulis untuk tim admin dan pemilik bisnis, tanpa istilah teknis.

Isi:
1. Tujuan, ruang lingkup, dan persiapan
2. SIT (System Integration Test), untuk pemilik teknis
3. UAT (User Acceptance Test), untuk pemilik bisnis dan tim admin
4. Pelaporan cacat
5. Persetujuan (sign-off)
6. Lampiran: perilaku yang sudah diketahui dan yang belum bisa diuji

---

## 1. Tujuan, ruang lingkup, dan persiapan

### 1.1 Tujuan

1. **SIT** membuktikan bahwa ketiga bagian sistem saling tersambung dengan benar di produksi: website → API → dashboard → aplikasi driver → WhatsApp/GA4/storage, termasuk aturan uang (DP, lunas, pembatalan) dan kasus tepi yang sudah diketahui.
2. **UAT** membuktikan bahwa tim admin bisa menjalankan pekerjaan sehari-hari dari awal sampai akhir dengan sistem ini, dan pemilik bisnis setuju sistem dipakai.

### 1.2 Yang diuji

| Bagian | Alamat | Versi yang diuji |
|---|---|---|
| Website (form pemesanan) | arasya-web.vercel.app | `main` (HANDOFF §1) |
| API | https://api.haikuy.com/api/v1 | `main` `20e4a85` (PR #5) atau lebih baru |
| Dashboard admin | dashboard.haikuy.com (salinan VPS, yang dipakai admin) | `main` yang memuat PR #13 (audit UI/UX, menu berkelompok, viewer file baru) |
| Aplikasi driver (Android) | APK dari expo.dev | build `af651751-3348-4b9b-aae5-0904f9511a51` (terbaru menurut HANDOFF §1) atau yang lebih baru; catat nomor build-nya |

Di luar ruang lingkup: bot WhatsApp lama (dipensiunkan), Import Sheet (formatnya belum sesuai, BACKLOG §7), pembacaan saldo kartu e-toll lewat NFC tahap 2 (BACKLOG §5), dan fitur yang belum dibangun (lihat §6.2).

### 1.3 Lingkungan: hanya produksi

Arasya tidak punya lingkungan uji terpisah. Semua uji berjalan di produksi, berdampingan dengan order asli. Karena itu:

1. **Tandai semua data uji dengan jelas.**
   1.1. Nama pelanggan selalu diawali `TEST`, mis. `TEST Pelanggan Satu`, `TEST PT Contoh Uji`.
   1.2. Nomor HP pelanggan uji: nomor HP milik tim penguji, **bukan nomor pelanggan**. Di dokumen ini ditulis `0800-0000-0001`, `0800-0000-0002`, dst.; ganti dengan nomor HP uji tim saat menjalankan (nomor itu harus bisa menerima WhatsApp supaya pesan bisa dicek).
   1.3. Catatan order: `UJI SIT/UAT – jangan diproses`.
   1.4. Vendor uji: `TEST Vendor Uji`; driver rekanan uji: `TEST Driver Rekanan`, plat contoh `F 0000 UJI`.
   1.5. Bukti bayar dan bukti refund: gambar apa saja yang bertuliskan besar `BUKTI UJI`. Jangan pakai bukti transfer asli.
   1.6. NIK (bila perlu diisi): angka contoh yang jelas palsu, mis. `9999000000000001`. Jangan pernah memakai NIK, KTP, atau foto pelanggan asli.
   1.7. Harga uji memakai angka bulat yang mudah dihitung, mis. Rp 1.000.000 per hari. Angka ini hanya untuk uji, bukan harga resmi.
2. **Jangan ganggu order asli.** Sebelum menugaskan, cek Operasional → Trip → **Ketersediaan Driver** supaya driver dan mobil uji tidak sedang dibutuhkan order asli pada tanggal dan jam itu.
3. **Beri tahu tim** sebelum mengirim form website uji: pesan WhatsApp dengan kode ARS akan masuk ke nomor resmi 0821-2402-4281.
4. **Catat setiap kode** (kode lead/order `ARS-…`, nomor invoice, nomor kwitansi) di lembar hasil. Daftar ini dipakai untuk membersihkan data.
5. **Hal yang tidak bisa dibatalkan** setelah uji, jadi perlu persetujuan pemilik sebelum dimulai:
   5.1. Event GA4 (`generate_lead` dari form website, `purchase` saat invoice pertama order-dari-lead ditandai terbayar) tidak bisa dihapus dan akan masuk laporan omzet GA4. Jalankan uji GA4 **sekali saja** (UAT-01 dan SIT-62 memakai order yang sama).
   5.2. Pesan WhatsApp dan push notifikasi yang sudah terkirim.
   5.3. Nomor/kode yang sudah terpakai (kode pelanggan, nomor invoice dan kwitansi) tidak dipakai ulang setelah data uji dihapus, sama seperti pembersihan HANDOFF §0.3 (counter tidak di-reset).
6. **Pembayaran** di semua dokumen hanya ke **BCA 0954840782 a.n. PT Ayomi Raya Karsa**. Uji tidak memindahkan uang sungguhan; "Tandai Terbayar" memakai bukti uji.

### 1.4 Membersihkan data uji (sesudah sign-off)

Mengikuti HANDOFF §0.3 dan §0.5 langkah 13.

1. **Jangan** memakai Batalkan Pesanan untuk membersihkan data. Pembatalan membuat invoice biaya pembatalan dan mengubah angka keuangan; pakai hanya di skenario pembatalan.
2. Pemilik teknis menyiapkan skrip hapus untuk semua baris yang terkait kode order di lembar hasil: order beserta hari/trip, finance, adjustment, log, summary; invoice, kwitansi (receipts), log pengiriman invoice, payable, laporan driver (trip_reports), biaya perjalanan (expenses), lead website uji, pelanggan `TEST…`, vendor `TEST Vendor Uji` beserta mobilnya, serta notifikasi admin/driver dan permintaan driver yang terkait. Cek foreign key lebih dulu.
3. Skrip dijalankan pemilik di Supabase SQL Editor (konektor Supabase di sesi Claude menahan DELETE/UPDATE, HANDOFF §0.3).
4. File di Storage dihapus lewat Supabase Storage, bukan SQL: bucket `invoices` (PDF invoice/kwitansi), `payment-proofs` (bukti bayar/refund, dan dokumen pelanggan bila diuji), `driver-reports` (foto driver).
5. Kembalikan angka turunan: status driver/mobil uji `AVAILABLE`, total pelanggan, `order_count` vendor (seperti §0.3).
6. Kartu e-toll: catatan top-up/tol uji yang tidak sungguhan dibatalkan lewat Kartu E-Toll → Riwayat → batalkan catatan (lihat UAT-08).
7. Verifikasi dengan query baca (TEST-PLAN §10) bahwa tidak ada lagi baris dengan kode order uji, lalu catat hasil pembersihan di `docs/HANDOFF.md`.

### 1.5 Kriteria masuk (sebelum uji dimulai)

1. API `/health` menjawab 200 dan dashboard.haikuy.com menampilkan menu berkelompok (Ringkasan, Penjualan, Operasional, Keuangan, Bantuan). Bila menu belum berkelompok, PR #13 belum live dan UAT-09/UAT-10 belum bisa dijalankan.
2. APK terbaru terpasang di HP driver uji; nomor build dicatat.
3. Dua akun driver uji dengan nomor HP unik dan password aplikasi sudah diatur (Driver → detail driver → **Atur password**). Akun login driver baru tidak bisa dibuat dari dashboard (TEST-PLAN N5); pemilik teknis membuatnya lewat API/SQL.
4. Minimal dua mobil internal berstatus tersedia pada tanggal uji.
5. Kartu e-toll kantor sudah didaftarkan di menu Kartu E-Toll (untuk UAT-08).
6. Pemilik menyetujui uji GA4 (§1.3 nomor 5.1).
7. Semua penguji sudah membaca §6 (perilaku yang sudah diketahui), supaya tidak melaporkannya sebagai cacat baru.

### 1.6 Kriteria selesai (exit)

1. Semua kasus SIT lolos, atau gagal dengan cacat tingkat Sedang/Rendah yang diterima pemilik teknis.
2. Tidak ada cacat Kritis atau Tinggi yang masih terbuka.
3. Semua skenario UAT berstatus Lulus, atau Lulus dengan catatan yang diterima pemilik bisnis.
4. Pemilik bisnis menandatangani §5.
5. Data uji sudah dibersihkan dan diverifikasi (§1.4), hasilnya dicatat di HANDOFF.

### 1.7 Peran

| Peran | Siapa | Tugas |
|---|---|---|
| Pemilik teknis | latar IT | Menjalankan SIT, cek database dengan query baca (TEST-PLAN §10), membaca log bila gagal, membersihkan data |
| Pemilik bisnis | pemilik Arasya | Menjalankan/mendampingi UAT, memutuskan cacat yang bisa diterima, menandatangani §5 |
| Admin | tim admin | Menjalankan langkah dashboard di UAT |
| Driver uji 1 / 2 | memegang HP 1 / HP 2 | Menjalankan langkah aplikasi driver |
| Penguji pelanggan | siapa saja di tim | Mengisi form website dari HP, menerima WhatsApp di nomor uji |
| Pencatat | siapa saja di tim | Mengisi lembar hasil: ID, Lulus/Gagal, jam WIB, kode order, catatan |

### 1.8 Perangkat

| Perangkat | Dipakai untuk |
|---|---|
| HP Android 1 dan 2 dengan APK terbaru | Aplikasi driver (driver uji 1 dan 2). Notifikasi aktif, baterai "Tanpa pembatasan", lokasi (GPS) aktif |
| Laptop (Chrome) | Dashboard admin, layar lebar (±1440 px) |
| Tablet (browser) | Dashboard, layar sedang (±820 px) |
| HP (browser) | Dashboard layar kecil (±390 px) dan form website |
| HP penerima WhatsApp | Nomor uji `0800-0000-000x` milik tim, untuk mengecek pesan invoice/konfirmasi |

---

## 2. SIT (System Integration Test)

Untuk pemilik teknis. Setiap kasus: catat Lulus/Gagal, jam WIB, dan bukti. Bila sebuah langkah butuh cek database, pakai query di TEST-PLAN §10. ID dalam kurung adalah ID di TEST-PLAN.

### 2.1 Titik integrasi

| No | Alur | Yang dibuktikan | Kasus |
|---|---|---|---|
| 1 | Form website → `POST /public/leads` → menu Lead Website | lead tersimpan sekali, kode ARS sama di WhatsApp, lead, order, invoice | SIT-05 – SIT-10 |
| 2 | Order → baris jadwal per hari → aplikasi driver (push + sinkron) | penugasan, push, status per langkah, notifikasi admin | SIT-11 – SIT-18, SIT-31 – SIT-45 |
| 3 | Invoice PDF + WhatsApp `wa_url` | PDF benar, tab WhatsApp terbuka dengan pesan terisi | SIT-19 – SIT-30 |
| 4 | Tandai Terbayar → status bayar → GA4 `purchase` | status uang, kwitansi tunggal, event sekali | SIT-22 – SIT-28, SIT-62 – SIT-64 |
| 5 | Storage: URL bertanda tangan dan file publik | bukti bayar privat, dokumen pelanggan 5 menit | SIT-65 – SIT-68 |
| 6 | Permintaan e-toll dari aplikasi → notifikasi dashboard → push balik | permintaan tunggal, top-up tercatat di kartu | SIT-69 – SIT-72 |
| 7 | Daftar harga → terbit → website | terbit aman, website membaca harga | SIT-73 – SIT-75 |

### 2.2 Persiapan dan cek awal

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-01 (API-10) | – | Buka `https://api.haikuy.com/health` | 200 | output curl/tangkapan layar + jam |
| SIT-02 | – | `GET /api/v1/orders` dan `GET /api/v1/prices` tanpa token; `GET /api/v1/public/prices` | 401, 401; `public/prices` 404 "Daftar harga belum diterbitkan" (keadaan 7 Okt) | output curl |
| SIT-03 | Login admin | Buka dashboard.haikuy.com di laptop | Sidebar berkelompok: Ringkasan (Dashboard, Notifikasi), Penjualan (Lead Website, Order, Pelanggan, Daftar Harga), Operasional (Trip, Driver, Unit, Kartu E-Toll, Eksternal / Vendor), Keuangan (Invoice, Utang, Pendapatan), Bantuan (Panduan); bahasa default Indonesia | tangkapan layar |
| SIT-04 (APP-01, API-02) | Dua akun driver uji | Di HP 1 dan HP 2: login dengan nomor HP format `08…`, `+62 8…`, dengan spasi/strip; buka Profil | masuk ke Tugas; Profil → "Versi aplikasi" tercatat; ada bagian "Kartu e-toll" dan tombol "Tes kartu NFC" (tanda APK af651751 atau lebih baru) | tangkapan layar Profil |

### 2.3 Website → lead → order

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-05 (DSB-10, API-30) | Tim diberi tahu (§1.3 no. 3) | Dari HP, isi form pemesanan di arasya-web.vercel.app (nama `TEST…`, nomor uji, unit yang ada di armada) dan kirim | WhatsApp terbuka ke 0821-2402-4281 dengan kode `ARS-XXXXX`; lead muncul di Penjualan → Lead Website, tab **Baru**, dengan kode yang sama dan badge **Ada di armada**; GA4 Realtime menampilkan `generate_lead` | tangkapan layar pesan WA, kartu lead, GA4 Realtime; jam WIB |
| SIT-06 (API-31) | Kode lead SIT-05 | Kirim ulang `POST /public/leads` dengan `lead_code` yang sama (curl) | 204, tetap satu lead di dashboard | output curl + hitung `web_leads` |
| SIT-07 (API-32, API-33) | – | Kirim lead dengan kode bukan `ARS-XXXXX`, nama kosong, dan dengan field honeypot `website` terisi | 204 untuk semua, tetapi tidak ada yang tersimpan | output curl + `web_leads` tidak bertambah |
| SIT-08 (DSB-11) | – | Kirim form dengan unit yang tidak ada di armada | Badge **Perlu rekanan**; setelah **Buat order**, form menampilkan petunjuk memilih Vendor/rekanan di "Pelaksana Order" (admin tetap boleh memilih Internal) | tangkapan layar |
| SIT-09 (DSB-12, API-36) | Lead SIT-05 di tab Baru | Klik **Buat order**, isi nomor HP, harga, unit, simpan | Form terisi dari lead; nomor HP wajib; kode order = kode ARS; lead pindah ke tab **Jadi order** | tangkapan layar form + order |
| SIT-10 (API-38, DSB-13) | Lead sudah jadi order | Coba hubungkan lead yang sama ke order lain (**Hubungkan ke order**) / buka `/dashboard/orders?lead=<id>`; uji juga **Abaikan** dan **Buka lagi** pada lead uji lain | Lead yang sudah jadi order tidak membuka form; API menolak 409 "Lead is already linked"; Abaikan/Buka lagi memindah tab sesuai toast | tangkapan layar toast |

### 2.4 Order, hari layanan, Edit Order, Edit Hari

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-11 (DSB-20, DSB-22) | – | Order → **Buat Order**: pelanggan `TEST…`, Pelaksana Order **Internal**, 3 baris layanan (3 tanggal) | Order "Dibuat"; 3 hari "Terjadwal"; Harga Final = jumlah baris; aplikasi driver belum menampilkan apa pun | tangkapan layar + query hari |
| SIT-12 (DSB-21) | Pelanggan uji sudah ada | Buat Order baru, ketik nomor pelanggan uji dalam format lain (`+62…`) | Petunjuk pelanggan lama + tombol **Pakai data ini** | tangkapan layar |
| SIT-13 (DSB-24, T1) | Order dengan driver di Hari 1 | **Edit Order**: hapus Hari 1 | Ditolak dengan pesan untuk membatalkan hari itu lewat Edit Hari; hari, driver, payable tetap utuh | tangkapan layar error + query hari/payable sebelum-sesudah |
| SIT-14 (T1, HANDOFF 2.1) | Order 1 hari yang masih akan jalan | Edit Order: hapus satu-satunya hari | Ditolak, diarahkan ke **Batalkan Pesanan** | tangkapan layar |
| SIT-15 (DSB-25, API-64) | Order dengan invoice aktif | Edit Order, ubah harga sebuah hari: 1. tanpa alasan; 2. sampai total di bawah total invoice aktif | 1. form meminta alasan; 2. pesan error API, harga tidak berubah | tangkapan layar |
| SIT-16 (API-65c) | Hari milik driver HP 1, konfirmasi sudah "Terkirim" | Edit Order: geser jam jemput hari itu | HP 1 dapat push "Jadwal tugas diubah"; kolom Konfirmasi jadi **Berubah, perlu kirim ulang** | tangkapan layar HP + kolom Konfirmasi |
| SIT-17 (NEW-13, DSB-26, T5) | Satu order Selesai, satu order Dibatalkan | Buka halaman order dan Trip → Edit pada harinya | Banner hanya-baca; tombol **Ubah/Tugaskan** per hari nonaktif dengan alasan "Order sudah selesai; hari tidak bisa diubah." / "Order sudah dibatalkan; hari tidak bisa diubah."; invoice, bayar, refund masih tersedia; `PUT /schedule/lines/:id` dijawab 409 | tangkapan layar + output curl |
| SIT-18 (T4) | Order sudah DP | Lihat halaman order | Tidak ada tombol "Tetapkan untuk Semua"; **Ganti Semua** hanya tampil bila order sudah DP dan masih ada hari yang belum dimulai | tangkapan layar |

### 2.5 Invoice, pembayaran, WhatsApp

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-19 (API-70, DSB-30) | Order uji Rp 1.000.000 | **Invoice Sewa** → Uang Muka (DP) Rp 150.000 (15%) | Petunjuk minimum 20% tampil; API menolak, invoice tidak dibuat | tangkapan layar error |
| SIT-20 (API-71) | – | Invoice DP Rp 300.000 → **Buat Invoice** | Invoice "Diterbitkan"; status bayar order tetap **Belum Terbayar** | tangkapan layar |
| SIT-21 (DSB-31) | Invoice SIT-20 | **Tandai Terbayar** tanpa file / file 12 MB / file GIF | "Bukti pembayaran wajib diupload." / "Ukuran file maksimal 10MB." / "File harus JPEG, PNG, WebP, atau PDF." | tangkapan layar tiap pesan |
| SIT-22 (API-77, PR #13) | Invoice SIT-20 | Tandai Terbayar dengan bukti uji, metode **Transfer Bank**, Jumlah Diterima kosong | Toast "… ditandai terbayar — kini jadi kwitansi"; order **DP Terbayar**; kwitansi bernomor; metode tercatat Transfer Bank (bukan otomatis Tunai) | tangkapan layar + query `orders` (`payment_status`, `paid_to_date`) |
| SIT-23 (T3, API-78, DSB-32) | Invoice baru yang belum dibayar | Buka order yang sama di dua tab, tekan Tandai Terbayar di keduanya hampir bersamaan; di satu tab tekan dua kali cepat | Tombol berubah "Memproses…"; hanya **satu** kwitansi; `total_paid` pelanggan bertambah sekali | query kwitansi ganda (TEST-PLAN §10) = 0 baris |
| SIT-24 (HANDOFF 2.3) | Order uji terpisah (order ini akan "rusak", lihat catatan) | Invoice DP 20%, Tandai Terbayar dengan **Jumlah Diterima** hanya 10% sewa | Invoice jadi Terbayar, tetapi order tetap **Belum Terbayar** dan driver tidak bisa ditugaskan. Catatan: sisa uang tidak bisa ditagih lagi (B3, belum diperbaiki, §6.2) | tangkapan layar + query |
| SIT-25 (HANDOFF 2.3) | Invoice DP belum dibayar | **Revisi** invoice DP ke jumlah < 20% | Ditolak | tangkapan layar |
| SIT-26 (T2, API-81, DSB-33) | Invoice belum dibayar | Revisi ke jumlah sah (≥ 20%) | Invoice lama "Direvisi", invoice baru terbit; status bayar order **tidak** berubah | tangkapan layar |
| SIT-27 (API-72, API-80) | Order DP Terbayar, driver HP 1 sudah "Sampai" tetapi belum "Mulai perjalanan" | 1. Di order lain tanpa DP: Invoice Sewa → Pelunasan; 2. di order ini: Pelunasan (Sisa Tagihan) → Tandai Terbayar | 1. ditolak; 2. order **Terbayar**; HP 1 dapat push "Order … sudah lunas" tepat sekali | tangkapan layar HP + dashboard |
| SIT-28 (API-79, DSB-72) | Invoice Pembayaran Penuh belum dibayar | Tandai Terbayar dengan Jumlah Diterima lebih besar dari invoice | Order **Terbayar** + tanda **Perlu refund**; **Tandai Refund** wajib bukti; sesudahnya **Sudah refund**. (Saldo lebih di order belum dibangun, §6.2) | tangkapan layar |
| SIT-29 (API-87, DSB-36, HANDOFF 2.4, 2.5) | Invoice, kwitansi, invoice biaya pembatalan, order dengan satu hari batal | Buka PDF lewat **Pratinjau** / **Lihat** | Hanya rekening **BCA 0954840782 a.n. PT Ayomi Raya Karsa**; kode order ARS; teks pembatalan 20% / 50% s.d. 10.00 WIB & belum berangkat / 100%; hari batal tercetak "(Dibatalkan)" Rp 0; order batal punya baris "Biaya Pembatalan — <tier>"; angka dibulatkan ke rupiah; persen overtime 10% (belum ada daftar harga terbit) | PDF disimpan |
| SIT-30 (API-83, API-84, DSB-35) | Invoice Diterbitkan, invoice Direvisi, invoice belum dibayar | Tekan **Kirim** pada invoice aktif; coba kirim invoice Direvisi; coba **Kirim Kwitansi** sebelum Terbayar | Tab WhatsApp terbuka ke `62…` (nomor uji) dengan pesan terisi, popup tidak diblokir, riwayat kirim bertambah; invoice Direvisi dan kwitansi sebelum Terbayar ditolak | tangkapan layar WA + toast |

### 2.6 Penugasan dan aplikasi driver

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-31 (API-90, DSB-40) | Order belum dibayar | Halaman order → Hari 1 → **Tugaskan** (Edit Hari); juga `PUT /schedule/lines/:id` dengan driver internal (curl) | Pilihan driver terkunci + catatan "Order ini belum dibayar…"; laci hari di Trip menampilkan **Menunggu DP**; API 409 "Order belum dibayar…"; memilih mobil dan hari rekanan tetap boleh | tangkapan layar + output curl |
| SIT-32 (API-92, NEW-12) | Order DP Terbayar, trip hari ini | Edit Hari: Driver = driver uji 1, Mobil = mobil uji → **Simpan & Hitung Ulang** | Hari dan order **Ditugaskan**; Fee driver terisi dari tabel; HP 1 dapat push "Tugas baru" dan "Pengingat trip"; kartu tugas menampilkan **Terima tugas** | tangkapan layar HP + query hari/payable |
| SIT-33 (DSB-44, NEW-12) | Driver uji 1 sudah punya trip jam itu | Tugaskan driver yang sama ke order lain di jam yang bentrok; lalu di tanggal lain | Bentrok: tidak bisa dipilih/ditolak; tanggal lain: boleh | tangkapan layar |
| SIT-34 (APP-20, NEW-02) | SIT-32 | HP 1: **Terima tugas** | Halaman order "Diterima driver" dalam ±10 detik; lonceng dashboard bertambah satu | tangkapan layar + jam |
| SIT-35 (APP-21, API-115) | Order belum lunas | HP 1: **Odometer awal** (foto + km) lalu **Berangkat dari garasi** | Boleh; banner "Pelanggan belum lunas…"; hari **Berjalan**; notifikasi admin "berangkat" | tangkapan layar HP + dashboard |
| SIT-36 (APP-40, APP-41, DSB-53) | Di titik jemput, GPS aktif | HP 1: **Sampai di lokasi jemput** → **Buka kamera GPS** → tunggu GPS siap → potret → **Kirim & tandai sampai** | Foto bercap (jam, tanggal, kode order, nama driver, GPS ± akurasi, alamat); dashboard "Bukti sampai lokasi jemput": foto, koordinat, akurasi, **Lihat di peta**, **Rute ke alamat jemput** | tangkapan layar HP + dashboard |
| SIT-37 (APP-42, APP-45) | Tempat tertutup / aplikasi lokasi palsu | Ulangi "Sampai" pada order uji kedua | GPS lemah: sesuai versi APK (lihat §6.3 no. 1), dashboard **Tanpa foto/GPS**; lokasi palsu: banner merah di HP, badge **Lokasi palsu terdeteksi** di dashboard | tangkapan layar |
| SIT-38 (APP-23, API-119) | Order belum lunas | HP 1 lihat tombol berikutnya | **Mulai perjalanan (menunggu pelunasan)** nonaktif + **Hubungi admin (WhatsApp)** ke 0821-2402-4281 dengan pesan berisi kode order; API 409 "Order belum lunas…" | tangkapan layar |
| SIT-39 (APP-50, APP-51, API-128) | – | Odometer akhir sebelum awal; akhir < awal | Terkunci "Kirim odometer awal dulu"; "Angka akhir lebih kecil dari odometer awal (…)"; server 409 untuk urutan salah | tangkapan layar |
| SIT-40 (API-122, DSB-52) | Order lunas | HP 1: **Mulai perjalanan** → **Selesai** → **Ya, selesai** | Hari **Selesai**; order **Menunggu Finalisasi**; Trip → Riwayat menampilkan linimasa (Diterima driver, Berangkat, Tiba di penjemputan, Pelanggan naik, Selesai, Lapor selesai) dan laporan berlabel *Aplikasi* | tangkapan layar Riwayat |
| SIT-41 (API-102, N3) | Hari milik HP 1, belum dimulai | Edit Hari: ganti driver ke driver uji 2 | HP 1 dapat "Tugas dialihkan" dan tugas hilang; HP 2 dapat "Tugas baru" dan harus **Terima tugas** lagi | tangkapan layar kedua HP |
| SIT-42 (DSB-48, API-171, API-173) | Hari dengan driver + mobil | Trip → kolom **Konfirmasi** → **Kirim ke Customer**, lalu **Kirim juga ke driver (WhatsApp)**; ganti driver; **Kirim Perubahan** + **Beri tahu driver lama** | WhatsApp terbuka dengan pesan terisi; status **Terkirim** → **Berubah, perlu kirim ulang** → Terkirim lagi | tangkapan layar WA |
| SIT-43 (API-176) | Trip internal besok, driver sudah ditugaskan sebelum 17.00 | Tunggu pukul 17.00 WIB | Driver dapat "Pengingat trip" satu kali | tangkapan layar HP + jam |
| SIT-44 (HANDOFF §4, API-113) | Hari rekanan di order uji | Lihat aplikasi HP 1 dan HP 2 | Hari rekanan tidak muncul di aplikasi; tidak terkena aturan DP | tangkapan layar |
| SIT-45 (APP-13, API-58) | Tugas di HP 1 | Buka detail tugas | Jadwal WIB, lokasi, pelanggan, mobil, paket, catatan; **tanpa** NIK dan tanpa harga | tangkapan layar |

### 2.7 Tanpa sinyal dan idempotensi

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-46 (APP-60, APP-61, E2E-03) | Order uji kedua, sudah DP | HP 1 Mode Pesawat → Berangkat dari garasi, Sampai (foto), struk Bensin → matikan Mode Pesawat (aplikasi terbuka) | Layar langsung berubah; banner "menunggu dikirim"; setelah sinyal kembali semua terkirim berurutan; jam di server = jam tombol ditekan; tidak ada data ganda | query `trip_reports` (`client_ref`, jam) |
| SIT-47 (APP-62) | – | Tekan tombol saat offline → tutup aplikasi → nyalakan data → tunggu 15–30 menit tanpa membuka aplikasi | Terkirim oleh sinkron latar belakang | query DB + jam |
| SIT-48 (APP-28, API-116) | – | Tekan satu langkah dua kali cepat; kirim ulang aksi dengan `client_ref` sama (curl) | Satu baris laporan; tidak ada perubahan ganda | query |
| SIT-49 (APP-66, E2E-04) | HP 1 offline menyimpan Berangkat + struk | Admin alihkan hari ke HP 2; HP 1 online | HP 1: pesan "sudah tidak ditugaskan ke Anda…", antrean dibuang, tugas hilang; HP 2 bisa menjalankan | tangkapan layar HP 1 |
| SIT-50 (APP-63) | Ada data menunggu | Profil → **Kirim sekarang** | "Semua data sudah terkirim" atau jumlah yang belum terkirim + penyebab | tangkapan layar |
| SIT-51 (DSB-61, API-144) | – | Halaman order → Biaya perjalanan → **Tambah biaya**, tekan **Simpan** dua kali cepat | Satu biaya tersimpan | tangkapan layar + query `expenses` |

### 2.8 Biaya perjalanan, finalisasi, utang driver

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-52 (NEW-01, APP-53) | Trip berjalan | HP 1: **Tol** dengan foto struk + jumlah | Lonceng dashboard bertambah dalam ±15 detik: "Biaya perjalanan baru: Tol Rp … — perlu ditinjau"; di order status **Menunggu dicek** | tangkapan layar + jam |
| SIT-53 (APP-56, API-141) | SIT-52 + struk Bensin | Dashboard: **Setujui** Bensin; **Tolak** Tol dengan alasan | Status Disetujui / Ditolak; HP 1 dapat push "Biaya ditolak: <alasan>"; total di HP tanpa yang ditolak | tangkapan layar |
| SIT-54 (NEW-11, API-142, N2) | Order **Terbayar** | Biaya "Dibayar driver — diganti lewat fee" + centang **Ditagih ke pelanggan (Invoice Tambahan)** → Setujui | Harga final naik; status kembali **DP Terbayar**; **Invoice Tambahan** bisa menagih sisa; ringkasan "Yang bayar dulu" / "Akhirnya ditanggung" tidak dobel; driver tetap diganti lewat fee | tangkapan layar panel |
| SIT-55 (DSB-62, API-160) | Masih ada biaya Menunggu dicek | **Finalisasi Pesanan** | Ditolak dengan pesan masih ada biaya yang menunggu dicek | tangkapan layar |
| SIT-56 (API-161) | Semua biaya dicek | Finalisasi Pesanan → konfirmasi | Order **Selesai**; hari terkunci (SIT-17) | tangkapan layar |
| SIT-57 (API-151, DSB-63, DSB-46) | Order selesai | Keuangan → Utang → Tagihan Driver → **Bayar** (klik dua kali); lalu buka Edit Hari hari itu | Sekali bayar; HP dapat "Fee sudah dibayar" dengan rincian fee + ganti biaya − uang jalan; Edit Hari: "Fee hari ini sudah dibayar ke driver. Tandai belum terbayar dulu…", fee/uang jalan/driver tidak bisa diubah | tangkapan layar |

### 2.9 Pembatalan dan aturan Edit Hari

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-58 (API-162, DSB-70, DSB-71) | Order uji untuk H+2, DP 30% terbayar, driver HP 1 | **Batalkan Pesanan** tanpa alasan, lalu dengan alasan | Tanpa alasan: "Mohon isi alasan pembatalan"; dengan alasan: Tier 1, biaya 20% harga final, uang masuk menutupnya sehingga **tidak ada** invoice pembatalan, **Refund ke pelanggan** 10%; invoice lama "Dibatalkan"; tugas hilang dari HP 1; driver/mobil bebas lagi | tangkapan layar ringkasan + query |
| SIT-59 (API-163, N4) | Order hari ini, DP 30%, belum ada yang berangkat, **sebelum 10.00 WIB** | Batalkan Pesanan | Tier 2 (50%); "Invoice pembatalan … dibuat untuk sisa Rp 200.000"; PDF baris "Biaya Pembatalan — Tier 2" | PDF + jam pembatalan |
| SIT-60 (API-163, API-165, N7) | Order hari ini, driver sudah **Berangkat** (atau sesudah 10.00 WIB) | Batalkan Pesanan | Tier 3 (100%); hari yang sudah berangkat tetap menyimpan driver dan fee | tangkapan layar + query payable |
| SIT-61 (HANDOFF 6 Okt, 2.1, 2.2) | Order 3 hari | 1. Hari 1 selesai, lalu Batalkan Pesanan; 2. di order lain, Edit Hari batalkan hari terakhir yang masih aktif; 3. Edit Hari batalkan satu hari sehingga total < invoice terbit; 4. Edit Hari batalkan satu hari pada order yang sudah lunas; 5. Batalkan order yang semua harinya selesai; 6. Batalkan dua kali | 1. banner "Sisa hari pesanan ini dibatalkan, tinggal finalisasi", total = biaya pembatalan (tier 3), Edit Order/Tambah Biaya/batal kedua ditolak, Finalisasi → Selesai; 2. ditolak "Pakai tombol Batalkan Pesanan…"; 3. ditolak; 4. ditolak (sampai B1.2/B3 selesai); 5. ditolak, pakai Finalisasi; 6. ditolak | tangkapan layar tiap pesan |

### 2.10 GA4

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-62 (API-41, DSB-14) | Order dari lead SIT-05 (sama dengan UAT-01), persetujuan pemilik | Tandai Terbayar invoice pertama | Satu event `purchase` di GA4 Realtime; kartu lead menampilkan **DP masuk** dan **Omzet sudah tercatat di GA4**; `purchase_reported_at` terisi | tangkapan layar GA4 + kartu lead + jam |
| SIT-63 (API-41) | SIT-62 | Tandai Terbayar invoice pelunasan | Tidak ada event `purchase` kedua | GA4 Realtime + `purchase_reported_at` tidak berubah |
| SIT-64 (API-43) | Order dari lead uji lain, invoice belum dibayar | Revisi invoice | Tidak ada event `purchase` | query `purchase_reported_at` kosong |

### 2.11 Storage dan data pribadi

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-65 (API-86) | Invoice Terbayar | Halaman order → **Bukti Bayar**; salin URL file dari viewer (**Buka di tab baru**) | URL bertanda tangan (berlaku 1 jam menurut kode API); setelah lewat 1 jam URL yang sama ditolak storage; dibuka ulang dari dashboard berhasil | tangkapan layar + jam buka/tolak |
| SIT-66 (API-51, DSB-85) | Pelanggan `TEST…` dengan NIK contoh | Pelanggan (daftar), lookup nomor di Buat Order, detail pelanggan | Daftar dan lookup: NIK tersamar (4 + 8 bintang + 4); NIK penuh hanya di detail pelanggan | tangkapan layar |
| SIT-67 (API-53, API-54) | **Belum bisa diuji** sampai pemilik menyetujui rencana uji dokumen pelanggan (HANDOFF §4) | Bila disetujui: unggah gambar `CONTOH` (bukan KTP asli) di detail pelanggan → **Lihat** | File di bucket privat; URL berlaku 5 menit, sesudahnya ditolak | tangkapan layar + jam |
| SIT-68 | – | Salin URL PDF invoice dan foto laporan driver, buka di jendela penyamaran (tanpa login) | **Catat perilakunya, bukan lulus/gagal.** Kode API menyimpan PDF invoice/kwitansi (bucket `invoices`) dan foto driver (`driver-reports`) sebagai URL publik, bukan URL bertanda tangan. PDF memuat nama dan nomor HP pelanggan; bila bisa dibuka tanpa login, ajukan ke pemilik sebagai keputusan UU PDP | tangkapan layar |

### 2.12 Notifikasi dan kartu e-toll

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-69 (ETL-02, ETL-08) | Kartu kantor terdaftar | HP 1: Profil → Kartu e-toll → **Ambil kartu**; kemudian **Kembalikan** (sekali dalam Mode Pesawat) | Dashboard: kartu "Dipegang <driver> sejak …" lalu **Di kantor**; notifikasi admin; HP hanya menampilkan 4 angka terakhir; aksi offline terkirim sekali | tangkapan layar |
| SIT-70 (NEW-05, ETL-04) | HP 1 memegang kartu | **Minta top-up** pada kartu itu (sisa saldo opsional) | Lonceng + Notifikasi → **Permintaan driver** menampilkan kartu dan saldo | tangkapan layar |
| SIT-71 (NEW-06) | SIT-70 masih menunggu | Tekan Minta top-up lagi; ulangi dari HP 2 untuk kartu yang sama; kirim satu dalam Mode Pesawat | Tidak ada permintaan ganda ("sudah diminta… menunggu admin"); yang offline terkirim sekali | tangkapan layar |
| SIT-72 (NEW-07, ETL-05) | SIT-70 | Notifikasi → **Tandai sudah top-up** → **Kartu yang diisi**, **Nominal top-up** → **Ya, sudah top-up**; tekan sekali lagi lewat tab lain | Riwayat kartu "Top-up +Rp …", perkiraan saldo naik; HP dapat push + pengingat tempel kartu; klik kedua ditolak (409) | tangkapan layar |

### 2.13 Daftar harga → website

| ID | Prasyarat | Langkah | Hasil yang diharapkan | Bukti |
|---|---|---|---|---|
| SIT-73 | – | Penjualan → **Daftar Harga** | Halaman memuat; tulisan "Belum pernah diterbitkan ke website" (keadaan 7 Okt) | tangkapan layar |
| SIT-74 (HANDOFF 3.1) | – | Tekan **Terbitkan ke website**, baca dialog, lalu tekan **Batal** (jangan terbitkan) | Dialog memperingatkan harga usulan dan meminta centang "Saya paham, … harga usulan ini ikut tampil…" sebelum bisa terbit | tangkapan layar dialog |
| SIT-75 | Pemilik sudah mengonfirmasi harga usulan (PRICE.md §8), `WEB_DEPLOY_HOOK_URL` diisi, branch `claude/price-list` di `arasya-web` siap | Terbitkan → cek website | **Belum bisa diuji** (HANDOFF "Status 7 Okt" 3.2): harga belum dikonfirmasi pemilik, belum pernah diterbitkan, dan website belum membaca daftar harga. Jalankan saat penerbitan pertama yang sungguhan | – |

Uji simpanan dari tab lama (409) tidak dimasukkan karena mengubah draf harga resmi. Bila tetap ingin diuji, kembalikan nilainya sesudahnya dan cek tab **Riwayat**.

---

## 3. UAT (User Acceptance Test)

Untuk pemilik bisnis dan tim admin. Setiap skenario adalah cerita kerja sehari-hari. Ikuti langkahnya satu per satu, lalu isi tabel "Hasil yang benar": **Lulus** bila sama persis, **Gagal** bila berbeda (tulis apa yang terjadi di kolom Catatan, lalu laporkan seperti §4).

Cara membaca langkah:
1. **Tebal** = nama menu, tombol, atau tulisan persis seperti di layar.
2. "Menu Penjualan → Order" = di menu kiri, kelompok Penjualan, klik Order. Di HP, menu dibuka lewat tombol garis tiga (**Buka menu**).
3. Tulis jam WIB setiap kali ada yang aneh.

Data uji yang dipakai berulang:

| Data | Isi |
|---|---|
| Pelanggan | `TEST Pelanggan Satu` (0800-0000-0001), `TEST Pelanggan Dua` (0800-0000-0002); ganti nomor dengan HP uji tim |
| Harga uji | Rp 1.000.000 per hari |
| Driver | driver uji 1 (HP 1), driver uji 2 (HP 2) |
| Bukti bayar | gambar bertuliskan `BUKTI UJI` |
| Catatan order | `UJI SIT/UAT – jangan diproses` |

### UAT-01 Pesanan dari website sampai selesai

**Cerita:** calon pelanggan memesan lewat website untuk hari ini. Admin membuat order, menagih DP, menugaskan driver. Driver menjemput dengan foto GPS dan mengirim struk. Pelanggan melunasi, perjalanan berjalan, admin menutup order dan membayar fee driver.

**Pemeran:** penguji pelanggan (HP browser), admin (laptop), driver uji 1 (HP 1). **Waktu:** pagi, jam jemput ±2 jam dari sekarang di alamat yang bisa didatangi driver.

Langkah:
1. Pelanggan memesan
   1.1. Di HP, buka arasya-web.vercel.app dan isi form pemesanan: nama `TEST Pelanggan Satu`, nomor HP uji, tanggal hari ini, jam jemput, alamat jemput, unit yang ada di armada Arasya.
   1.2. Kirim. WhatsApp terbuka ke 0821-2402-4281 dengan pesan berisi kode `ARS-…`. Kirim pesannya dan catat kodenya.
2. Admin membuat order dari lead
   2.1. Menu Penjualan → **Lead Website** → tab **Baru**. Cari kode ARS tadi.
   2.2. Klik **Buat order**. Data perjalanan sudah terisi. Isi nomor HP pelanggan, Harga Satuan Rp 1.000.000, dan Catatan `UJI SIT/UAT – jangan diproses`.
   2.3. Klik **Buat Order**.
   2.4. Sebelum menagih DP, coba Hari 1 → **Tugaskan**. Lihat pilihan driver, lalu tutup dialog tanpa menyimpan.
3. Admin menagih DP
   3.1. Di halaman order, bagian **Invoice & Pembayaran**, klik **Invoice Sewa**.
   3.2. Tipe Invoice **Uang Muka (DP)**, Metode Pembayaran **Transfer Bank**, Jumlah 300.000, lalu **Buat Invoice**.
   3.3. Klik **Pratinjau** untuk melihat PDF-nya. Tutup.
   3.4. Klik **Kirim**. WhatsApp terbuka; kirim ke nomor uji.
4. Admin mencatat DP masuk
   4.1. Klik **Tandai Terbayar** pada invoice DP.
   4.2. Unggah **Bukti Pembayaran** (gambar `BUKTI UJI`), pilih **Transfer Bank**, biarkan **Jumlah Diterima** kosong, klik **Tandai Terbayar**.
   4.3. Buka lagi Lead Website → tab **Jadi order** dan lihat kartu lead ini.
5. Admin menugaskan driver
   5.1. Di halaman order, bagian **Detail Layanan / Baris Invoice**, pada Hari 1 klik **Tugaskan**.
   5.2. Pilih Driver = driver uji 1 dan Mobil = mobil uji. Klik **Simpan & Hitung Ulang**.
   5.3. Menu Operasional → **Trip** → tab **Jadwal**, cari order ini. Di kolom **Konfirmasi** klik **Kirim ke Customer**, kirim pesannya. Lalu klik **Kirim juga ke driver (WhatsApp)**.
6. Driver menjalankan tugas (HP 1)
   6.1. Buka notifikasi "Tugas baru", lalu tekan **Terima tugas**.
   6.2. Tekan **Odometer awal**, foto dasbor mobil, isi angka km, kirim.
   6.3. Tekan **Berangkat dari garasi**.
   6.4. Sampai di alamat jemput, tekan **Sampai di lokasi jemput** → **Buka kamera GPS**. Tunggu sampai GPS siap, potret mobil dengan patokan, lalu **Kirim & tandai sampai**.
   6.5. Lihat tombol berikutnya. Tekan **Hubungi admin (WhatsApp)** untuk mencoba (tidak perlu dikirim).
   6.6. Tekan **Bensin**, foto struk, isi jumlah (mis. Rp 50.000), kirim. Tekan **Parkir**, foto struk, isi Rp 10.000, kirim.
7. Admin menagih pelunasan
   7.1. **Invoice Sewa** → **Pelunasan (Sisa Tagihan)**, Jumlah 700.000, **Buat Invoice**, lalu **Kirim**.
   7.2. **Tandai Terbayar** dengan bukti uji.
   7.3. Klik **Kirim Kwitansi**.
8. Driver menyelesaikan perjalanan (HP 1)
   8.1. Buka notifikasi "Order … sudah lunas". Tekan **Mulai perjalanan**.
   8.2. Setelah mengantar, tekan **Odometer akhir**, foto, isi km, kirim.
   8.3. Tekan **Selesai** → **Ya, selesai**.
9. Admin memeriksa biaya dan menutup order
   9.1. Di halaman order, bagian **Biaya perjalanan** Hari 1: klik **Setujui** untuk Bensin. Untuk Parkir klik **Tolak**, tulis alasan `uji tolak`, simpan.
   9.2. Klik **Finalisasi Pesanan** → **Finalisasi Pesanan**.
10. Admin membayar fee driver
   10.1. Menu Keuangan → **Utang** → **Tagihan Driver**. Cari kode order.
   10.2. Klik **Bayar** dan konfirmasi.

| No | Hasil yang benar | Lulus / Gagal | Catatan |
|---|---|---|---|
| 1 | Kode ARS di WhatsApp sama dengan kode di Lead Website, di order, dan di PDF invoice | | |
| 2 | Lead langsung ada di tab **Baru** dengan tanda **Ada di armada** | | |
| 3 | Di langkah 2.4 (sebelum DP), pilihan driver terkunci dengan penjelasan bahwa order belum dibayar | | |
| 4 | PDF invoice hanya mencantumkan rekening **BCA 0954840782 a.n. PT Ayomi Raya Karsa** | | |
| 5 | Pesan WhatsApp invoice terisi otomatis dan masuk ke HP uji | | |
| 6 | Setelah Tandai Terbayar: order **DP Terbayar**, invoice berubah jadi **Kwitansi**, metode tercatat Transfer Bank | | |
| 7 | Kartu lead menampilkan **DP masuk** dan **Omzet sudah tercatat di GA4** | | |
| 8 | HP 1 menerima "Tugas baru" dan tugasnya tampil dengan tombol **Terima tugas** | | |
| 9 | Setelah Terima tugas, halaman order menampilkan **Diterima driver** (±10 detik) | | |
| 10 | Driver boleh berangkat walau belum lunas; ada tulisan bahwa pelanggan belum lunas | | |
| 11 | Foto sampai lokasi bercap jam, tanggal, kode order, nama driver, dan titik GPS; tidak bisa memilih foto dari galeri | | |
| 12 | Di halaman order tampil **Bukti sampai lokasi jemput**; **Lihat di peta** dan **Rute ke alamat jemput** membuka peta di lokasi yang benar | | |
| 13 | Tombol **Mulai perjalanan (menunggu pelunasan)** abu-abu dan tidak bisa ditekan sebelum pelunasan | | |
| 14 | Struk Bensin dan Parkir muncul di **Biaya perjalanan** sebagai **Menunggu dicek**, dan lonceng dashboard bertambah | | |
| 15 | Setelah pelunasan dicatat, order **Terbayar**, HP 1 mendapat "Order … sudah lunas", dan tombol **Mulai perjalanan** aktif | | |
| 16 | Halaman order menampilkan urutan **Diterima driver**, **Berangkat**, **Tiba di penjemputan**, **Pelanggan naik**, **Selesai** dengan jam WIB yang cocok | | |
| 17 | HP 1 mendapat notifikasi "Biaya ditolak" dengan alasan `uji tolak` | | |
| 18 | Setelah finalisasi, order **Selesai** dan hari tidak bisa diubah lagi | | |
| 19 | HP 1 mendapat "Fee sudah dibayar" dengan rincian fee + ganti biaya (Bensin) − uang jalan | | |

### UAT-02 Order dibuat admin dari chat WhatsApp

**Cerita:** pelanggan lama memesan lewat chat WhatsApp untuk besok dan langsung membayar penuh.

**Pemeran:** admin, driver uji 1. **Prasyarat:** UAT-01 sudah jalan (pelanggan `TEST Pelanggan Satu` sudah ada).

Langkah:
1. Menu Penjualan → **Order** → **Buat Order**.
2. Di bagian Pelanggan / PIC, ketik nomor HP `TEST Pelanggan Satu` dengan awalan `+62`. Klik **Pakai data ini** saat sistem mengenalinya.
3. **Pelaksana Order**: **Internal**.
4. Isi satu baris layanan: Tanggal Layanan besok, Waktu Jemput, Jemput, Tujuan, Harga Satuan Rp 1.000.000. Catatan `UJI SIT/UAT – jangan diproses`. Klik **Buat Order**.
5. **Invoice Sewa** → **Pembayaran Penuh**, Jumlah 1.000.000, **Buat Invoice**, **Kirim**, lalu **Tandai Terbayar** dengan bukti uji.
6. Hari 1 → **Tugaskan** → driver uji 1 + mobil uji → **Simpan & Hitung Ulang** (sebelum 17.00 WIB).
7. Pukul 17.00 WIB, cek HP 1.
8. Besok, driver menjalankan tugas seperti UAT-01 langkah 6–8. **Jangan finalisasi dulu**; order ini dipakai lagi di UAT-07.

| No | Hasil yang benar | Lulus / Gagal | Catatan |
|---|---|---|---|
| 1 | Nomor `+62…` dikenali sebagai pelanggan lama dan data terisi setelah **Pakai data ini** | | |
| 2 | Order tercatat di profil pelanggan yang sama (Penjualan → Pelanggan → `TEST Pelanggan Satu`) | | |
| 3 | Setelah dibayar penuh, order langsung **Terbayar** | | |
| 4 | HP 1 menerima "Tugas baru", lalu "Pengingat trip" sekitar pukul 17.00 WIB | | |
| 5 | Di hari H tidak ada tulisan "belum lunas"; **Mulai perjalanan** langsung aktif setelah sampai di lokasi | | |
| 6 | Setelah Selesai, order berstatus **Menunggu Finalisasi** | | |

### UAT-03 Order beberapa hari, driver berbeda tiap hari

**Cerita:** pelanggan sewa 2 hari. Hari pertama diantar driver uji 1, hari kedua driver uji 2.

**Pemeran:** admin, driver uji 1 (HP 1), driver uji 2 (HP 2).

Langkah:
1. **Buat Order** untuk `TEST Pelanggan Dua`, Pelaksana **Internal**, dua baris layanan: besok dan lusa, masing-masing Rp 1.000.000.
2. **Invoice Sewa** → **Uang Muka (DP)** Rp 400.000 → **Buat Invoice** → **Tandai Terbayar**.
3. Hari 1 → **Tugaskan** → driver uji 1 + mobil uji A → **Simpan & Hitung Ulang**.
4. Hari 2 → **Tugaskan** → driver uji 2 + mobil uji B → **Simpan & Hitung Ulang**.
5. Cek HP 1 dan HP 2.
6. Menu Operasional → **Trip** → tab **Jadwal** → lihat **Ketersediaan Driver** untuk besok dan lusa.
7. Hari 1: driver uji 1 menjalankan tugas sampai **Sampai di lokasi jemput**.
8. Admin: **Invoice Sewa** → **Pelunasan (Sisa Tagihan)** Rp 1.600.000 → **Tandai Terbayar**. Driver uji 1 lanjut **Mulai perjalanan** → **Selesai**.
9. Hari 2: driver uji 2 menjalankan tugas sampai **Selesai**.
10. Admin: periksa **Biaya perjalanan**, lalu **Finalisasi Pesanan**. Buka **Utang** → **Tagihan Driver**.

| No | Hasil yang benar | Lulus / Gagal | Catatan |
|---|---|---|---|
| 1 | Order menampilkan **Order 2 hari** dan dua baris hari | | |
| 2 | HP 1 hanya melihat hari 1; HP 2 hanya melihat hari 2 | | |
| 3 | Ketersediaan Driver menandai driver uji 1 sibuk besok dan driver uji 2 sibuk lusa | | |
| 4 | Di hari 1, **Mulai perjalanan** baru aktif setelah sewa **kedua hari** lunas | | |
| 5 | Halaman order menampilkan progres "Hari 1 dari 2", lalu "Hari 2 dari 2" | | |
| 6 | Order baru **Menunggu Finalisasi** setelah kedua hari selesai, dan baru **Selesai** setelah Finalisasi | | |
| 7 | Di Utang ada dua tagihan terpisah: hari 1 untuk driver uji 1, hari 2 untuk driver uji 2 | | |

### UAT-04 Order lewat rekanan (vendor)

**Cerita:** pelanggan meminta unit yang tidak ada di armada Arasya. Admin memakai rekanan; driver rekanan tidak memakai aplikasi.

**Pemeran:** admin. Driver uji tidak dipakai.

Langkah:
1. **Buat Order** untuk `TEST Pelanggan Dua`, satu hari (besok), Rp 1.000.000, Catatan uji. Pelaksana **Internal** dulu.
2. Hari 1 → **Tugaskan**. Pilih **Eksternal**.
3. Klik **Vendor baru**, isi nama `TEST Vendor Uji`, klik **Buat vendor**.
4. Klik **Mobil baru**, isi tipe `Innova (UJI)` dan plat `F 0000 UJI`, klik **Tambah mobil**.
5. Di **Driver & unit rekanan**: Nama driver rekanan `TEST Driver Rekanan`, No. HP driver = nomor uji, Plat nomor `F 0000 UJI`.
6. **RTR (biaya vendor, hari ini)** Rp 700.000. Klik **Simpan & Hitung Ulang**.
7. Trip → kolom **Konfirmasi** → **Kirim ke Customer**, lalu **Kirim juga ke driver (WhatsApp)**.
8. **Invoice Sewa** → **Pembayaran Penuh** → **Tandai Terbayar**.
9. Besok, setelah perjalanan: Trip → baris hari itu → **Edit** → Status **Selesai** → **Simpan & Hitung Ulang**.
10. **Finalisasi Pesanan**.
11. **Utang** → **Tagihan Vendor** → cari `TEST Vendor Uji` → **Bayar**.

| No | Hasil yang benar | Lulus / Gagal | Catatan |
|---|---|---|---|
| 1 | Hari rekanan bisa diatur walau order belum dibayar (tidak ada syarat DP) | | |
| 2 | Plat tersimpan dengan huruf besar | | |
| 3 | Pesan konfirmasi ke pelanggan berisi nama driver rekanan dan plat | | |
| 4 | Tugas ini **tidak** muncul di aplikasi driver uji 1 maupun 2 | | |
| 5 | Kartu **Keuangan & Margin** menunjukkan harga jual Rp 1.000.000, RTR Rp 700.000, margin Rp 300.000 | | |
| 6 | Setelah Finalisasi, tagihan vendor Rp 700.000 tampil di Utang dan bisa dibayar sekali | | |

### UAT-05 Pelanggan membatalkan sebelum hari perjalanan

**Cerita:** pelanggan sudah DP 30%, lalu membatalkan dua hari sebelum berangkat. Menurut kebijakan, biaya pembatalan 20% dari total order, jadi Arasya mengembalikan sisanya.

**Pemeran:** admin, driver uji 1.

Langkah:
1. **Buat Order** `TEST Pelanggan Dua`, satu hari di H+2, Rp 1.000.000.
2. Invoice DP Rp 300.000 → **Tandai Terbayar**. Tugaskan driver uji 1 + mobil uji.
3. Klik **Batalkan Pesanan**. Coba simpan tanpa alasan dulu.
4. Isi alasan `Pelanggan membatalkan (uji)`, lalu **Batalkan Pesanan**.
5. Baca ringkasan pembatalan.
6. Klik **Tandai Refund**, unggah **Bukti Refund** (gambar `BUKTI UJI`), biarkan jumlah kosong, **Tandai Sudah Refund**.
7. Cek HP 1.

| No | Hasil yang benar | Lulus / Gagal | Catatan |
|---|---|---|---|
| 1 | Tanpa alasan, sistem menolak: "Mohon isi alasan pembatalan" | | |
| 2 | Ringkasan: **Tier 1**, Biaya pembatalan Rp 200.000, Sudah dibayar Rp 300.000, Refund ke pelanggan Rp 100.000 | | |
| 3 | Tertulis bahwa uang yang sudah diterima menutup biaya pembatalan, jadi **tidak ada** invoice pembatalan baru | | |
| 4 | Order **Dibatalkan**, tanda **Perlu refund**; setelah refund dicatat menjadi **Sudah refund** | | |
| 5 | Tugas hilang dari HP 1; driver dan mobil bebas lagi di Ketersediaan Driver | | |
| 6 | Hari order tidak bisa diubah lagi ("Order sudah dibatalkan; hari tidak bisa diubah.") | | |

### UAT-06 Pelanggan membatalkan di hari perjalanan

**Cerita A:** pagi hari H, sebelum pukul 10.00 WIB dan driver belum berangkat, pelanggan membatalkan. Biaya 50%.
**Cerita B:** driver sudah berangkat dari garasi, lalu pelanggan membatalkan. Biaya 100%.

**Pemeran:** admin, driver uji 1. **Waktu:** cerita A harus selesai **sebelum 10.00 WIB**.

Langkah cerita A:
1. Sehari sebelumnya, **Buat Order** `TEST Pelanggan Dua` untuk hari ini (jam jemput siang), Rp 1.000.000. Invoice DP Rp 300.000 → **Tandai Terbayar**. Tugaskan driver uji 1. Driver **tidak** menekan Berangkat.
2. Hari H sebelum 10.00 WIB: **Batalkan Pesanan**, isi alasan, konfirmasi. Catat jamnya.
3. Di bagian invoice, buka invoice **Biaya Pembatalan** lewat **Pratinjau**, lalu **Kirim**.

Langkah cerita B:
1. Order kedua yang sama untuk hari ini, DP terbayar, driver uji 1 ditugaskan.
2. Driver: **Terima tugas** → **Berangkat dari garasi**.
3. Admin: **Batalkan Pesanan**, isi alasan, konfirmasi.

| No | Hasil yang benar | Lulus / Gagal | Catatan |
|---|---|---|---|
| 1 | A: **Tier 2**, Biaya pembatalan Rp 500.000, Sudah dibayar Rp 300.000, Pelanggan masih berhutang Rp 200.000 | | |
| 2 | A: invoice **Biaya Pembatalan** Rp 200.000 terbit untuk sisanya; PDF memuat baris "Biaya Pembatalan — Tier 2" dan rekening BCA PT Ayomi Raya Karsa | | |
| 3 | A: teks kebijakan di PDF sama: 20% sebelum hari H / 50% sampai 10.00 WIB dan belum berangkat / 100% | | |
| 4 | B: **Tier 3**, Biaya pembatalan Rp 1.000.000, invoice pembatalan untuk sisa Rp 700.000 | | |
| 5 | B: hari yang sudah berangkat tetap mencatat driver dan fee-nya (cek Utang) | | |

Catatan: denda per hari untuk order beberapa hari belum dibangun, jadi tidak diuji di sini (§6.2).

### UAT-07 Biaya tambahan overtime → Invoice Tambahan

**Cerita:** pelanggan di UAT-02 memakai mobil 2 jam lebih lama. Admin menagih overtime dan menambah fee driver.

**Pemeran:** admin. **Prasyarat:** order UAT-02 sudah Selesai di aplikasi, belum difinalisasi, fee belum dibayar.

Langkah:
1. Buka order UAT-02. Di bagian **Biaya Tambahan**, klik **Tambah Biaya**.
2. Tipe **Overtime**, Label / Catatan `Overtime 2 jam`, Jumlah Rp 100.000 (angka uji). Klik **Tambah Biaya**.
3. Lihat Harga Final dan status pembayaran.
4. Di **Invoice & Pembayaran**, klik **Invoice Tambahan**. Pilih biaya overtime, Metode **Transfer Bank**, klik **Buat Invoice Tambahan**. Klik **Kirim**.
5. **Tandai Terbayar** dengan bukti uji.
6. Hari 1 → **Ubah** (Edit Hari). Di **Fee driver (hari ini)**, klik tombol **+ Overtime 1 jam** dua kali. Klik **Simpan & Hitung Ulang**.
7. **Finalisasi Pesanan** (baca peringatan biaya tambahan) → konfirmasi.
8. **Utang** → **Tagihan Driver** → lihat tagihan hari itu.

| No | Hasil yang benar | Lulus / Gagal | Catatan |
|---|---|---|---|
| 1 | Harga Final naik Rp 100.000 | | |
| 2 | Status pembayaran turun dari **Terbayar** menjadi **DP Terbayar** sampai tambahan dibayar | | |
| 3 | Invoice Tambahan berisi `Overtime 2 jam` Rp 100.000; setelah dibayar, order kembali **Terbayar** | | |
| 4 | Fee driver bertambah sesuai dua kali **+ Overtime 1 jam** dan rinciannya tertulis | | |
| 5 | Dialog Finalisasi memperingatkan ada biaya tambahan; sesudahnya order **Selesai** | | |
| 6 | Tagihan driver di Utang sama dengan fee baru | | |

### UAT-08 Driver minta top-up kartu e-toll

**Cerita:** driver mengambil kartu e-toll kantor, saldonya menipis, lalu minta top-up lewat aplikasi. Admin mengisi lewat m-banking dan mencatatnya.

**Pemeran:** driver uji 1, admin. **Saran:** jalankan saat kartu memang perlu diisi, supaya top-up-nya sungguhan dan tidak perlu dibatalkan.

Langkah:
1. HP 1: **Profil** → bagian **Kartu e-toll** → **Ambil kartu**, pilih kartu, isi saldo bila tahu, kirim.
2. Admin: menu Operasional → **Kartu E-Toll**. Lihat kartu itu.
3. HP 1: pada kartu yang dipegang, tekan **Minta top-up**, isi sisa saldo, kirim. Tekan **Minta top-up** sekali lagi.
4. Admin: lihat lonceng di atas, lalu menu Ringkasan → **Notifikasi** → bagian **Permintaan driver**.
5. Admin mengisi saldo kartu lewat m-banking (di luar sistem), lalu klik **Tandai sudah top-up**, pilih **Kartu yang diisi**, isi **Nominal top-up** (dan **Saldo setelah top-up** bila m-banking menampilkannya), klik **Ya, sudah top-up**.
6. HP 1: buka notifikasi yang masuk.
7. Setelah kembali ke garasi, HP 1: pada kartu itu tekan **Kembalikan**.
8. Bila top-up tadi tidak sungguhan: admin buka Kartu E-Toll → kartu itu → **Riwayat**, batalkan catatan top-up uji.

| No | Hasil yang benar | Lulus / Gagal | Catatan |
|---|---|---|---|
| 1 | Di Kartu E-Toll, kartu tercatat dipegang driver uji 1; aplikasi hanya menampilkan 4 angka terakhir nomor kartu | | |
| 2 | Lonceng bertambah dan permintaan tampil di **Permintaan driver** dengan nama kartu dan saldo | | |
| 3 | Permintaan kedua tidak membuat permintaan ganda (driver diberi tahu masih menunggu admin) | | |
| 4 | Setelah **Ya, sudah top-up**, riwayat kartu menampilkan "Top-up +Rp …" dan perkiraan saldo naik | | |
| 5 | HP 1 mendapat pemberitahuan top-up sudah diproses dan diingatkan menempelkan kartu untuk update saldo | | |
| 6 | Setelah Kembalikan, kartu tercatat **Di kantor** | | |

### UAT-09 Melihat dokumen dan foto di dalam halaman

**Cerita:** admin memeriksa invoice, kwitansi, bukti bayar, dan foto driver tanpa berpindah tab.

**Pemeran:** admin, di laptop lalu di HP browser. **Prasyarat:** order UAT-01.

Langkah:
1. Buka order UAT-01. Pada invoice DP klik **Pratinjau**.
2. Klik **Kwitansi** / **Lihat** pada kwitansi DP. Klik **Bukti Bayar**.
3. Di **Bukti sampai lokasi jemput**, klik **Buka foto**.
4. Di **Biaya perjalanan**, klik **Struk** pada Bensin.
5. Menu Operasional → **Trip** → tab **Riwayat** → cari order → **Lihat media**. Pakai **Sebelumnya** / **Berikutnya**, **Perbesar**, **Perkecil**, **Putar**.
6. Menu Keuangan → **Invoice** → cari order → pratinjau invoice.
7. Ulangi langkah 1, 2, dan 5 di HP browser.
8. Di salah satu viewer, klik **Buka di tab baru**.

| No | Hasil yang benar | Lulus / Gagal | Catatan |
|---|---|---|---|
| 1 | PDF invoice terbuka besar di dalam halaman (tidak di kotak kecil), isinya terbaca | | |
| 2 | Kwitansi dan bukti bayar terbuka di viewer yang sama | | |
| 3 | Foto driver dan struk terbuka di halaman yang sama, **tidak** membuka tab baru sendiri | | |
| 4 | Penunjuk "1 dari N" benar; Sebelumnya/Berikutnya, Perbesar, Perkecil, Putar berfungsi | | |
| 5 | Di HP, viewer muat di layar dan bisa ditutup; bila PDF tidak bisa tampil, muncul "Browser ini tidak bisa menampilkan PDF di dalam halaman. Buka di tab baru untuk melihatnya." | | |
| 6 | **Buka di tab baru** membuka file yang sama | | |

Dokumen pelanggan (KTP/SIM/NPWP) di viewer **belum bisa diuji** sampai pemilik menyetujui rencana uji dokumen pelanggan (HANDOFF §4).

### UAT-10 Tampilan di HP, tablet, dan laptop

**Cerita:** admin bekerja dari laptop di kantor, tablet, dan HP saat di luar.

**Pemeran:** admin. Buka halaman berikut di tiga perangkat. Isi kolom per perangkat: **L** (Lulus) atau **G** (Gagal), dan tulis masalahnya di Catatan.

Yang dicek di setiap halaman:
1. Menu bisa dibuka (di HP lewat **Buka menu**) dan pengelompokannya sama seperti §2.2 SIT-03.
2. Tidak ada tulisan yang keluar dari tombol atau terpotong; tabel berubah menjadi kartu atau bisa digeser ke samping.
3. Tombol mudah ditekan dengan jari; dialog muat di layar dan bisa digulir.
4. Semua tulisan bahasa Indonesia dan wajar; tidak ada kode aneh seperti `orderDetail.xxx`.
5. Tanggal dan jam tampil WIB.

| No | Halaman | HP | Tablet | Laptop | Catatan |
|---|---|---|---|---|---|
| 1 | Dashboard | | | | |
| 2 | Notifikasi (dan lonceng) | | | | |
| 3 | Lead Website | | | | |
| 4 | Order (daftar, filter, cari) | | | | |
| 5 | Detail order (invoice, Tandai Terbayar, Biaya perjalanan) | | | | |
| 6 | Buat Order | | | | |
| 7 | Pelanggan | | | | |
| 8 | Daftar Harga | | | | |
| 9 | Trip (Jadwal, Edit Hari, Riwayat) | | | | |
| 10 | Driver | | | | |
| 11 | Unit | | | | |
| 12 | Kartu E-Toll | | | | |
| 13 | Eksternal / Vendor | | | | |
| 14 | Invoice | | | | |
| 15 | Utang | | | | |
| 16 | Pendapatan | | | | |
| 17 | Panduan | | | | |

---

## 4. Pelaporan cacat

### 4.1 Tingkat keparahan

| Tingkat | Artinya | Contoh | Tindakan |
|---|---|---|---|
| 1. Kritis | Uang atau data salah/bocor, atau operasional berhenti | status bayar salah, kwitansi dobel, rekening selain BCA PT Ayomi Raya Karsa, NIK/KTP terlihat oleh yang tidak berhak, data order hilang, driver tidak bisa menjalankan tugas | hentikan uji di bagian itu, lapor saat itu juga |
| 2. Tinggi | Fitur utama gagal, ada jalan lain tetapi merepotkan | push tidak masuk, PDF tidak terbuka, WhatsApp tidak terisi | lapor hari itu |
| 3. Sedang | Fitur jalan tetapi hasilnya kurang tepat | angka di ringkasan beda dengan detail, filter salah | kumpulkan, lapor di akhir hari |
| 4. Rendah | Tampilan atau tulisan | teks terpotong, salah ketik, terjemahan janggal | kumpulkan, lapor di akhir uji |

### 4.2 Yang perlu dicatat

1. ID kasus atau skenario (mis. `SIT-23` atau `UAT-01 no. 15`).
2. Kode order `ARS-…` dan nomor invoice/kwitansi bila ada.
3. Jam kejadian (WIB).
4. Perangkat: laptop/tablet/HP, browser, dan nomor build APK untuk aplikasi driver.
5. Akun yang dipakai: email admin atau driver uji 1/2.
6. Langkah yang dilakukan, yang terjadi, dan yang seharusnya.
7. Tangkapan layar atau rekaman layar. **Potong atau tutup** NIK, foto KTP, dan data pribadi lain sebelum dikirim.

Contoh isi laporan:

```
ID: UAT-01 no. 15
Kode order: ARS-XXXXX
Jam: 7 Okt 2026, 14.32 WIB
Perangkat: HP 1, APK af651751
Langkah: admin Tandai Terbayar invoice pelunasan
Yang terjadi: notifikasi "sudah lunas" tidak masuk ke HP 1 setelah 5 menit
Yang seharusnya: notifikasi masuk dan tombol Mulai perjalanan aktif
Tingkat: 2. Tinggi
Lampiran: 2 tangkapan layar
```

### 4.3 Ke mana melapor

1. Penguji UAT melapor ke pemilik teknis lewat kanal yang disepakati tim: `__________` (isi sebelum uji dimulai; sumber yang ada tidak menyebut kanalnya).
2. Pemilik teknis mencatat setiap kegagalan baru di `docs/HANDOFF.md`, sesuai aturan TEST-PLAN §2, lalu menandai di lembar hasil.
3. Sebelum melapor, cek §6.1: bila perilakunya sudah ada di sana, tulis sebagai catatan, bukan cacat baru.

---

## 5. Persetujuan (sign-off)

### 5.1 Ringkasan hasil

| Bagian | Jumlah | Lulus | Lulus dengan catatan | Gagal | Belum bisa diuji |
|---|---|---|---|---|---|
| SIT | 75 kasus | | | | |
| UAT-01 Pesanan dari website sampai selesai | 1 skenario | | | | |
| UAT-02 Order dibuat admin | 1 skenario | | | | |
| UAT-03 Beberapa hari, driver berbeda | 1 skenario | | | | |
| UAT-04 Rekanan (vendor) | 1 skenario | | | | |
| UAT-05 Batal sebelum hari perjalanan | 1 skenario | | | | |
| UAT-06 Batal di hari perjalanan | 1 skenario | | | | |
| UAT-07 Overtime → Invoice Tambahan | 1 skenario | | | | |
| UAT-08 Top-up e-toll | 1 skenario | | | | |
| UAT-09 Viewer dokumen dan foto | 1 skenario | | | | |
| UAT-10 Tampilan HP/tablet/laptop | 1 skenario | | | | |

Cacat yang diterima tanpa diperbaiki dulu (bila ada):

| No | ID | Ringkasan | Tingkat | Alasan diterima |
|---|---|---|---|---|
| 1 | | | | |
| 2 | | | | |

### 5.2 Keputusan

| Nama | Peran | Keputusan (Diterima / Diterima dengan catatan / Ditolak) | Tanggal dan jam (WIB) | Tanda tangan |
|---|---|---|---|---|
| | Pemilik bisnis | | | |
| | Pemilik teknis | | | |
| | Perwakilan tim admin | | | |

Data uji sudah dibersihkan sesuai §1.4: Ya / Belum. Tanggal: ________ WIB.

---

## 6. Lampiran

### 6.1 Perilaku yang sudah diketahui (jangan dilaporkan sebagai cacat baru)

1. Status bayar dan "Mulai perjalanan" memakai angka berbeda (TEST-PLAN N1, N2)
   1.1. Badge "Terbayar" dihitung dari harga final termasuk biaya tambahan; "Mulai perjalanan" hanya butuh sewa hari yang tidak batal lunas. Order bisa "DP Terbayar" di dashboard sementara aplikasi sudah membuka "Mulai perjalanan".
   1.2. Bila total order naik (hari atau biaya tambahan baru), order "Terbayar" kembali menjadi "DP Terbayar" sampai tambahannya dibayar.
2. Melepas driver tanpa pengganti mengirim push berjudul "Tugas dialihkan" dengan teks "dialihkan ke driver lain" (N3).
3. Batas 10.00 WIB untuk tier 2 masih menganggap 10.00 lewat 59 detik sebagai "sebelum 10.00" (N4, B12 sisa).
4. GA4 `purchase` juga terkirim untuk invoice biaya pembatalan bila itu invoice pertama yang dibayar pada order dari lead (B12 sisa).
5. Trip yang lebih tua dari kemarin dan belum ditutup tidak tampil di aplikasi, tetapi masih bisa dibuka lewat notifikasi; dashboard menampilkannya di chip **Belum ditutup** (N8).
6. Tidak ada menu dashboard untuk membuat akun login driver baru (N5).
7. Memindah jam/tanggal hari yang sudah punya driver tidak dicek bentrok (HANDOFF Status 4 Okt sesi 2).
8. Biaya yang dicentang "Ditagih ke pelanggan" tetap diganti ke driver bila "Dibayar driver"; pilihan "Dibayar pelanggan langsung" belum ada (pertanyaan terbuka F3).
9. Temuan keuangan yang masih terbuka (HANDOFF review 6 Okt, BACKLOG §6 no. 1.4)
   9.1. B4: refund belum mengurangi kas, piutang, dan cek lunas.
   9.2. B5: margin di kartu order bisa lebih kecil dari Dashboard untuk hari yang belum ditugaskan.
   9.3. B6: setelah pembatalan, halaman order dan form invoice bisa menyarankan menagih uang yang sudah diterima; API menolaknya.
   9.4. B8: buat invoice / biaya tambahan belum memakai `client_ref`, jadi kirim dobel dalam kondisi tertentu masih mungkin.
   9.5. B10: biaya "dibayar driver" yang ditambah admin ke hari yang fee-nya sudah dibayar tidak pernah diganti.
   9.6. B11: bulan default di Pendapatan memakai jam browser; beberapa filter tanggal di server belum WIB.
10. Saran DP di form invoice memakai harga final, sedangkan API memakai harga hari yang tidak batal; pada order dengan hari batal angkanya bisa beda dan API menolak (BACKLOG §6 no. 1.5).

### 6.2 Belum bisa diuji (menunggu keputusan atau belum dibangun)

| No | Hal | Alasan | Sumber |
|---|---|---|---|
| 1 | Denda per hari saat satu hari dibatalkan (tier sama per hari) | Diputuskan pemilik 7 Okt, belum dibangun | HANDOFF "Keputusan pemilik 7 Okt" 4.1, BACKLOG §6 1.1 |
| 2 | Batalkan Pesanan dihitung per hari (bukan 100% semua hari pada hari H), beserta teks kebijakan baru di website, caption, PDF | Belum dibangun; draf teks harus disetujui pemilik dulu | HANDOFF 4.4 |
| 3 | Saldo lebih di order (kelebihan uang mengurangi tagihan berikutnya atau dikembalikan) | Belum dibangun; sekarang kelebihan bayar menjadi "Perlu refund" | HANDOFF 4.2 |
| 4 | Tandai terbayar dengan uang kurang/lebih + invoice penyesuaian | Belum dibangun; sekarang uang kurang membuat sisa tidak bisa ditagih (B3) | HANDOFF 4.3, B2+B3 |
| 5 | Terbitkan daftar harga → harga tampil di website | Harga usulan belum dikonfirmasi pemilik, belum pernah diterbitkan, website belum membaca daftar harga | HANDOFF "Status 7 Okt" 3.2 |
| 6 | Unggah dan lihat dokumen pelanggan (KTP/SIM/NPWP) di produksi | Menunggu rencana uji data pribadi yang disetujui pemilik | HANDOFF §4 |
| 7 | Saldo dan riwayat kartu e-toll dibaca lewat NFC | Tahap 2, mulai ±10 Okt | BACKLOG §5 |
| 8 | Import Sheet | Format sheet belum sesuai data order sekarang | BACKLOG §7 |
| 9 | Lembur/overtime diajukan dari HP driver | Usulan, belum dikerjakan; overtime sekarang dicatat admin | HANDOFF §00.9 no. 4 |
| 10 | Penugasan driver tanpa DP (pengecualian pelanggan korporat) | Belum ada; semua penugasan internal wajib DP | HANDOFF §0.7 |

### 6.3 Hal yang perlu dikonfirmasi sebelum uji

1. **Perilaku "Sampai" saat GPS tidak dapat lokasi.** HANDOFF §00.2 dan TEST-PLAN APP-42 menulis tombol "Tandai sampai tanpa lokasi". Kode aplikasi di checkout lokal (diubah 7 Okt dini hari, sesudah build af651751) sudah berbeda: foto boleh diambil tanpa GPS dan tombolnya "Tandai sampai tanpa foto"; di API ada perubahan senada yang belum di-commit (HANDOFF "Status 7 Okt" no. 6). Pastikan versi mana yang terpasang di HP dan sesuaikan hasil SIT-37.
2. **PR #13 sudah live atau belum.** HANDOFF menulis PR #13 belum di-merge, tetapi riwayat `main` di checkout ini sudah memuatnya. Cek SIT-03 sebelum UAT-09 dan UAT-10.
3. **Kanal pelaporan cacat** (§4.3) belum ditentukan di sumber mana pun.
