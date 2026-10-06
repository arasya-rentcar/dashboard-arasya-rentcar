# Serah terima — 6 Oktober 2026

Ringkasan kondisi semua repo Arasya Rent Car dan langkah berikutnya. Detail teknis per repo ada di `CLAUDE.md` masing-masing; pekerjaan yang ditunda ada di `docs/BACKLOG.md`.

**Uji:** rencana uji lengkap (API, dashboard, aplikasi, skenario ujung ke ujung) ada di `docs/TEST-PLAN.md`, menggantikan daftar §0.5 dan §00.7. Rencana itu memuat 5 bug yang terbukti di uji lokal 3 Okt malam:
- T1: Edit Order menghapus hari yang berjalan.
- T2: revisi invoice mengubah status bayar.
- T3: klik ganda Tandai Terbayar.
- T4: dua cara penugasan.
- T5: Edit Hari pada order selesai.

**Status 4 Okt:** T1–T3 diperbaiki dan dirilis. API arasya-rentcar/api-arasya-rentcar#2 dirilis lewat "Deploy API" run #68 (`/health` 200). Dashboard arasya-rentcar/dashboard-arasya-rentcar#4 dirilis lewat "Deploy Dashboard" run #65 (VPS) dan "Deploy to Vercel" run #20. Perilaku baru yang perlu diketahui admin:
- `payment_status` ikut total order: order "Terbayar" kembali menjadi "DP Terbayar" bila ada hari atau biaya tambahan baru.
- Hari yang sudah punya driver tidak bisa dihapus lewat Edit Order; batalkan lewat Edit Hari.
- Memindah jam hari milik driver mengirim push "Jadwal tugas diubah" dan meminta konfirmasi dikirim ulang.

Uji API otomatis: `scripts/e2e/run-local.sh` di repo API (154 lolos). Data produksi dicek (SQL baca): tidak ada kerusakan dari T1–T3. 

**Status 4 Okt sesi 2:** T4 diputuskan dan diperbaiki, T5 diperbaiki, fitur baru F1–F6 (kasus uji TEST-PLAN §1.1). **Dirilis 4 Okt 02.11–02.17 UTC:** API arasya-rentcar/api-arasya-rentcar#3 ("Deploy API" run #69, migrasi `20261004090000_admin_notifications_driver_requests`, e2e 230 lolos), dashboard arasya-rentcar/dashboard-arasya-rentcar#6 ("Deploy Dashboard" run #66 + "Deploy to Vercel" run #22), aplikasi arasya-rentcar/mobile-arasya-rentcar#2 → "EAS Build (Android)" run #5, build `e4719304-87c1-4dca-92bb-f8dffe5af40d` (https://expo.dev/accounts/rimbalun/projects/arasyarentcar/builds/e4719304-87c1-4dca-92bb-f8dffe5af40d; pasang APK ini di HP driver).
- Dashboard: lonceng notifikasi (polling 15 detik) + halaman Notifikasi (permintaan top-up e-toll, "Tandai sudah top-up"), field "Kartu e-toll" di Driver, nama tempat di atas koordinat, "Tetapkan untuk Semua" disembunyikan, hari terkunci pada order Selesai/Dibatalkan, panel Biaya perjalanan lebih jelas ("Yang bayar dulu" / "Akhirnya ditanggung").
- Aplikasi (JS saja, perlu APK baru karena belum ada OTA): "Terima tugas" sampai driver menekannya, foto Checkpoint 1/2/… lewat kamera GPS, nama tempat di cap foto, tombol "Minta top-up e-toll" di Profil.
- **Pertanyaan terbuka F3 (pemilik):** biaya yang dicentang "Ditagih ke pelanggan" tetap diganti ke driver bila "Dibayar driver" (pelanggan membayar Arasya lewat Invoice Tambahan). Bila pelanggan sering membayar langsung di jalan, perlu pilihan baru "Dibayar pelanggan langsung". Bila dibayar e-toll/kartu kantor: pilih "Dibayar kantor".
- Belum: memindah jam/tanggal hari yang sudah punya driver tidak dicek bentrok (perlu keputusan); data lama "hari punya driver tapi masih SCHEDULED" tidak diubah otomatis (simpan Edit Hari sekali memperbaikinya).
**Berikutnya:** uji HP §7–§8 + TEST-PLAN §1.1 dengan APK baru.

**Status 5 Okt: kartu e-toll kantor.** Permintaan pemilik: kartu e-toll (±10, campuran bank) jadi satu daftar bersama, bukan teks bebas per driver. Driver mengambil kartu dari tim operasional saat berangkat dan mengembalikannya hanya bila kembali ke garasi; driver sendiri yang mencatat ambil/kembali di aplikasi, admin melihatnya langsung. Kantor top-up lewat m-banking; saldo baru masuk ke chip setelah driver menempelkan kartu untuk update.
- API: tabel `etoll_cards`, `etoll_card_handovers`, `etoll_transactions`, `driver_requests.card_id` (migrasi `20261004150000_etoll_cards`), e2e grup N.
- Dashboard: menu **Kartu E-Toll** (tambah/ubah/nonaktifkan/hapus, riwayat, catat top-up/saldo/tol, serahkan/tandai kembali); "Tandai sudah top-up" meminta kartu + nominal; field teks "Kartu e-toll" di Driver dihapus (kartu yang dipegang tampil di daftar Driver).
- Aplikasi: Profil → Kartu e-toll (ambil, kembalikan, catat sisa saldo, minta top-up per kartu) + layar "Tes kartu NFC". Perlu APK baru (modul NFC). APK lama tetap jalan: permintaan top-up dari APK lama ditautkan ke kartu yang dipegang driver, atau admin memilih kartunya.
- **Dirilis 4 Okt 18.49–19.11 UTC:** API arasya-rentcar/api-arasya-rentcar#4 ("Deploy API" run #70, migrasi `20261004150000_etoll_cards`, e2e 267 lolos), dashboard arasya-rentcar/dashboard-arasya-rentcar#8 ("Deploy Dashboard" run #67 + "Deploy to Vercel" run #24), aplikasi arasya-rentcar/mobile-arasya-rentcar#4 → "EAS Build (Android)" run #7, build `af651751-3348-4b9b-aae5-0904f9511a51` (https://expo.dev/accounts/rimbalun/projects/arasyarentcar/builds/af651751-3348-4b9b-aae5-0904f9511a51; pasang APK ini di HP driver).
- **Langkah pemilik/admin:** daftarkan ke-10 kartu di Kartu E-Toll (nomor lengkap + saldo bila tahu); pasang APK baru; uji NFC: tempelkan satu kartu dari tiap bank di "Tes kartu NFC" dan kirim hasilnya (lihat TEST-PLAN §1.2, BACKLOG §5).

