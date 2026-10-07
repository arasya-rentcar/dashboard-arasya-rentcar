# Rencana: pilih alamat jemput & tujuan lewat peta (arasya-web)

Status: rencana, belum dikerjakan (7 Okt 2026). Pengerjaan di sesi lain.

## 1. Tujuan

1.1. Field **Alamat jemput** dan **Tujuan** di form pemesanan website menampilkan saran tempat saat diketik (seperti kotak cari Google Maps: hotel, stasiun, bandara, mal, alamat jalan).
1.2. Pelanggan juga bisa **memilih titik di peta** (geser peta, pin di tengah) dan **"Pakai lokasi saya"** untuk alamat jemput.
1.3. Titik yang dipilih (koordinat + nama tempat) ikut ke WhatsApp, lead di dashboard, order, dan nantinya aplikasi driver, supaya driver tidak salah jemput.
1.4. Form tetap jalan seperti sekarang bila peta gagal dimuat, JavaScript mati, atau pelanggan mengetik bebas tanpa memilih saran.

## 2. Kondisi sekarang (dicek dari kode `origin/main`)

2.1. Form: `arasya-web/src/components/BookingBar.astro`. Field `pickup` (wajib, teks, maks 300) dan `dest` (opsional, maks 300). Submit membangun pesan WhatsApp, kode `ARS-XXXXX`, event GA4 `generate_lead`, dan `sendBeacon` ke `POST /api/v1/public/leads`. Tanpa JS, form jatuh ke tautan wa.me biasa.
2.2. Form dipakai di beberapa halaman (hero, halaman kota dengan `defaultPickup` / `defaultDest`), jadi satu komponen = semua halaman.
2.3. API: `src/modules/leads/leads.validation.ts` `publicLeadSchema` (zod `z.object`, kunci tak dikenal **dibuang**, bukan ditolak) → website boleh mengirim field baru sebelum API siap tanpa error. Tabel `web_leads` hanya punya `pickup_location` dan `destination` (teks). `order_service_items` juga hanya teks (`pickup_location`, `dropoff_location`). Koordinat baru ada di `trip_reports` (foto/GPS driver).
2.4. Dashboard: bukti sampai lokasi (`components/orders/ArrivalEvidence.tsx`) membuat tautan rute dari GPS driver ke **teks** alamat jemput; dengan koordinat jemput, perbandingannya jadi tepat.
2.5. `vercel.json` website belum memakai Content-Security-Policy, jadi skrip peta tidak perlu izin header tambahan (bila CSP ditambah nanti, sertakan domain penyedia peta).
2.6. Website juga melayani kota luar Jawa dan luar negeri (Singapura, Malaysia, Thailand; BACKLOG §2) → saran tempat **tidak boleh dikunci ke Indonesia saja**, cukup diprioritaskan.

## 3. Pilihan penyedia (perlu keputusan)

| # | Penyedia | Kelebihan | Kekurangan |
|---|---|---|---|
| 3.1 | **Google Maps Platform**: Places API (New) Autocomplete + Place Details, Maps JavaScript API (peta), Geocoding (alamat dari titik peta) | Data tempat Indonesia paling lengkap (nama hotel, gedung, gerbang tol, terminal), persis yang dibayangkan pelanggan | Berbayar per permintaan di atas kuota gratis; butuh akun Google Cloud + billing; syarat penggunaan (tampilkan logo/atribusi Google, data hanya dipakai bersama peta Google, cache dibatasi) |
| 3.2 | Mapbox (Search Box API + Mapbox GL) | Ada kuota gratis, tampilan peta bagus | Data POI Indonesia kurang lengkap dibanding Google |
| 3.3 | OpenStreetMap (Photon / Nominatim self-host, peta Leaflet) | Gratis, data terbuka | Server Nominatim publik **melarang** autocomplete; harus self-host (server + data); POI Indonesia paling tidak lengkap |

