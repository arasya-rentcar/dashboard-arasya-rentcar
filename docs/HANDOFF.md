# Serah terima — 2 Oktober 2026

Ringkasan kondisi semua repo Arasya Rent Car dan langkah berikutnya. Detail teknis per repo ada di `CLAUDE.md` masing-masing; pekerjaan yang ditunda ada di `docs/BACKLOG.md`.

## 1. Status rilis

| Repo | Kode terbaru | Di produksi? | Catatan |
|---|---|---|---|
| **arasya-web** (website) | `main` (40bcf9b + CLAUDE.md) | ✅ Live di arasya-web.vercel.app | Konten Sanity sudah dimigrasi (`2026-10-01-sync`). Lead dikirim ke `https://api.haikuy.com` lewat `.env.production`. |
| **api-arasya-rentcar** | `main` (d6d6544 + CLAUDE.md) | ✅ Live di https://api.haikuy.com (deploy 2 Okt) | Kedua migrasi baru sudah diterapkan. `GA4_MEASUREMENT_ID` + `GA4_API_SECRET` sudah di `.env`. Secret SSH deploy sudah diisi, jadi push ke `main` men-deploy otomatis. |
| **dashboard-arasya-rentcar** | `main` (aee7632 + handoff ini) | ✅ Live di Vercel dan dashboard.haikuy.com (VPS) | Push ke `main` otomatis deploy ke Vercel dan VPS (workflow "Deploy Dashboard" lewat SSH). |
| **mobile-arasya-rentcar** (aplikasi driver) | `main` (565230a, repo publik) | ⏳ Build APK pertama sudah dikirim ke EAS (2 Okt) | Proyek Expo `rimbalun/arasyarentcar`; kunci FCM V1 sudah diunggah. Sisa: unduh APK dari expo.dev dan uji coba driver (langkah 6). |
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
6. ⏳ **Atur password aplikasi** (pemilik) 1–2 driver di dashboard (halaman driver → Akses aplikasi driver), uji coba, lalu bagikan ke semua driver.
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

## 5. Sisa yang belum dikerjakan

- **Belum teruji di produksi**: upload dokumen pelanggan & PDF ke Supabase (menunggu rencana keamanan data, lihat keputusan pemilik), pengiriman GA4 purchase, push notifikasi dan sinkron latar belakang di HP asli (build APK pertama sudah dikirim ke EAS; menunggu uji coba driver).
- **Infrastruktur**: langganan VPS diperpanjang pemilik (tidak pindah hosting). Secret SSH deploy sudah diisi (workflow deploy VPS berjalan). Connector Vercel di sesi Claude tidak melihat project (perlu disambung ulang ke akun pemilik tim). `dashboard.haikuy.com` belum diizinkan di network environment.
- **BACKLOG**: daftar harga, master kota, enum layanan, data armada asli.

## 6. Usulan sesi berikutnya

1. Test suite permanen di CI (API dengan Postgres lokal, smoke Playwright untuk dashboard/website) + alur pull request dengan `/code-review` dan `/security-review`.
2. Hasil uji coba aplikasi driver (push, offline, sinkron latar belakang) dan perbaikannya.
3. Rencana keamanan dan pengujian upload dokumen pelanggan (KTP/SIM/NPWP) dan PDF ke Supabase.
