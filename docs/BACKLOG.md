# Backlog (ditunda)

Hal-hal yang sengaja belum dikerjakan. Urutan bukan prioritas.

## 1. Satu daftar harga resmi

- Website memakai `priceCity` / `priceAllIn`, sedangkan Panduan di dashboard memakai harga yang sudah termasuk BBM, tol, dan makan. Angkanya belum disamakan.
- Perlu satu sumber kebenaran harga, lalu tabel harga di sistem supaya `unit_price` terisi otomatis saat order dibuat dari lead (unit + durasi + area).

## 2. Master area / kota

- Website melayani: Cirebon, Semarang, Jogja, Surabaya, Malang, Solo, Madiun, Pekalongan, Singapura, Malaysia, Thailand.
- Sistem dan bot hanya mengenal Jabodetabek, Bandung, Serang.
- Perlu master area/kota yang dipakai bersama website, bot, dan dashboard.

## 3. Enum layanan dan definisi XOPS

- Tambah nilai layanan untuk `PULANG_PERGI`, `MULTI_DAY`, dan luar kota. Sekarang lead "return"/"multi" masuk sebagai 12 Jam dan harus disesuaikan manual.
- Tetapkan definisi XOPS (apa yang dihitung, siapa yang menanggung) dan tulis di Panduan.

## 4. Data contoh armada

- Ganti data mobil contoh di prisma seed dengan armada Arasya yang asli, supaya badge "Ada di armada" pada lead akurat di lingkungan baru.

## 5. Kartu e-toll: baca saldo dan riwayat lewat NFC (tahap 2, mulai ±10 Okt 2026)

Tujuan (owner): saldo dan riwayat transaksi dibaca dari chip kartu lewat HP, dicatat ke database, dan tampil di dashboard. **Siapkan untuk semua bank, bukan hanya Mandiri**: kartu kantor bisa diganti ke bank lain kapan saja.

Sudah ada (tahap 1, 5 Okt): daftar kartu, siapa yang memegang, top-up dengan nominal, cek saldo yang diketik, riwayat, kolom `source` (`MANUAL`/`NFC`) di transaksi dan di endpoint saldo driver, nomor kartu lengkap tersimpan (untuk mencocokkan kartu yang ditempel), dan layar uji "Tes kartu NFC" di aplikasi (modul NFC sudah ada di APK build af651751).

