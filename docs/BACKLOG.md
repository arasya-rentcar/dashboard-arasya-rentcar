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

## 5. Kartu e-toll: baca saldo lewat NFC (tahap 2)

- Tahap 1 (5 Okt) sudah ada: daftar kartu, siapa yang memegang, top-up dengan nominal, cek saldo yang diketik, riwayat, dan layar uji "Tes kartu NFC" di aplikasi.
- Tahap 2, setelah hasil uji NFC per bank: driver menempelkan kartu saat ambil/kembalikan, saat "Berangkat" dan "Selesai", dan saat minta top-up. Saldo terbaca dicatat sebagai cek saldo `source: NFC`, kartu dikenali tanpa memilih dari daftar.
- Pemakaian tol per trip = saldo saat berangkat − saldo saat selesai + top-up di antaranya. Bila riwayat di chip terbaca, impor sebagai transaksi TOL (tanpa dobel) dan cocokkan dengan trip menurut waktu. Biaya tol yang dibayar dengan kartu kantor otomatis "Dibayar kantor".
- Top-up dari m-banking baru masuk ke chip setelah kartu ditempel untuk update; bila saldo terbaca lebih kecil dari perkiraan setelah top-up, aplikasi mengingatkan driver untuk update saldo.
- Peringatan saldo rendah (mis. di bawah Rp 100.000) di dashboard dan aplikasi.
- Kolom lama `drivers.etoll_card` (teks bebas) tidak dipakai lagi; bisa dihapus setelah semua driver memakai APK baru.

