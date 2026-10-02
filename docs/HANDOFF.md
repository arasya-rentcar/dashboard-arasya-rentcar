# Serah terima — 2 Oktober 2026

Ringkasan kondisi semua repo Arasya Rent Car dan langkah berikutnya. Detail teknis per repo ada di `CLAUDE.md` masing-masing; pekerjaan yang ditunda ada di `docs/BACKLOG.md`.

## 1. Status rilis

| Repo | Kode terbaru | Di produksi? | Catatan |
|---|---|---|---|
| **arasya-web** (website) | `main` (40bcf9b + CLAUDE.md) | ✅ Live di arasya-web.vercel.app | Konten Sanity sudah dimigrasi (`2026-10-01-sync`). Lead dikirim ke `https://api.haikuy.com` lewat `.env.production`. |
| **api-arasya-rentcar** | `main` = branch `claude/trusting-dijkstra-hocd9x` (02978ea + CLAUDE.md) | ⚠️ **Belum** — produksi masih versi lead + driver app awal | Perlu deploy di VPS. Dua migrasi baru (aditif): `20261001150000_web_lead_duration_key`, `20261001180000_customer_identity_partner`. |
| **dashboard-arasya-rentcar** | branch `claude/trusting-dijkstra-hocd9x` (11 commit di atas `main`) | ⚠️ **Belum** — `main` masih 891865a | Rilis **setelah** API ter-deploy: fast-forward `main`, lalu deploy VPS. |
| **mobile-arasya-rentcar** (aplikasi driver) | `main` (0c20152 + CLAUDE.md) | ❌ Belum ada APK | Menunggu Expo projectId, Firebase, `EXPO_TOKEN`. |
| **wa-bot-arasya** | branch `development` | Masih jalan di VPS | Dipensiunkan. Matikan setelah API baru live. |

## 2. Langkah rilis berikutnya (berurutan)

1. **VPS — deploy API**: `cd /root/.openclaw/workspace/arasya-projects && GIT_SYNC=1 ./deploy-local.sh api`
2. **Cek API live**: workflow GitHub "API smoke test" (repo API), atau langsung `curl https://api.haikuy.com/health` (domain ini sudah diizinkan di environment).
3. **Rilis dashboard**: fast-forward `main` ke branch `claude/trusting-dijkstra-hocd9x` (Vercel otomatis), lalu di VPS: `GIT_SYNC=1 ./deploy-local.sh dashboard`.
4. **Matikan bot**: `pm2 stop arasya-wa-bot` (mode WhatsApp manual sudah default di API baru).
5. **Rilis APK pertama** (README repo mobile, bagian "Rilis pertama"):
   - isi `owner` dan `extra.eas.projectId` di `app.json`;
   - taruh `google-services.json` (Firebase, paket `com.arasyarentcar.driver`) di root repo;
   - upload FCM V1 key di expo.dev → Credentials;
   - secret GitHub `EXPO_TOKEN` → jalankan workflow "EAS build" (profile preview → APK).
6. **Atur password aplikasi** 1–2 driver di dashboard (halaman driver → Akses aplikasi driver), uji coba, lalu bagikan ke semua driver.
7. **GA4 purchase**: buat API secret di GA4 (Data streams → Measurement Protocol API secrets) dan isi `GA4_MEASUREMENT_ID=G-3S9ZDTJ0XE` + `GA4_API_SECRET` di `.env` API.

## 3. Yang sudah dikerjakan (ringkas)

- **Website → dashboard**: form pemesanan mengirim lead (kode `ARS-XXXXX`) ke menu **Lead Website**; "Buat order" mengisi form otomatis; order dari lead memakai kode lead yang sama sampai ke invoice; data lead (sumber iklan, unit, penumpang, durasi) tampil di order; pembayaran pertama mengirim `purchase` ke GA4.
- **Aplikasi driver**: tugas, terima/berangkat/sampai/selesai, laporan foto & biaya, offline queue + sinkron latar belakang, idempotent (tidak ada data dobel), jam kejadian dari HP.
- **WhatsApp tanpa bot**: tombol kirim di dashboard membuka WhatsApp dengan pesan terisi (pelanggan, driver, driver lama); pengingat driver lewat push aplikasi.
- **Database pelanggan**: NIK, alamat, perusahaan, dokumen KTP/SIM/NPWP privat, status terverifikasi, pengenalan pelanggan lama dari nomor HP di form order.
- **Rekanan**: badge "Ada di armada / Perlu rekanan" di lead, Vendor otomatis terpilih, driver & plat rekanan per trip, konfirmasi pelanggan untuk order rekanan, PIC/area/rekening rekanan.
- **Konsistensi**: hanya rekening BCA PT Ayomi Raya Karsa; kebijakan pembatalan sama di website, caption, PDF, dan sistem; semua tanggal WIB.
- **Operasional**: Supabase keep-alive tiap 3 hari (`SUPABASE_KEEPALIVE_DB_URL`), smoke test API, verifikasi GA4 + lead di situs live.

## 4. Keputusan pemilik yang tercatat

- Rekening resmi satu-satunya: **BCA 0954840782 a.n. PT Ayomi Raya Karsa**.
- Teks pembatalan website mengikuti sistem (20% / 50% s.d. 10.00 WIB & belum berangkat / 100%).
- Mobil yang tidak dimiliki Arasya dipenuhi lewat rekanan atas nama Arasya Rent Car.
- Bot WhatsApp dihentikan; diganti website + dashboard + aplikasi driver.
- Kode lead menjadi kode order.
- Daftar harga resmi ditunda (BACKLOG).

## 5. Sisa yang belum dikerjakan

- **Belum teruji di produksi**: upload dokumen pelanggan & PDF ke Supabase, pengiriman GA4 purchase, push notifikasi (butuh APK + Firebase), sinkron latar belakang di HP asli.
- **Kecil / tampilan**: nama driver rekanan belum tampil di tab Riwayat trip dan kartu keuangan; placeholder pencarian order belum menyebut kode lead.
- **Infrastruktur**: VPS berakhir **16 Oktober 2026**, perlu pindah hosting API (+ dashboard ke Vercel dengan domain dashboard.haikuy.com, tambahkan domain ke CORS bila berubah). Secret SSH deploy belum ada. Connector Vercel di sesi Claude tidak melihat project (perlu disambung ulang ke akun pemilik tim). `dashboard.haikuy.com` belum diizinkan di network environment.
- **BACKLOG**: daftar harga, master kota, enum layanan, data armada asli.

## 6. Usulan sesi berikutnya

1. Test suite permanen di CI (API dengan Postgres lokal, smoke Playwright untuk dashboard/website) + alur pull request dengan `/code-review` dan `/security-review`.
2. Rilis APK pertama dan uji coba driver.
3. Rencana pindah hosting sebelum 16 Oktober.