Referensi: [agusibrahim/emoney_reader_demo](https://github.com/agusibrahim/emoney_reader_demo) (ESP32 + PN532, MIT). Hanya Mandiri e-Money, hanya saldo dan nomor kartu, tanpa riwayat:
- `00A40400080000000000000001` pilih aplikasi e-Money.
- `00B300003F` info kartu: nomor kartu = 8 byte pertama ditulis hex (16 digit).
- `00B500000A` saldo = 4 byte pertama, byte terkecil dulu (little-endian).
- Layar "Tes kartu NFC" sudah mengirim tiga perintah yang sama. Bank lain (Flazz, Brizzi, TapCash, JakCard) hanya ada di versi berbayar penulisnya (hello@agusibrah.im); library "full version" yang ditautkan tidak publik.

Rancangan (semua bank):
- **Perintah baca diatur server.** `GET /driver/etoll-cards/nfc-script` (berversi, disimpan di HP, ada bawaan di APK untuk offline) berisi profil per bank: perintah pengenal (SELECT) lalu perintah baca. Aplikasi menjalankan profil sampai satu cocok dan mengirim jawaban mentah; **server yang menerjemahkan** (`decoders/<bank>.ts`). Menambah atau mengganti bank = deploy API saja, tanpa APK baru.
- **Aplikasi hanya mau membaca.** Daftar perintah yang diizinkan tertanam di APK: ISO SELECT, READ BINARY, READ RECORD, GET DATA, GET RESPONSE, Mandiri B3/B5, DESFire GetVersion, GetApplicationIDs, SelectApplication, GetFileIDs, GetFileSettings, ReadData, ReadRecords, GetValue dan lanjutan (AF). Perintah lain ditolak walau diminta server. Menambah perintah baru ke daftar ini perlu APK baru.
- **Penjelajah untuk kartu yang belum dikenal:** rutin bawaan (isi DESFire yang terbuka tanpa kunci, sapuan READ RECORD) jalan saat tidak ada profil yang cocok, atau saat profil diberi tanda "jelajah". Jawaban mentah selalu disimpan (`etoll_nfc_reads`, JSON) dan bisa diunduh dari dashboard, jadi hasil uji tidak perlu dibagikan manual.
- **Kartu dikenali dari nomor di chip**, dicocokkan dengan `etoll_cards.card_number`. Kartu yang ditempel tapi belum terdaftar muncul di dashboard dengan tombol "Daftarkan" (bank dan nomor sudah terisi). Bila kartu yang ditempel beda dengan kartu yang dipilih driver, saldo dicatat ke kartu yang benar dan driver diberi tahu.
- **Saldo terbaca** = cek saldo `source: NFC` (jadi titik awal perkiraan saldo).
- **Riwayat di chip** (bila bank-nya terbaca) diimpor sebagai TOL / masuk ke chip `source: NFC` dengan `chip_key` unik per kartu (dibaca ulang tidak dobel), dikaitkan ke driver yang memegang kartu saat itu. Tidak ikut hitungan perkiraan saldo (saldo hasil baca sudah jadi titik awal). Isi saldo di chip tampil terpisah dari top-up kantor (m-banking), jadi terlihat kapan driver sudah update saldo.
- Tambahan data (aditif): tabel `etoll_nfc_reads` (kartu, driver, momen, bank terdeteksi, nomor, saldo, jawaban mentah, versi skrip, `client_ref`), kolom `etoll_transactions.chip_key`, `terminal`, `nfc_read_id`.
- Momen tempel: saat ambil dan kembalikan kartu, setelah update saldo di aplikasi bank, dan cek saldo kapan saja. Lewat antrean offline seperti aksi lain; saldo tampil setelah server menjawab.
- Nanti: tempel saat "Berangkat" dan "Selesai" untuk tol per trip = saldo saat berangkat − saldo saat selesai + top-up di antaranya; bila riwayat terbaca, TOL dicocokkan ke trip menurut waktu dan biaya tol dengan kartu kantor otomatis "Dibayar kantor".
- Bila saldo terbaca lebih kecil dari perkiraan setelah top-up, ingatkan driver untuk update saldo. Peringatan saldo rendah (mis. di bawah Rp 100.000) di dashboard dan aplikasi.

Batasan:
- Log di chip pendek dan tertimpa; riwayat hanya lengkap bila kartu sering ditempel.
- Entri chip biasanya hanya nominal, waktu, dan ID terminal, bukan nama gerbang tol.
- Hanya baca. Update saldo setelah top-up m-banking tetap di aplikasi bank.
- HP tanpa NFC tetap mengetik saldo. Kartu FeliCa / MIFARE Classic hanya memberi ID chip.

Urutan kerja saat mulai:
1. APK baru: pembaca berbasis skrip + daftar perintah baca + penjelajah; API: skrip, `etoll_nfc_reads`, decoder Mandiri; dashboard: bacaan NFC di detail kartu, kartu belum terdaftar, unduh data mentah.
2. Owner menempelkan satu kartu per bank, sekaligus screenshot saldo dan riwayat terakhir di aplikasi bank untuk pembanding.
3. Decoder bank lain lewat deploy API. Bila bank tertentu terkunci, pertimbangkan versi berbayar penulis referensi.

Bisa dicek sekarang dengan APK yang ada: di "Tes kartu NFC", kartu Mandiri harus menunjukkan "Kemungkinan saldo" yang sama dengan aplikasi bank, dan 16 karakter pertama baris "Info kartu (B3)" sama dengan nomor yang tercetak di kartu. Catat juga berapa kartu per bank.

Kolom lama `drivers.etoll_card` (teks bebas) tidak dipakai lagi; bisa dihapus setelah semua driver memakai APK baru.

## 6. Dari rilis 7 Okt (keuangan B + daftar harga)

1. Keuangan (keputusan pemilik sudah ada, lihat HANDOFF "Status 7 Okt" §4)
   1.1. Denda per hari untuk hari yang dibatalkan (B1.2) dan Batalkan Pesanan dihitung per hari juga; ajukan draf teks kebijakan baru (website, caption, PDF) ke pemilik sebelum rilis.
   1.2. Saldo lebih di order (kelebihan uang): bawaan mengurangi tagihan berikutnya, admin bisa memilih refund.
   1.3. Tandai terbayar dengan uang kurang/lebih (B3) + invoice penyesuaian; refund mengurangi kas, piutang, dan cek lunas (B4).
   1.4. Sisa temuan: B5 (margin hari belum ditugaskan), B6 (halaman order menyuruh menagih uang yang sudah diterima setelah batal), B8 (`client_ref` invoice/biaya tambahan), B9 (urutan lock), B10 (ganti biaya di hari yang sudah dibayar), B11 (tanggal belum WIB), B12 sisa (batas 10:00:59, GA4 untuk invoice denda).
   1.5. Dashboard: saran DP di form invoice memakai harga hari yang tidak batal (bukan `final_price`), petunjuk DP minimal di revisi invoice dan Tandai terbayar, petunjuk "hari terakhir lewat Batalkan Pesanan" di Edit Hari.
2. Daftar harga
   2.1. `client_ref` untuk tambah mobil dan tambah area (sekarang kirim ulang dijawab 409 walau sudah tersimpan).
   2.2. Penanda tetap tabel milik kota (sekarang dicocokkan dari nama kota di dashboard dan website; mengganti nama kota menghilangkan biaya tambahan areanya).
   2.3. Satu entri ganda "Daftar Harga" tertinggal di riwayat browser setelah meninggalkan halaman dan membuang isian.
3. Alur kerja
   3.1. CI di pull request untuk API (build + e2e dengan Postgres) dan dashboard (`tsc` + `next build`). Sekarang belum ada cek otomatis di PR.
   3.2. `npm run build` API gagal di Windows (`copy:assets` lewat cmd.exe); buat lintas platform.

## 7. Import Google Sheet di halaman Order

- Tombol "Preview Sheet" dan "Import Sheet" tetap dipakai (pemilik, 7 Okt), tetapi format sheet yang dibaca importer belum sesuai dengan data order yang sekarang (pelanggan/PIC, baris layanan per hari, unit, rekanan, invoice).
- Perlu: contoh sheet yang dipakai tim (atau template baru yang disepakati), lalu sesuaikan pemetaan kolom di API (`/sheet-imports/preview`, `/sheet-imports/import`) dan tampilan pratinjau di dashboard.

## 8. Website: alamat jemput & tujuan lewat peta

- Saran tempat saat mengetik (seperti Google Maps), pilih titik di peta, "Pakai lokasi saya"; koordinat ikut ke lead, order, dan aplikasi driver. Rencana lengkap: `docs/PLAN-WEB-MAPS-PICKER.md` (menunggu keputusan penyedia & akun Google Cloud).