**Status 6 Okt: satu rumus keuangan (review keuangan 5 Okt, temuan A1–A3, A6–A8). Dirilis 6 Okt.**
- Pendapatan di Dashboard dan halaman Pendapatan = harga hari + biaya tambahan (overtime dll., dihitung pada tanggal dicatat) + biaya pembatalan (pada tanggal pembatalan). Biaya perjalanan yang ditagihkan ulang ke pelanggan = pass-through (bukan pendapatan, bukan biaya). Hari yang dibatalkan tetap membawa biayanya (fee driver/RTR bila trip sudah jalan). Kartu "Keuangan & Margin" order memakai rumus yang sama (margin v5) dan dihitung ulang saat order dibatalkan.
- Pembatalan: invoice biaya pembatalan hanya untuk sisa yang belum dibayar; tidak ada invoice bila uang yang sudah masuk menutupnya. Sebelumnya pembatalan sebelum hari H dengan DP selalu membuat invoice ISSUED yang, bila ditandai terbayar, mencatat uang yang tidak pernah masuk. Biaya, tanggal, dan alasan disimpan di order (`cancellation_fee`, `cancelled_at`, `cancellation_reason`; migrasi `20261006090000_order_cancellation_fields` mengisi order lama dari log perubahan).
- Batal setelah hari 1 selesai (diputuskan 6 Okt): order tetap "Menunggu finalisasi" dengan total = biaya pembatalan (tier 3 = 100%); Edit Order, biaya tambahan, dan batal kedua ditolak; hari yang dibatalkan terkunci; Finalisasi menutupnya sebagai Selesai dengan catatan pembatalan. Dashboard menampilkan keterangan ini di halaman order.
- Pendapatan = harga ke pelanggan, termasuk hari rekanan; RTR adalah biaya, markup terlihat di margin (diputuskan 6 Okt). Piutang di Dashboard sekarang memuat biaya pembatalan yang belum dibayar.
- Uang yang sudah diterima pada invoice yang dibatalkan dihitung sebagai sudah ditagih, jadi tidak bisa ditagih ulang. Order yang semua harinya sudah selesai tidak bisa dibatalkan (pakai Finalisasi).
- Uji: e2e API 293 lolos (grup O baru; E3, G15, D19b disesuaikan/ditambah); dashboard `tsc` + `next build` lolos. Rilis API dulu (ada migrasi), lalu dashboard.
- **Rilis:** API `fc37142` di `main`; migrasi `20261006090000_order_cancellation_fields` tercatat di `_prisma_migrations` produksi 5 Okt 21.14 UTC (dicek SQL baca 6 Okt; kolom `cancellation_fee`, `cancelled_at`, `cancellation_reason` ada). Dashboard `9640cc9` di-push ke `main` 6 Okt ±09.00 UTC; dashboard.haikuy.com menyajikan build baru ±90 detik kemudian (teks "…tinggal finalisasi" ada di JS live). Salinan Vercel tidak dicek.
- Dokumen review 5 Okt (seri A) hilang; diganti review ulang 6 Okt di bawah.

**Review keuangan ulang 6 Okt (B1–B12), belum diperbaiki.** Dibaca dari kode API (`main` + working tree `claude/price-list`, yang tidak menyentuh logika uang) dan dashboard `main`. B1–B3 dicek ulang langsung di kode.
- **B1 (tinggi):** membatalkan hari lewat Edit Hari (`schedule.service.ts` `assignScheduleLine`) tidak lewat `cancelOrder`: tanpa denda, `cancellation_fee` kosong, invoice ISSUED tetap aktif. Bila semua hari batal, `order-derive.service.ts:72` menjadikan order CANCELLED. Pembatalan sebagian juga bisa menurunkan total di bawah nilai invoice (Edit Order menolak ini, Edit Hari tidak). **Perlu keputusan pemilik:** hari terakhir wajib lewat "Batalkan Order"? satu hari dari order multi-hari kena denda? tolak bila total < invoice?
- **B2 (sedang–tinggi):** DP ≥ 20% hanya dicek saat invoice dibuat (`invoices.service.ts:371`); revisi DP dan `amount_received` (cukup > 0) tidak dicek, jadi DP_PAID dan penugasan driver bisa terjadi dengan Rp 1.
- **B3 (sedang):** invoice ditandai terbayar dengan uang kurang → sisa tidak bisa ditagih lagi (tagihan dihitung dari nilai invoice, bukan uang masuk); "Mulai perjalanan" terkunci selamanya. **Perlu keputusan pemilik** (tolak jumlah beda, atau status kurang bayar).
- **B4 (sedang):** refund tidak mengurangi kas (`analytics.service.ts` `cashSlice`), piutang, dan cek lunas (`assignment-guard.ts` `startPayment`); refund kedua tersembunyi di halaman order; `markOrderRefunded` menimpa `refund_amount` tanpa batas.
- **B5 (sedang):** margin kartu order lebih kecil dari Dashboard untuk hari yang belum ditugaskan (margin hari baru tidak dihitung saat `createOrder`/`updateOrder`).
- **B6 (sedang–rendah, dashboard):** setelah pembatalan, halaman order dan form invoice menghitung hanya invoice aktif → menyuruh menagih uang yang sudah diterima; API menolak.
- **B7 (rendah–sedang):** hari batal tetap tercetak harga penuh di PDF invoice/kwitansi/statement; basis DP API memuat hari batal, saran DP dashboard memakai `final_price` (beda angka, API menolak).
- **B8 (rendah):** buat invoice / biaya tambahan tanpa `client_ref` dan cek sisa di luar lock → bisa dobel.
- **B9 (rendah):** urutan lock berlawanan (order→invoice di `cancelOrder`/`finalizeOrder`, invoice→order di `markInvoicePaid`) → kemungkinan deadlock (500, uang aman).
- **B10 (rendah):** biaya "dibayar driver" yang ditambah admin ke hari yang payable-nya sudah PAID tidak pernah diganti (`expenses.service.ts` `createExpense`).
- **B11 (rendah):** tanggal belum WIB: bulan default Pendapatan (jam browser), `searchOrders` `T00:00:00` jam server, `listPayables` `new Date('YYYY-MM-DD')`.
- **B12 (rendah):** denda dibulatkan ke sen, bukan rupiah; batas 10:00 menganggap 10:00:59 masih sebelum; GA4 `purchase` terkirim untuk invoice denda pembatalan.
- Dicek benar: klik ganda Tandai Terbayar, revisi tidak mengubah status bayar, tier dan invoice sisa di `cancelOrder`, rumus Dashboard/Pendapatan/kartu order sama, Finalisasi menolak biaya "Menunggu dicek", bayar driver tidak dobel, aturan DP di semua jalur penugasan, GA4 sekali, hanya rekening BCA PT Ayomi Raya Karsa.