**Rekomendasi: 3.1 Google**, karena tujuannya "seperti mencari di Google Maps" dan pelanggan mengetik nama tempat, bukan alamat lengkap. Biaya dikendalikan dengan langkah §6. Harga dan kuota gratis **dicek di halaman pricing Google Maps Platform saat pengerjaan** (berubah dari waktu ke waktu, tidak ditulis di sini).

## 4. Rancangan UX

4.1. **Saran saat mengetik** (pola ARIA combobox):
  4.1.1. Mulai setelah 3 huruf, jeda ±300 ms; maks 5 saran; tiap saran: nama tempat tebal + alamat singkat abu-abu.
  4.1.2. Keyboard: panah atas/bawah, Enter memilih, Esc menutup; layar baca membaca jumlah saran.
  4.1.3. Prioritas lokasi: sekitar kota halaman yang dibuka (halaman Bogor → Bogor), atau Jabodetabek di halaman umum; bahasa mengikuti halaman (id/en).
  4.1.4. Setelah dipilih: field berisi "Nama tempat, alamat", muncul chip kecil "📍 Titik dipilih · Ubah" di bawah field.
  4.1.5. Bila pelanggan mengetik ulang setelah memilih, titik dihapus (teks dan titik selalu sesuai).
  4.1.6. Logo "Powered by Google" di bawah daftar saran (syarat penyedia).
4.2. **Pilih di peta** (tombol ikon peta di dalam field):
  4.2.1. Desktop: dialog; HP: layar penuh (bottom sheet) dengan kotak cari di atas, peta, pin tetap di tengah, tombol "Pakai titik ini" di bawah.
  4.2.2. Peta mulai di titik yang sudah dipilih, atau di kota halaman.
  4.2.3. Saat peta berhenti digeser: tampilkan alamat titik itu (reverse geocode, sekali per berhenti, bukan per gerakan).
  4.2.4. "Pakai lokasi saya" (hanya untuk alamat jemput; izin lokasi diminta **hanya** saat tombol ditekan).
4.3. **Tanpa memilih saran**: teks bebas tetap diterima seperti sekarang (tidak memaksa memilih).
4.4. Tidak memuat skrip peta saat halaman dibuka: skrip dimuat saat field jemput/tujuan pertama kali disentuh, supaya kecepatan halaman dan SEO tidak turun.
4.5. Pesan WhatsApp: baris jemput/tujuan diberi tautan peta, contoh `Jemput: Hotel Salak The Heritage, Jl. Ir. H. Juanda No.8, Bogor (https://maps.google.com/?q=-6.59,106.79)`.

## 5. Data dan API

5.1. Website mengirim, selain teks yang sudah ada:
  5.1.1. `pickup_lat`, `pickup_lng`, `pickup_place_id`, `pickup_place_name`
  5.1.2. `destination_lat`, `destination_lng`, `destination_place_id`, `destination_place_name`
  5.1.3. Semua opsional; dikirim hanya bila titik dipilih.
5.2. API (`api-arasya-rentcar`):
  5.2.1. Migrasi: kolom nullable di `web_leads` (8 kolom di atas; lat/lng `DOUBLE PRECISION`, place_id/name `TEXT`).
  5.2.2. Validasi zod: lat −90..90, lng −180..180, keduanya ada atau keduanya kosong; place_id/name panjang dibatasi.
  5.2.3. Order: kolom serupa di `order_service_items` (`pickup_lat`, `pickup_lng`, `pickup_place_id`, `dropoff_lat`, `dropoff_lng`, `dropoff_place_id`), terisi saat "Buat order" dari lead dan bisa diubah admin.
  5.2.4. Respons lead/order menyertakan field ini; e2e lead (grup lead yang ada) ditambah kasus koordinat valid, tidak valid, dan tanpa koordinat.
5.3. Data lokasi pelanggan = data pribadi (UU PDP): tidak dikirim ke GA4, tidak dicatat di log, hanya dikirim saat form disubmit.

