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