**Sedang dikerjakan (belum di-merge): daftar harga resmi (BACKLOG §1).** Branch `claude/price-list` di API (`d7ee8b0`, migrasi `20261006120000_price_list`: `price_cars`, `price_zones`, …; belum ada di produksi) dan dashboard (`9b3d2f3`, halaman Daftar Harga per kota, ubah, riwayat, terbit ke website). Belum diuji.
- **Review API (6 Okt):** tanpa blocker; `tsc` lolos; migrasi hanya menambah tabel, RLS menyala di 8 tabel baru; rute admin `ADMIN` saja; endpoint publik dibatasi laju dan tidak membocorkan biaya/RTR. Perlu diputuskan sebelum dipakai: (1) catatan paket di PDF berlaku mundur (kwitansi order XOPS lama berbeda dari invoice-nya); (2) dua admin mengedit bersamaan → simpanan lama menimpa tanpa peringatan; (3) harga usulan (`is_proposal`, PRICE.md §8) bisa diterbitkan tanpa penghalang. Kecil: catatan zona/extras ikut JSON publik, `client_ref` publish opsional, deploy hook gagal tidak dicoba ulang, persen overtime di PDF ditulis mati.
- **Review dashboard (6 Okt):** bentuk request/response cocok dengan API; merge ke `main` bersih (`git merge-tree`, tanpa konflik; kunci id/en sama); `tsc`/`next build` di branch belum dijalankan. Perbaiki sebelum rilis: (1) dialog Terbitkan tidak memperingatkan harga usulan; (2) isian grid yang belum disimpan hilang saat pindah tab dan Terbitkan tetap bisa ditekan; (3) form tidak sinkron ulang setelah data berubah → simpanan admin lain tertimpa; (4) petunjuk "Hanya untuk admin" di kelas harga dan catatan zona/extras padahal ikut terbit. Segera sesudahnya: `RupiahInput` menempel "750.000,00" menjadi Rp 75.000.000; `client_ref` publish baru tiap dialog dibuka. Kecil: batas urutan mobil, pilihan tabel kota kosong, `ownTable` dari nama kota, refetch ganda, tampilan riwayat, paket default `EditOrderForm` masih "ALL-IN" (form lain "ALL-IN X PARKIR").
- **Urutan rilis:** API → (opsional) `WEB_DEPLOY_HOOK_URL` di VPS → pemilik konfirmasi harga §8 → terbitkan sekali dari dashboard → baru merge `arasya-web` `claude/price-list` (`fetchPrices()` ketat di produksi; sebelum ada terbitan, semua build website gagal). Dashboard setelah API.

## 00. Sesi 3 Oktober: aturan lunas, kamera GPS, odometer, notifikasi, fee driver per hari

Permintaan pemilik (3 Okt) dan yang dikerjakan. Semua sudah di `main` ketiga repo setelah review (lihat §1 untuk status deploy). Aplikasi driver **perlu APK baru** (ada modul native baru: kamera, lokasi, view-shot).

### 00.1 Aturan baru: perjalanan dimulai setelah lunas
- Driver **boleh** Terima → Berangkat dari garasi → Sampai di lokasi jemput walau order belum lunas.
- Langkah baru **"Mulai perjalanan"** (pelanggan naik) sesudah sampai. Langkah ini terkunci sampai order **lunas**: uang yang diterima (`paid_to_date`, hanya bergerak saat invoice ditandai terbayar) ≥ harga sewa semua hari yang tidak dibatalkan. Biaya tambahan dari jalan (overtime, parkir/BBM yang ditagih ke pelanggan pada paket X Parkir/XOPS) ditagih belakangan dan **tidak** menahan hari berikutnya.
- API: `POST /driver/trips/:id/board` (409 "Order belum lunas…"), kolom `order_service_items.customer_onboard_at`, baris sistem `ONBOARD`. "Selesai" pada trip yang belum pernah "Mulai perjalanan" (APK lama) juga butuh lunas. Edit Hari → IN_PROGRESS oleh admin tidak dikunci.
- Saat invoice membuat order lunas, driver yang hari-nya belum dimulai dapat notifikasi "Order … sudah lunas".
- Aplikasi: tombol "Mulai perjalanan (menunggu pelunasan)" + tombol WhatsApp ke admin (0821-2402-4281); kartu tugas "Belum lunas". Dashboard: catatan di halaman order (sisa sewa), badge "Belum lunas" di Jadwal, catatan di Edit Hari.

### 00.2 Foto sampai lokasi dengan GPS (kamera seperti Timemark)
- "Sampai di lokasi jemput" membuka **kamera GPS**: tampilan langsung dengan cap jam besar, tanggal, kode order, nama driver, GPS ± akurasi, alamat jemput. Cap dibakar ke foto di HP (react-native-view-shot); tombol potret menunggu GPS; hanya kamera (tanpa galeri).
- Titik GPS (lat/lng, akurasi, waktu, tanda **lokasi palsu**/mock dari Android) disimpan di `trip_reports` untuk langkah sampai dan foto `ARRIVAL_PHOTO`. Foto dari APK lama dicap oleh server (jimp).
- Bila GPS tidak dapat lokasi: setelah dicoba, driver bisa "Tandai sampai tanpa lokasi"; dashboard menandai "Tanpa foto/GPS".
- Dashboard (halaman order dan Riwayat Trip): "Bukti sampai lokasi jemput": foto, koordinat, akurasi, "Lihat di peta", **"Rute ke alamat jemput"** (Google Maps menunjukkan jarak titik driver ke alamat), badge merah "Lokasi palsu terdeteksi".

### 00.3 Odometer
- Dua tombol terpisah. Odometer akhir terkunci sampai odometer awal terkirim/antre; masing-masing hanya sekali; angka akhir tidak boleh lebih kecil dari awal. Server menolak urutan salah (409) dan odometer tanpa foto/km (400).

### 00.4 Notifikasi di aplikasi
- Menu lonceng + badge belum dibaca. Semua push ke driver juga disimpan (`driver_notifications`, RLS menyala): tugas baru, dialihkan, pengingat, order lunas, **fee sudah dibayar** (dengan rincian fee + ganti biaya − uang jalan), biaya ditolak (dengan alasan). Ketuk → buka tugas atau menu notifikasi.
- Fee dibayar: tombol "Tandai dibayar" dan "Bayar sekaligus" di Utang (sekali per pembayaran, tidak dobel).

### 00.5 Fee driver per hari (patch dari sesi lain, diperiksa)
- Patch `api-driver-pay.patch` (2 commit) diterapkan apa adanya lalu diperbaiki: dashboard lama mengirim "Biaya Ops" di setiap simpan, yang oleh patch dianggap fee driver → fee jadi 0 setiap Edit Hari disimpan. Sekarang hanya nilai yang benar-benar diubah yang dipakai; hari yang sudah dibayar terkunci (fee/uang jalan/RTR tidak bisa diubah, 409).
- Sisi dashboard dibuat: Edit Hari punya **Fee driver** (tombol tabel fee + Menginap/Overtime), rincian, **Uang jalan**; halaman order punya **Biaya perjalanan** per hari (setujui/tolak dengan alasan, dibayar driver/kantor, ditagih ke pelanggan, tambah/hapus biaya admin) dan ringkasan yang dibayar ke driver; kartu Keuangan hanya mengubah catatan; Utang menampilkan ganti biaya dan uang jalan.
- **Penting:** biaya dari aplikasi menunggu dicek; **Finalisasi menolak** order yang masih punya biaya "Menunggu dicek". Biaya lama (sebelum migrasi) juga menjadi "Menunggu dicek" (di produksi saat rilis: 1 biaya dari uji ulang).
- Migrasi patch memindahkan "Biaya Ops" lama di hari internal ke `driver_fee` (dulu itu memang fee driver).