## 6. Biaya dan keamanan kunci

6.1. Satu API key khusus website, dibatasi **HTTP referrer** (domain website + preview Vercel) dan **hanya API yang dipakai** (Places API (New), Maps JavaScript API, Geocoding API).
6.2. Kunci disimpan sebagai env publik build (`PUBLIC_GOOGLE_MAPS_KEY`), bukan di kode; repo website publik.
6.3. Hemat permintaan: session token (satu sesi mengetik + memilih dihitung sebagai satu sesi), jeda ketik, minimal 3 huruf, Place Details hanya field yang perlu (nama, alamat, lokasi), reverse geocode hanya saat peta berhenti.
6.4. Pasang **budget alert** dan kuota harian per API di Google Cloud supaya tagihan tidak melonjak bila ada penyalahgunaan.

## 7. Dashboard & aplikasi driver (tahap lanjut)

7.1. Lead Website: tautan "Lihat di peta" untuk jemput/tujuan.
7.2. Halaman order: tautan peta per hari; bukti sampai lokasi membandingkan GPS driver dengan **koordinat** jemput (jarak dalam meter, tanda bila > X meter; X ditentukan pemilik).
7.3. Form order admin: kotak alamat yang sama (pakai komponen saran yang sama, kunci terpisah dibatasi ke domain dashboard).
7.4. Aplikasi driver: tombol "Navigasi" membuka Google Maps ke koordinat jemput, bukan teks.

## 8. Tahapan (urutan rilis)

8.1. **F0 keputusan & akun** (pemilik): penyedia (§3), akun Google Cloud + billing, kunci + pembatasan (§6), batas anggaran.
8.2. **F1 API**: migrasi + validasi lead (§5.2.1–5.2.2) + e2e. Aman dirilis duluan (website lama tidak mengirim field baru).
8.3. **F2 Website, saran saat mengetik** (§4.1, §4.4, §4.5) + kirim koordinat. Rilis setelah F1 (sebelum F1 pun aman: field baru dibuang API, hanya tidak tersimpan).
8.4. **F3 Website, pilih di peta + lokasi saya** (§4.2).
8.5. **F4 Dashboard**: tampilkan titik di lead/order, salin ke order saat "Buat order" (§5.2.3, §7.1–7.2).
8.6. **F5 opsional**: form order admin (§7.3), navigasi aplikasi driver (§7.4, perlu APK baru).

## 9. Uji

9.1. Website: `npx astro build`; Playwright dengan `window.google` tiruan (tanpa memanggil Google sungguhan di CI): saran muncul, pilih dengan keyboard & sentuh, teks bebas tetap terkirim, mengetik ulang menghapus titik, skrip gagal dimuat → form tetap jalan, payload beacon berisi koordinat, pesan WhatsApp berisi tautan peta.
9.2. Uji manual di HP (Android Chrome, iPhone Safari): keyboard tidak menutupi daftar saran, peta bisa digeser satu jari, izin lokasi.
9.3. Workflow `verify-analytics.yml` tetap lolos (GA4 + beacon lead).
9.4. Lighthouse halaman utama sebelum/sesudah: skor kinerja tidak turun (skrip peta dimuat belakangan).
9.5. API: e2e lead + order dari lead membawa koordinat.

## 10. Pertanyaan untuk pemilik

10.1. Setuju Google Maps Platform (berbayar di atas kuota gratis) atau pilih alternatif gratis dengan data tempat lebih sedikit?
10.2. Siapa pemilik akun Google Cloud & billing (akun perusahaan PT Ayomi Raya Karsa)?
10.3. Batas anggaran bulanan untuk peta?
10.4. Wajibkan memilih titik untuk alamat jemput, atau tetap boleh teks bebas? (Saran: tetap boleh teks bebas, supaya lead tidak hilang.)
10.5. Jarak toleransi bukti sampai lokasi (§7.2), mis. 300 m?
