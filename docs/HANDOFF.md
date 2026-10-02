# Serah terima — 2 Oktober 2026

Ringkasan kondisi semua repo Arasya Rent Car dan langkah berikutnya. Detail teknis per repo ada di `CLAUDE.md` masing-masing; pekerjaan yang ditunda ada di `docs/BACKLOG.md`.

## 0. Mulai di sini: uji coba aplikasi driver (sesi berikutnya)

Uji coba pertama (2 Okt ±21.00 WIB, HP pemilik, build preview `324ed7a4…`) **gagal**. Login dan push berhasil, tetapi foto tidak pernah terkirim, antrean di HP macet, dan tombol status tercatat ke order yang salah. Kerjakan 0.2 dan 0.3 dulu, baru uji ulang dengan 0.5. Data transaksi sudah dikosongkan 2 Okt malam (lihat 0.3); berikutnya mulai dari 0.2.

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
3. **Penugasan**: Trip → Jadwal → Edit baris → pilih driver **dan** mobil internal. Trip menjadi `ASSIGNED`, order `ASSIGNED`, dan payable driver (dasar = biaya ops) dibuat otomatis. Driver menerima push "Tugas baru"; kalau trip-nya hari itu juga, sekaligus "Pengingat trip". Untuk trip besok, pengingat otomatis dikirim pukul 17.00 WIB. Konfirmasi ke pelanggan/driver lewat tombol WhatsApp (mode manual).
4. **Driver (aplikasi)**: Terima tugas (hanya mencatat `driver_accepted_at`, status tetap) → Foto odometer awal → Berangkat dari garasi (`IN_PROGRESS`) → Sampai di lokasi jemput → laporan biaya (Bensin/Tol/Parkir/Biaya lain, foto struk + jumlah) → Foto odometer akhir → Selesai (`DONE`). Bila semua trip order selesai: order `IN_PROGRESS` dengan `awaiting_finalization`.
5. **Finalisasi admin**: lengkapi biaya ops, fee driver, dan tambahan → Finalisasi → order `DONE`. Order hanya bisa `DONE` lewat tombol ini.
6. **Invoice**: DP minimal 20%, lalu pelunasan; pembayaran hanya ke BCA PT Ayomi Raya Karsa. Invoice LUNAS pertama pada order yang berasal dari lead mengirim GA4 `purchase` (sekali).
7. **Utang driver/vendor**: menu Utang → tandai dibayar.
8. **Pembatalan**: Order → Batalkan. Denda mengikuti kebijakan; bila pelanggan terhubung, sistem membuat invoice denda bernomor. Jangan memakai pembatalan untuk membersihkan data uji.

### 0.5 Urutan uji ulang (setelah 0.2 dan 0.3)

Persiapan: satu driver uji dengan nomor HP unik dan **tanpa trip aktif lain** (cek di DB); di HP, notifikasi aktif dan baterai "Tanpa pembatasan". Order uji dibuat lewat Order → Buat Order: pelanggan `TEST UJI APLIKASI`, nomor HP pemilik, tanggal hari ini, jam jemput sekitar 1 jam ke depan. Jangan buat invoice untuk order uji ini. Pada setiap langkah, Claude mengecek database (`order_service_items`, `trip_reports`, `expenses`) supaya kegagalan langsung terlihat.

1. Tugaskan driver + mobil → push "Tugas baru" muncul; tab Tugas **hanya** berisi trip uji.
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
13. Bersihkan semua data uji (cara seperti 0.3).

## 1. Status rilis

| Repo | Kode terbaru | Di produksi? | Catatan |
|---|---|---|---|
| **arasya-web** (website) | `main` (40bcf9b + CLAUDE.md) | ✅ Live di arasya-web.vercel.app | Konten Sanity sudah dimigrasi (`2026-10-01-sync`). Lead dikirim ke `https://api.haikuy.com` lewat `.env.production`. |
| **api-arasya-rentcar** | `main` (d6d6544 + CLAUDE.md) | ✅ Live di https://api.haikuy.com (deploy 2 Okt) | Kedua migrasi baru sudah diterapkan. `GA4_MEASUREMENT_ID` + `GA4_API_SECRET` sudah di `.env`. Secret SSH deploy sudah diisi, jadi push ke `main` men-deploy otomatis. |
| **dashboard-arasya-rentcar** | `main` (aee7632 + handoff ini) | ✅ Live di Vercel dan dashboard.haikuy.com (VPS) | Push ke `main` otomatis deploy ke Vercel dan VPS (workflow "Deploy Dashboard" lewat SSH). |
| **mobile-arasya-rentcar** (aplikasi driver) | `main` (565230a, repo publik) | ⚠️ APK preview terpasang di HP pemilik; uji pertama gagal | Login dan push jalan; upload foto dan antrean rusak di HP asli, daftar tugas memuat trip lama. Lihat §0 sebelum menguji lagi. Proyek Expo `rimbalun/arasyarentcar`; kunci FCM V1 sudah diunggah. |
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
6. ⏳ **Uji coba aplikasi driver**: password 1 driver sudah diatur dan login berhasil; uji pertama gagal (lihat §0). Perbaiki, build ulang, uji lagi, baru bagikan ke semua driver.
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