### 00.6 Uji (lokal, sebelum merge)
- API (Postgres 16 + API asli + mock storage/push): 25 cek fee driver + 49 cek fitur baru (aturan lunas, board idempoten, odometer, foto GPS, notifikasi, fee dibayar tunggal/sekaligus, biaya ditolak) lolos.
- Aplikasi: `tsc`, bundle Android, alur lengkap di build web dengan Playwright (kamera palsu + geolokasi): berangkat saat belum lunas → kamera GPS → foto bercap terunggah → "Mulai perjalanan" terkunci → lunas → terbuka. **Belum diuji di HP asli** (kamera, GPS, cap foto di Android).
- Dashboard: `tsc`, `next build`, tangkapan layar halaman order (bukti sampai, biaya perjalanan, Edit Hari) terhadap API lokal.

### 00.7 Uji di HP (sesudah APK baru terpasang)
1. Order uji 1 hari, DP saja, tugaskan driver uji. Di HP: Terima → Berangkat (boleh) → Sampai: kamera GPS terbuka, tunggu "GPS siap", potret, kirim. Cek dashboard: bukti sampai + peta + rute.
2. "Mulai perjalanan" terkunci + tombol WhatsApp admin. Tandai invoice pelunasan terbayar → notifikasi "Order … sudah lunas" → tarik layar → tombol aktif.
3. Odometer: akhir terkunci sebelum awal; isi akhir lebih kecil → ditolak.
4. Kirim struk parkir/bensin → dashboard "Biaya perjalanan": setujui satu, tolak satu dengan alasan → HP dapat notifikasi "Biaya ditolak".
5. Selesai → Utang: tandai dibayar → HP dapat "Fee sudah dibayar" dengan rincian.
6. Matikan GPS / pakai aplikasi lokasi palsu untuk melihat penanda di dashboard.

### 00.8 Catatan teknis dari code review
- Ketiga PR di-review (30 temuan, semua diperbaiki dan dibalas di PR). Yang perlu diawasi: assign/reassign/cancel order menghitung ulang uang per hari dalam satu transaksi (sekitar 6 query per hari); untuk order panjang (lebih dari 7 hari) perhatikan batas waktu transaksi 30 detik.
- "Biaya Ops" dari dashboard versi lama sekarang diabaikan API (fee hanya lewat `driver_fee`); setelah rilis, muat ulang tab dashboard yang masih terbuka.

### 00.9 Usulan berikutnya untuk aplikasi driver (belum dikerjakan)
1. **Pendapatan saya**: daftar fee per hari (fee, ganti biaya, uang jalan, status lunas) dan total bulan ini (`GET /driver/payables`). Paling sering ditanyakan driver.
2. **Wajib odometer awal sebelum Berangkat** dan odometer akhir sebelum Selesai (sekarang hanya pengingat), supaya km per trip selalu ada.
3. **Checklist kondisi mobil** sebelum berangkat/selesai (foto 4 sisi, BBM, kebersihan) untuk sengketa kerusakan.
4. **Lembur/overtime dari HP** saat selesai → admin setujui → masuk fee (OT 30rb/jam) dan Invoice Tambahan pelanggan.
5. **Lokasi langsung selama trip berjalan** (hanya saat IN_PROGRESS, izin lokasi latar belakang) supaya kantor bisa menjawab "drivernya di mana?". Perlu keputusan pemilik soal privasi dan baterai.
6. **Konfirmasi pelanggan saat selesai** (tanda tangan di HP atau tautan WhatsApp + rating).
7. **Libur/ketersediaan driver** dari HP, tampil di ketersediaan driver dashboard.
8. **Paksa update aplikasi** bila versi terlalu lama (API mengirim versi minimum) dan **laporan crash** (mis. Sentry), lalu distribusi lewat Play Console (Internal testing).

## 0. Uji coba aplikasi driver (2 Okt)

Uji coba pertama (2 Okt ±21.00 WIB, HP pemilik, build preview `324ed7a4…`) **gagal**. Login dan push berhasil, tetapi foto tidak pernah terkirim, antrean di HP macet, dan tombol status tercatat ke order yang salah. Status 2 Okt malam: data transaksi sudah dikosongkan (0.3), perbaikan 0.2 nomor 1–4 sudah dirilis (API, dashboard, mobile `main`), dan APK baru (build `0e492789…`) sudah dipasang di HP pemilik. Sebelum uji, pemilik meminta aturan baru: **driver hanya bisa ditugaskan setelah DP atau lunas** (§0.7; sudah dirilis 2 Okt malam). **Berikutnya: uji ulang dengan 0.5.** RLS `public` sudah menyala; schema `arasya_bot` masih terbuka (lihat 0.6).

### 0.1 Temuan dan penyebab (sudah dibuktikan)

| # | Gejala | Penyebab | Repo |
|---|---|---|---|
| 1 | Foto/laporan tidak pernah terkirim; "ketuk untuk kirim sekarang" tidak berbuat apa-apa; aksi sesudahnya ikut tertahan | Expo SDK 57 mengganti `fetch` global dengan `expo/fetch` (`node_modules/expo/src/winter/runtime.native.ts`). `expo/fetch` **tidak mendukung** bagian FormData `{ uri, name, type }` (`node_modules/expo/src/winter/fetch/convertFormData.ts` → "Unsupported FormDataPart implementation"), padahal `appendPhoto` di `src/lib/photos.ts` memakai bentuk itu. Error-nya ditangkap `request()` di `src/lib/api.ts` sebagai status 0 ("tidak ada koneksi"). `processQueue` di `src/lib/queue.ts` lalu `break` untuk **semua** trip, mencoba lagi tiap 30 detik tanpa batas (status 0 tidak dihitung sebagai percobaan). Di web lolos karena web memakai Blob, jadi masalah ini baru terlihat di HP asli. | mobile |
| 2 | Tombol ditekan di trip yang salah | `listTrips` scope `active` (`src/modules/driver-app/driver-app.service.ts`) mengembalikan semua trip driver yang belum DONE/CANCELLED **tanpa batas tanggal**, urut tanggal naik. Trip lama 29 Jun (`ARS-20260627-C1-4`, pelanggan Putri) tampil paling atas lalu di-terima/berangkat/sampai/selesai oleh penguji (14.07–14.17 UTC). | api |
| 3 | Order uji dibuatkan invoice dan ditandai lunas | Bukan bug, terjadi saat uji. Order uji tidak terhubung ke lead, jadi GA4 `purchase` tidak terkirim. | data |
| 4 | Nomor HP driver dobel | 8 driver memakai satu nomor `0812****890` (placeholder). Login dengan nomor itu memilih driver acak (`findDriverByPhone` memakai `findFirst`). | data + api |
| 5 | Jam jemput order uji 02.18 WIB | Salah input; form sudah benar memakai `+07:00`. | – |

Server sehat: upload 5 MB lolos nginx (dijawab 401 tanpa token), bucket `driver-reports` ada, tetapi belum ada satu pun objek `trip-reports/` di storage.

### 0.2 Perbaikan wajib sebelum uji ulang

**Status 2 Okt malam: nomor 1–4 selesai dan dirilis; nomor 5 (APK) selesai di-build dan sudah dipasang pemilik** (workflow "EAS Build (Android)" run #3 dari mobile `f0b25dc`, profile `preview`, build `0e492789-bd5e-4c9f-8e51-418dc68d1944`: https://expo.dev/accounts/rimbalun/projects/arasyarentcar/builds/0e492789-bd5e-4c9f-8e51-418dc68d1944 — APK diunduh dari halaman itu setelah selesai). Yang dikerjakan:
- Mobile `f0b25dc`: `appendPhoto` mengirim `{ name, type: 'image/jpeg', bytes }` (dibuktikan dengan encoder `expo/fetch` asli: bentuk lama gagal "Unsupported FormDataPart implementation", bentuk baru lolos dan diterima API lokal → foto tersimpan, report FUEL + `expenses` dibuat, kirim ulang tidak dobel). `request()`: status 0 hanya timeout/gagal jaringan; error di HP = `CLIENT_ERROR` (-1) dengan pesan aslinya. Antrean: error HP gagal setelah 3 kali; "tidak ada jawaban" saat HP online dihitung (batas 30) dan hanya menahan trip itu; offline tidak dihitung. "Kirim sekarang" dan banner memberi hasil (terkirim semua / sisa + penyebab).
- API `543a938` (deploy 2 Okt 18.28 UTC sukses): tugas `active` = trip mulai kemarin (WIB) + trip `IN_PROGRESS`, yang berjalan di atas; `GET /schedule?overdue=true` untuk trip lama yang masih terbuka; nomor HP driver unik (409, disimpan `08…`, simpan ulang nomor sendiri tetap boleh); login dengan nomor milik >1 driver ditolak (409 hanya bila kata sandi cocok, selain itu 401 biasa).
- Dashboard `cf25b20`: Trip → Agenda punya chip **Belum ditutup (N)** dan banner; tutup lewat Edit → Selesai/Dibatalkan.
- Diuji lokal (Postgres 16 + API asli + mock storage): daftar tugas, filter overdue, nomor ganda (buat/ubah/login), upload foto. Belum diuji di HP asli.

1. **Mobile, upload foto** (`appendPhoto` di `src/lib/photos.ts`): kirim bagian yang dipahami `expo/fetch`, misalnya objek `{ name, type: 'image/jpeg', bytes: () => new File(uri).bytes() }` (`File` dari `expo-file-system`; `convertFormData` membaca `name`, `type`, dan `bytes()`). `type` harus `image/jpeg` karena API menolak tipe lain dengan 415. Alternatif cepat: `EXPO_PUBLIC_USE_RN_FETCH=1` di `env` setiap profil `eas.json` (kembali ke fetch React Native). Uji di HP asli.
2. **Mobile, antrean**: `request()` jangan mengubah semua error menjadi status 0; hanya timeout/abort dan kegagalan jaringan yang status 0, error lain dianggap gagal dan dihitung. Di `processQueue`, status 0 jangan menahan semua trip tanpa batas: hitung percobaannya (batas lebih longgar) lalu tandai `failed` supaya tidak menahan item lain. "Kirim sekarang" perlu memberi umpan balik (misalnya pesan error terakhir).
3. **API, daftar tugas**: scope `active` hanya trip mulai kemarin (WIB) ke depan plus trip `IN_PROGRESS` berapa pun tanggalnya, urut yang terdekat dulu. Trip lama yang belum ditutup jangan muncul di HP; dashboard perlu cara melihat dan menutupnya.
4. **API, nomor HP ganda**: tolak menyimpan nomor HP driver yang sudah dipakai driver lain (setelah normalisasi 08/62/+62), dan tolak login bila nomor cocok ke lebih dari satu driver.
5. **Build APK baru** (workflow "EAS Build (Android)", profile `preview`) lalu pasang di atas versi lama.

### 0.3 Data yang harus dirapikan

Supabase proyek `uepxyavktaqpzvgdubyt` ("Arasya Rentcar"); pemilik memberi izin penuh menjalankan SQL (lihat §4).

**Status 2 Okt malam: semua data transaksi sudah dikosongkan** atas permintaan pemilik, supaya uji ulang mulai dari nol. Poin order uji, order Putri, dan 5 trip lama di bawah ikut selesai; yang tersisa hanya **nomor HP driver**.
- Dihapus: semua `orders` (74: 68 impor Google Sheet 1–11 Jun, 5 order web Jun–Jul, 1 order uji) beserta trip, finance, adjustment, log, summary; `invoices`, `receipts`, `invoice_delivery_logs`, `payables`, `trip_reports`, `expenses`, `web_leads` (2, keduanya tes), `sheet_import_rows`, pelanggan uji `a10c9c1d…`. File di bucket `invoices`, `payment-proofs`, `driver-reports` dihapus pemilik lewat Storage (tinggal `.emptyFolderPlaceholder`).
- Disimpan: `users` 12, `drivers` 10, `cars` 9 (+ `car-photos`), `external_vendors` 31, `external_cars` 47, `customers` 61, `device_tokens`, `counters` (kode pelanggan berlanjut dari 65). Angka turunan di-nol-kan: total di `customers`, `order_count` vendor, status driver/mobil kembali `AVAILABLE`.
- Cadangan sebelum hapus: schema `backup_20261002` (21 tabel, akses anon/authenticated dicabut). Berisi data pribadi; hapus setelah uji selesai (`drop schema backup_20261002 cascade;`).
- Konektor Supabase di sesi Claude menahan setiap DELETE/UPDATE menunggu konfirmasi yang tidak pernah muncul (timeout 60 detik, tidak ada yang tereksekusi). Perintah hapus dijalankan pemilik di SQL Editor; query baca tetap jalan.
- Temuan keamanan (belum ditindak): RLS mati di semua 26 tabel `public`, jadi pemegang anon key bisa membaca/mengubah semua data lewat REST Supabase, termasuk NIK. API memakai Prisma sebagai pemilik tabel; menyalakan RLS tanpa policy perlu keputusan pemilik.

Catatan asli (sebelum dikosongkan):

- **Order uji** `ARS-20261002-C65-1` (order `41cd2653-7572-4a91-93e2-0f522e449d34`, trip `66740de5-0239-4fe4-8a07-7c2e5548242a`): hapus beserta invoice `INV-20261002-C65-1` (PAID Rp 750.000) dan data pembayarannya, payable Rp 0, pelanggan uji `a10c9c1d-aa34-4fe7-a10e-ff61cbf99b36` (dibuat untuk uji, hanya 1 order), dan file storage-nya (2 PDF di bucket `invoices` dan 1 bukti bayar di `payment-proofs`, sekitar 14.20 UTC 2 Okt; hapus lewat Storage API, bukan SQL). Cek foreign key dulu.
- **Order asli** `ARS-20260627-C1-4` (Putri, trip `a73ab35e-87c5-4448-b386-0bfe1222b72e`, 29 Jun): akibat uji, trip ini berstatus DONE dengan jam 2 Okt (`driver_accepted_at`, `actual_start_at`, `trip_started_at`, `actual_pickup_at`, `trip_finished_at`, `finish_reported_at`) dan punya 3 `trip_reports` `source = API` (START, ARRIVE_CUSTOMER, FINISH). **Tanya pemilik** apakah trip 29 Jun itu benar terjadi. Kalau ya: tetap DONE, kosongkan jam-jam 2 Okt, hapus 3 report. Kalau tidak: kembalikan ke ASSIGNED (status sebelum uji tidak tercatat; trip ini punya driver) atau batalkan. Setelah itu hitung ulang status order (`deriveAndSetOrderStatus`).
- **Nomor HP driver**: isi nomor asli untuk 8 driver yang memakai nomor yang sama.
- **5 trip SCHEDULED lama** (19 Jun – 14 Jul, tanpa driver internal): putuskan ditutup atau dibatalkan.

### 0.4 Alur order yang benar (acuan uji)

1. **Lead** dari website masuk ke menu Lead Website → "Buat order" (kode order = kode lead). Order juga bisa dibuat langsung di Order → Buat Order.
2. **Order** baru berstatus `CREATED`, dengan satu baris jadwal per hari layanan. Satu baris = satu **trip** (`SCHEDULED`).
3. **Penugasan** (syarat: order sudah dibayar DP atau lunas, yaitu invoice DP/penuh ditandai terbayar; lihat §0.7): Trip → Jadwal → Edit baris → pilih driver **dan** mobil internal. Trip menjadi `ASSIGNED`, order `ASSIGNED`, dan payable driver (dasar = biaya ops) dibuat otomatis. Driver menerima push "Tugas baru"; kalau trip-nya hari itu juga, sekaligus "Pengingat trip". Untuk trip besok, pengingat otomatis dikirim pukul 17.00 WIB. Konfirmasi ke pelanggan/driver lewat tombol WhatsApp (mode manual).
4. **Driver (aplikasi)**: Terima tugas (hanya mencatat `driver_accepted_at`, status tetap) → Foto odometer awal → Berangkat dari garasi (`IN_PROGRESS`) → Sampai di lokasi jemput → laporan biaya (Bensin/Tol/Parkir/Biaya lain, foto struk + jumlah) → Foto odometer akhir → Selesai (`DONE`). Bila semua trip order selesai: order `IN_PROGRESS` dengan `awaiting_finalization`.
5. **Finalisasi admin**: lengkapi biaya ops, fee driver, dan tambahan → Finalisasi → order `DONE`. Order hanya bisa `DONE` lewat tombol ini.
6. **Invoice**: DP minimal 20%, lalu pelunasan; pembayaran hanya ke BCA PT Ayomi Raya Karsa. Invoice LUNAS pertama pada order yang berasal dari lead mengirim GA4 `purchase` (sekali).
7. **Utang driver/vendor**: menu Utang → tandai dibayar.
8. **Pembatalan**: Order → Batalkan. Denda mengikuti kebijakan; bila pelanggan terhubung, sistem membuat invoice denda bernomor. Jangan memakai pembatalan untuk membersihkan data uji.

### 0.5 Urutan uji ulang (setelah 0.2 dan 0.3)

Persiapan: driver uji **Sutan Arief** (nomor HP unik milik pemilik, sudah punya kata sandi dan token push), **tanpa trip aktif lain** (cek di DB); pasang APK build 2 Okt malam di atas versi lama (item antrean lama di HP akan dijawab 404 dan terhapus sendiri karena trip-nya sudah dihapus); di HP, notifikasi aktif dan baterai "Tanpa pembatasan". Order uji dibuat lewat Order → Buat Order: pelanggan `TEST UJI APLIKASI`, nomor HP pemilik, tanggal hari ini, jam jemput sekitar 1 jam ke depan. Sebelum penugasan, buat invoice Uang Muka (DP) untuk order uji (minimal 20%) lalu tandai terbayar dengan bukti apa saja (mis. tangkapan layar); order uji tidak berasal dari lead, jadi GA4 `purchase` tidak terkirim. Pada setiap langkah, Claude mengecek database (`order_service_items`, `trip_reports`, `expenses`) supaya kegagalan langsung terlihat.

1. Sebelum DP ditandai terbayar: coba tugaskan driver → pilihan driver terkunci dan API menolak ("Order belum dibayar…"). Sesudah DP terbayar: tugaskan driver + mobil → push "Tugas baru" muncul; tab Tugas **hanya** berisi trip uji.
2. Terima tugas → `driver_accepted_at` terisi dalam ±10 detik; terlihat di detail order.
3. Foto odometer awal (foto + km) → `trip_reports` ODOMETER_START dengan `file_url`.
4. Berangkat dari garasi → trip `IN_PROGRESS`.
5. Sampai di lokasi jemput → `actual_pickup_at` terisi.
6. Bensin dengan foto struk + jumlah → report FUEL + baris `expenses`.
7. Foto odometer akhir.
8. Selesai → trip `DONE`, order menunggu finalisasi; Trip → Riwayat menampilkan linimasa dan foto (label *Aplikasi*).
9. Tanpa sinyal (order uji kedua): Mode Pesawat → tekan tombol + kirim laporan → "Menunggu dikirim" → sinyal kembali → terkirim sendiri, jamnya = jam tekan, tanpa data ganda.
10. Latar belakang: setelah menekan tombol saat offline, tutup aplikasi, nyalakan data, tunggu 15–30 menit tanpa membuka aplikasi.
11. Alihkan trip ke driver lain → push "Tugas dialihkan", trip hilang dari HP.
12. Admin: Finalisasi order uji → `DONE`.
13. Bersihkan semua data uji (cara seperti 0.3), termasuk invoice, receipt, dan file-nya di bucket `invoices` dan `payment-proofs`.

### 0.6 Keamanan Supabase: RLS

**Schema `public`: selesai (2 Okt malam, dijalankan pemilik di SQL Editor).** RLS menyala di 26/26 tabel, `anon`/`authenticated` tidak punya hak apa pun di tabel/sequence `public`, dan default privileges `postgres` tidak lagi memberi `anon`/`authenticated` akses ke tabel baru (migrasi Prisma berikutnya tetap tertutup, tetapi RLS tabel baru tetap perlu dinyalakan di migrasinya). Diverifikasi: REST dengan publishable key → `42501 permission denied` untuk `customers`/`drivers`; API `/health` 200 dan login tetap jalan (API konek sebagai `postgres`, bypass RLS; storage pakai `service_role`). Security Advisor menampilkan "RLS Enabled No Policy" (INFO, memang disengaja).

**Schema `arasya_bot` (bot lama): masih terbuka, menunggu pemilik.** Schema ini ikut diekspos ke REST/GraphQL, RLS mati, dan `anon` punya SELECT/INSERT/UPDATE/DELETE. Isi: `driver_reports` 43 baris (nama/HP driver, lokasi, koordinat, foto; terakhir Juni), `orders` dan `driver_assignments` kosong. Terbukti bisa dibaca dengan publishable key (HEAD → `content-range: 0-42/43`). Bot sudah dihentikan, jadi aman ditutup: `enable row level security` di ketiga tabel, `revoke all` tabel/sequence dan `usage` schema dari `anon, authenticated`, lalu hapus `arasya_bot` dari Project Settings → Data API → Exposed schemas. Kalau bot lama suatu saat dinyalakan lagi, ia harus memakai service key.

### 0.7 Aturan baru: driver ditugaskan setelah DP (2 Okt malam)

Permintaan pemilik sebelum uji ulang. **Status: dirilis 2 Okt malam.** API `02bbf04` (workflow "Deploy API" run #66 sukses 20.58 UTC; `/health` 200), lalu dashboard `9fb9bd3` ("Deploy Dashboard" run #63 ke VPS dan "Deploy to Vercel" run #16, keduanya sukses 21.02 UTC).
- API (`src/modules/orders/assignment-guard.ts`): driver internal hanya bisa ditugaskan bila `payment_status` order `DP_PAID` atau `PAID` (status ini hanya berubah saat invoice ditandai terbayar). Berlaku di Edit baris (`PUT /schedule/lines/:id`), Tugaskan untuk semua, Ganti semua, dan rute bot lama; selain itu dijawab 409 "Order belum dibayar…".
- Tetap boleh pada order yang belum dibayar: melepas driver, menyimpan ulang baris dengan driver yang sama (catatan, jam, biaya), memilih mobil, dan baris rekanan.
- Dashboard: order belum dibayar tidak menampilkan tombol "Tugaskan untuk semua"/"Ganti semua" dan menjelaskan caranya (invoice DP → tandai terbayar); dialog per hari mengunci pilihan driver; laci hari di Jadwal menampilkan "Menunggu DP".
- Diuji lokal (Postgres 16 + API asli): 15 skenario lolos (belum bayar ditolak di semua jalur, DP_PAID/PAID diterima, pengecualian di atas diterima) + tangkapan layar dashboard.
- Belum ada pengecualian (mis. pelanggan korporat yang bayar belakangan). Kalau dibutuhkan: tombol "Tugaskan tanpa DP" dengan alasan wajib yang tercatat di log order.

## 1. Status rilis

| Repo | Kode terbaru | Di produksi? | Catatan |
|---|---|---|---|
| **arasya-web** (website) | `main` (40bcf9b + CLAUDE.md) | ✅ Live di arasya-web.vercel.app | Konten Sanity sudah dimigrasi (`2026-10-01-sync`). Lead dikirim ke `https://api.haikuy.com` lewat `.env.production`. |
| **api-arasya-rentcar** | `main` (`fc37142`, satu rumus keuangan) | ✅ Migrasi terakhir di produksi: `20261006090000_order_cancellation_fields` (5 Okt 21.14 UTC). `/health` 200 (6 Okt) | Branch `claude/price-list` (`d7ee8b0`) belum di-merge. `GA4_*` di `.env`. Push ke `main` men-deploy otomatis. |
| **dashboard-arasya-rentcar** | `main` (`9640cc9`, satu rumus keuangan) | ✅ dashboard.haikuy.com menyajikan build ini sejak 6 Okt ±09.00 UTC; salinan Vercel tidak dicek | Branch `claude/price-list` (`9b3d2f3`) belum di-merge. Push ke `main` otomatis deploy ke Vercel dan VPS (workflow "Deploy Dashboard" lewat SSH). |
| **mobile-arasya-rentcar** (aplikasi driver) | `main` (kartu e-toll + NFC; PR arasya-rentcar/mobile-arasya-rentcar#4, repo publik) | ✅ APK build `af651751-3348-4b9b-aae5-0904f9511a51` ("EAS Build (Android)" run #7). **Belum diuji di HP asli** | Uji dengan §00.7, TEST-PLAN §1.1 dan §1.2. Proyek Expo `rimbalun/arasyarentcar`. |
| **wa-bot-arasya** | branch `development` | ❌ Dimatikan (2 Okt) | Dipensiunkan, jangan dikembangkan lagi. |

## 2. Langkah rilis berikutnya (berurutan)

1. ✅ **Deploy API** (2 Okt, migrasi `20261001180000_customer_identity_partner` tercatat 08:42 UTC).
2. ✅ **Cek API live**: `/health` 200, endpoint terproteksi 401, pesan login versi baru.
3. ✅ **Rilis dashboard**: `main` di-fast-forward ke 39d0612; Vercel dan VPS ter-deploy otomatis lewat GitHub Actions.
4. ✅ **Matikan bot**: `pm2 stop arasya-wa-bot` di VPS (2 Okt, oleh pemilik; mode WhatsApp manual sudah default di API baru).
5. ✅ **Build APK pertama** (2 Okt; README repo mobile, bagian "Rilis pertama"):
   - `app.json`: `"owner": "rimbalun"`, `extra.eas.projectId` = `08ba4d2a-eafe-4590-a04a-23b0e469f171`, dan `"slug": "arasyarentcar"` (slug proyek di expo.dev; dengan `arasya-driver` EAS menolak build karena slug tidak cocok);
   - workflow "EAS Build (Android)" profile `preview` sukses: keystore dibuat otomatis, versionCode dikelola remote oleh EAS (mulai 1), build `324ed7a4-7d74-4977-8c76-5a1b48d78431` di expo.dev (`rimbalun/arasyarentcar`);
   - kunci FCM V1 (service account Firebase `arasya-rentcar-mobile-apps`) sudah diunggah di expo.dev → Credentials → Android;
   - sisa untuk pemilik: unduh APK dari halaman build itu.
6. ⏳ **Uji coba aplikasi driver**: uji pertama gagal (lihat §0); perbaikan sudah dirilis dan APK baru sudah dipasang di HP pemilik. Aturan DP (§0.7) sudah dirilis. Berikutnya: uji ulang dengan §0.5, baru bagikan ke semua driver.
7. ✅ **GA4 purchase**: `GA4_MEASUREMENT_ID` + `GA4_API_SECRET` sudah di `.env` API dan API sudah direstart. Bukti berfungsi: event `purchase` di GA4 Realtime saat invoice pertama ditandai PAID.

## 3. Yang sudah dikerjakan (ringkas)

- **Website → dashboard**: form pemesanan mengirim lead (kode `ARS-XXXXX`) ke menu **Lead Website**; "Buat order" mengisi form otomatis; order dari lead memakai kode lead yang sama sampai ke invoice; data lead (sumber iklan, unit, penumpang, durasi) tampil di order; pembayaran pertama mengirim `purchase` ke GA4.
- **Aplikasi driver**: tugas, terima/berangkat/sampai/selesai, laporan foto & biaya, offline queue + sinkron latar belakang, idempotent (tidak ada data dobel), jam kejadian dari HP.
- **WhatsApp tanpa bot**: tombol kirim di dashboard membuka WhatsApp dengan pesan terisi (pelanggan, driver, driver lama); pengingat driver lewat push aplikasi.
- **Database pelanggan**: NIK, alamat, perusahaan, dokumen KTP/SIM/NPWP privat, status terverifikasi, pengenalan pelanggan lama dari nomor HP di form order.
- **Rekanan**: badge "Ada di armada / Perlu rekanan" di lead, Vendor otomatis terpilih, driver & plat rekanan per trip, konfirmasi pelanggan untuk order rekanan, PIC/area/rekening rekanan; driver rekanan tampil di Riwayat, Riwayat Trip vendor, dan kartu Keuangan order; pencarian Order juga menemukan nama/HP/plat driver rekanan, nama vendor, dan mobil vendor.
- **Konsistensi**: hanya rekening BCA PT Ayomi Raya Karsa; kebijakan pembatalan sama di website, caption, PDF, dan sistem; semua tanggal WIB.
- **Operasional**: Supabase keep-alive tiap 3 hari (`SUPABASE_KEEPALIVE_DB_URL`), smoke test API, verifikasi GA4 + lead di situs live.

## 4. Keputusan pemilik yang tercatat

- Rekening resmi satu-satunya: **BCA 0954840782 a.n. PT Ayomi Raya Karsa**.
- Teks pembatalan website mengikuti sistem (20% / 50% s.d. 10.00 WIB & belum berangkat / 100%).
- Mobil yang tidak dimiliki Arasya dipenuhi lewat rekanan atas nama Arasya Rent Car.
- Bot WhatsApp dihentikan; diganti website + dashboard + aplikasi driver.
- Kode lead menjadi kode order.
- Driver hanya bisa ditugaskan setelah order dibayar DP atau lunas (pemilik, 2 Okt malam; belum ada pengecualian).
- Perjalanan dengan pelanggan ("Mulai perjalanan" di aplikasi) baru boleh dimulai setelah order **lunas**; berangkat dari garasi dan menandai sampai di lokasi jemput boleh sebelum lunas (pemilik, 3 Okt).
- Foto sampai lokasi jemput memakai kamera GPS dengan cap waktu, nama driver, dan koordinat (seperti aplikasi Timemark) (pemilik, 3 Okt).
- Selama masih tahap pengembangan, Claude boleh merge ke `main` di semua repo tanpa bertanya, dengan code review di GitHub bila perlu (pemilik, 3 Okt).
- Claude selalu boleh membuat PR, mereview PR, dan merge PR di semua repo; jangan pernah bertanya soal itu (pemilik, 4 Okt).
- Satu cara menugaskan (pemilik, 4 Okt): driver ke satu hari → hari `ASSIGNED`; aplikasi meminta "Terima tugas" sampai ditekan; driver `ON_DUTY` hanya pada hari tripnya; "Tetapkan untuk Semua" disembunyikan.
- Hari pada order Selesai/Dibatalkan tidak bisa diubah (pemilik, 4 Okt).
- Aplikasi driver hanya untuk driver internal Arasya. Order/hari yang memakai rekanan berjalan lewat dashboard saja (vendor, mobil, nama/HP/plat driver rekanan, konfirmasi WhatsApp, tutup lewat Edit → Selesai); driver rekanan tidak diminta memasang aplikasi (pemilik, 2 Okt malam). Hari rekanan juga tidak terkena aturan DP.
- Daftar harga resmi ditunda (BACKLOG).
- Order luar kota **tidak selalu** butuh rekanan: driver Arasya bisa berangkat dari Bogor (mis. ke Bandung) untuk menjemput pelanggan. Sistem tidak punya aturan lokasi → rekanan; badge "Perlu rekanan" di lead hanya berarti unit yang diminta tidak ada di armada, dan admin tetap bebas memilih Internal. Jangan menambah aturan "luar kota = rekanan".
- Langganan VPS diperpanjang: API dan dashboard.haikuy.com tetap di VPS (tidak pindah hosting).
- Uji upload dokumen pelanggan dan PDF ke Supabase menunggu rencana yang matang, karena menyangkut data pribadi pelanggan (NIK/KTP, UU PDP).
- Claude boleh menjalankan SQL di Supabase (`execute_sql`) tanpa bertanya lagi (izin penuh dari pemilik, 2 Okt). Tetap laporkan setiap perintah yang dijalankan.
- Perubahan pada `docs/HANDOFF.md` langsung di-commit, di-push, dan di-merge (fast-forward) ke `main` tanpa bertanya lagi (pemilik, 2 Okt).
- Distribusi aplikasi driver nanti lewat Google Play Console (jalur Internal testing); sejak 30 Sep 2026 Android di Indonesia mewajibkan developer terverifikasi untuk APK di luar Play.

## 5. Sisa yang belum dikerjakan

- **Belum teruji di produksi**: upload dokumen pelanggan & PDF ke Supabase (menunggu rencana keamanan data, lihat keputusan pemilik), pengiriman GA4 purchase, push notifikasi dan sinkron latar belakang di HP asli (build APK pertama sudah dikirim ke EAS; menunggu uji coba driver).
- **Infrastruktur**: langganan VPS diperpanjang pemilik (tidak pindah hosting). Secret SSH deploy sudah diisi (workflow deploy VPS berjalan). Connector Vercel di sesi Claude tidak melihat project (perlu disambung ulang ke akun pemilik tim). `dashboard.haikuy.com` belum diizinkan di network environment.
- **BACKLOG**: daftar harga, master kota, enum layanan, data armada asli.

## 6. Usulan sesi berikutnya

1. Test suite permanen di CI (API dengan Postgres lokal, smoke Playwright untuk dashboard/website) + alur pull request dengan `/code-review` dan `/security-review`.
2. **Kerjakan §0**: perbaikan upload foto + antrean (mobile), daftar tugas + nomor HP ganda (API), rapikan data, build APK, lalu uji ulang dengan §0.5.
3. Rencana keamanan dan pengujian upload dokumen pelanggan (KTP/SIM/NPWP) dan PDF ke Supabase.
