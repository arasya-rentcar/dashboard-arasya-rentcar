# Rencana uji lengkap — 3 Oktober 2026

Uji menyeluruh di produksi (dashboard.haikuy.com + aplikasi driver build `0e492789…` + website). Disusun dari pembacaan kode API `02bbf04`, dashboard `9fb9bd3`, mobile `f0b25dc`, dan website `main`.

- **Run I — Internal**: 1 order dari lead website, 3 hari, driver Sutan Arief (aplikasi), semua fitur uang dan aplikasi.
- **Run E — Rekanan**: 1 order rekanan (vendor uji), 3 hari, termasuk 1 hari campuran internal.
- **Run X — Uji samping**: order buangan untuk hal yang merusak order (pembatalan, Edit Order, revisi invoice) dan admin driver/unit.

Cara jalan: kerjakan per blok, lalu kirim ke Claude "I-B selesai" (dst.). Claude mengecek database setiap blok. Kirim tangkapan layar bila ada yang aneh.

Tanda:
- **Harapkan** = hasil yang benar menurut aturan bisnis.
- 🐞 = dari pembacaan kode diperkirakan **bug**. Tetap jalankan, catat apa yang terlihat; jangan berhenti.
- ⏰ = langkah yang terikat jam.

## 0. Persiapan

- Sisa uji pagi: **Order A** (`ARS-20261003-C66-1`) sudah lunas, trip selesai, menunggu finalisasi. Buka Order A → **Finalisasi Pesanan** → Harapkan order Selesai. 🐞 Daftar Order tetap menulis "Belum Final" (`is_final` tidak pernah diisi).
- ⚠️ **Jangan tekan Simpan di "Edit Order" pada order yang sudah punya driver/rekanan** (kecuali X2). Simpan menghapus semua hari lalu membuat ulang yang kosong: driver, mobil, status, jam trip, biaya ops, RTR hilang; utang driver/vendor dan biaya dari aplikasi ikut terhapus.
- Siapkan: HP Sutan (aplikasi masuk, notifikasi aktif, baterai "Tanpa pembatasan"); **nomor HP kedua milik Anda** untuk pelanggan rekanan; satu gambar apa saja untuk bukti bayar; satu gambar dummy (bukan KTP asli) untuk uji dokumen.
- Run I mengirim **1 event GA4 `purchase` sungguhan** (nilai = total order, transaction_id = kode lead) saat DP dibayar. Ini disengaja untuk menguji GA4; catat kodenya supaya bisa dikenali di laporan GA4.

---

## Run I — Order internal (lead → order → aplikasi → uang → finalisasi)

Order I: 3 hari, Sab 3 Okt 16.00 WIB, Min 4 Okt 08.00, Sen 5 Okt 08.00; Rp 800.000/hari; Overtime Rp 100.000 → total awal **Rp 2.500.000**.

### I-A. Lead website → order

1. Website arasya-web.vercel.app → form pesan: Nama `TEST UJI APLIKASI`, Tanggal hari ini, Jam 16:00, Tipe mobil **Innova Reborn**, Jemput alamat Bogor, Tujuan Jakarta, "Tambah detail": penumpang 4, Lama sewa **Beberapa hari**, Catatan `TEST UJI – abaikan` → **Kirim ke WhatsApp**.
   Harapkan: WhatsApp terbuka ke nomor resmi dengan "Kode pesanan: ARS-XXXXX" (tidak perlu dikirim). **Catat kodenya.**
2. Dashboard → **Lead Website** → tab Baru: kartu ARS-XXXXX, badge **Ada di armada**, "4 penumpang · Beberapa hari · catatan", "Dari halaman …".
3. **Buat order** → form terisi (nama, tanggal, jam, jemput, tujuan, catatan "Lead website ARS-…"), banner "Dari lead website …" dan banner paket beberapa hari.
   - Isi nomor HP Anda → muncul "Pelanggan lama: TEST UJI APLIKASI · 1 order …" → **Pakai data ini**.
   - Detail Layanan: Durasi 12 Jam, Paket All Include, **Qty / Hari 3**, Harga Satuan 800000. Biaya Tambahan: Overtime 100000.
   - Negatif dulu: kosongkan Jemput → **Buat Order** → 🐞 tidak terjadi apa-apa dan tidak ada pesan error. Isi lagi Jemput.
   - **Buat Order** → Harapkan toast "Order berhasil dibuat", kode order = **ARS-XXXXX**, 3 hari (3/4/5 Okt), total Rp 2.500.000; lead pindah ke tab "Jadi order".
4. Detail Order I → kartu **Lead Website**: Masuk, Halaman sumber, Kampanye, Unit diminta, Penumpang, Durasi, Catatan, tautan "Lihat di Lead Website".

### I-B. Pelanggan

5. **Pelanggan** → TEST UJI APLIKASI: Total Order 2, Riwayat Order berisi Order A dan Order I.
6. "Identitas & dokumen": NIK `3201000000000001` (NIK palsu), Perusahaan `TEST`, Alamat `Bogor` → **Simpan identitas**. Negatif: NIK 15 digit → "NIK harus 16 digit…".
7. **Tandai terverifikasi** → "Diverifikasi oleh … pada …". Daftar Pelanggan: NIK tampil tersamar `3201********0001` + "Terverifikasi"; cari `3201000000000001` → ketemu.
8. (Opsional — sesuai keputusan 2 Okt soal data pribadi; pakai **gambar dummy**, bukan KTP asli) Unggah dokumen KTP → **Lihat** (tautan berlaku 5 menit) → **Hapus**.

### I-C. Aturan DP dan invoice pertama

9. Order I belum dibayar: "Tetapkan untuk Semua" tidak tampil; tombol hari "Tugaskan" → pilihan driver terkunci + pesan bayar DP dulu.
10. **Invoice Sewa** → Uang Muka (DP): ketik 480000 → 🐞 dashboard mungkin menolak (minimum dihitung 20% × Rp 2.500.000 = 500.000, padahal API memakai 20% × sewa = 480.000). Lalu DP **500000** → **Buat Invoice**.
11. **Pratinjau** PDF: rekening "BCA 0954840782 a/n PT Ayomi Raya Karsa", teks pembatalan 20% / 50% sampai 10.00 WIB / 100%, Total Tagihan / DP / Sisa.
12. **Kirim** → WhatsApp terbuka dengan caption + tautan PDF (tidak perlu dikirim; tutup tab). Menu **Invoice** → baris → **Riwayat Pengiriman**: 🐞 tercatat SENT walau tidak dikirim.
13. **Tandai Terbayar**: tanpa bukti → "Bukti pembayaran wajib diupload."; dengan gambar, Metode Transfer, Jumlah Diterima kosong → Harapkan invoice Terbayar, kwitansi `KWT-…` bercap "DP DITERIMA", order "DP Terbayar". **Kirim Kwitansi** → WhatsApp.
14. GA4: buka GA4 → Realtime → harus ada event `purchase` (transaction ARS-XXXXX). Claude mengecek `web_leads.purchase_reported_at`.

### I-D. Penugasan, konfirmasi, push

15. **Tetapkan untuk Semua**: Sutan Arief + F 1000 ARA → Harapkan 3 hari Ditugaskan, push **"3 tugas baru"** di HP, order "Ditugaskan". 🐞 Tidak ada utang driver yang dibuat; tidak ada "Pengingat trip" walau hari 1 = hari ini.
16. Hari 1 → **Ubah** ("Edit Hari"): Biaya Ops (hari ini) ketik `300.000` → **Simpan & Hitung Ulang** → 🐞 bisa tersimpan Rp 300. Ulangi dengan `300000`. Harapkan pratinjau margin Rp 500.000, utang driver Sutan Rp 300.000 muncul di **Utang**.
17. **Trip** → Jadwal → hari 1, kolom Konfirmasi: **Kirim ke Customer** → WhatsApp "Data tim bertugas" (Nama / No hp / Nopol / Unit) → **Kirim juga ke driver (WhatsApp)** → pesan "Reminder Jadwal Perjalanan" + push di HP Sutan. Tutup tab tanpa kirim → 🐞 tetap "Terkirim".
18. Order I → **Ganti Semua** → driver **Iwan** → Harapkan push **"Tugas dialihkan"** di HP Sutan, trip hilang dari tab Tugas; Konfirmasi hari 1 "Berubah, perlu kirim ulang" → **Kirim Perubahan** ("Update tim bertugas … (sebelumnya …)") → **Beri tahu driver lama**. 🐞 Utang hari 1 tetap atas nama Sutan.
19. **Ganti Semua** kembali ke Sutan → push "tugas baru" lagi.
20. Hari 2 → **Ubah**: Biaya Ops 300000, Status **Terjadwal** (driver tetap Sutan) → Simpan. Di HP: hari 2 tampil "Tugas baru" dengan tombol **Terima tugas**.

### I-E. Hari 1 di aplikasi (HP Sutan)

21. Buka hari 1: cek **Telepon**, **WhatsApp**, **Buka Maps**, "Mobil & paket", Catatan. 🐞 Tidak ada tombol "Terima tugas" (status Ditugaskan dianggap sudah diterima).
22. **Foto odometer awal** (kamera) + km → **Berangkat dari garasi** → **Sampai di lokasi jemput**.
23. Laporan biaya, satu per satu, catat jam tiap kirim:
    - **Bensin**: foto kamera + 150000.
    - **Tol**: tanpa foto + 25000.
    - **Parkir**: foto dari **galeri** + 10000.
    - **Biaya lain**: 30000 tanpa catatan → "Tulis biaya untuk apa di kolom catatan." → isi `Makan driver` → kirim.
    - **Foto / Catatan**: catatan saja, tanpa foto.
24. **Foto odometer akhir** → **Selesai** → **Ya, selesai**. Lalu kirim **Parkir** 5000 lagi (struk susulan setelah selesai).
    Harapkan di database: 5 laporan biaya + 5 baris `expenses` (total Rp 220.000), jam = jam tekan.
25. Dashboard **Trip** → Riwayat → Order I hari 1: "Linimasa Perjalanan" + "Laporan Driver" + "Lihat media". 🐞 Jumlah rupiah dan label *Aplikasi* tidak tampil; detail order tidak menampilkan biaya dari aplikasi sama sekali.
26. Aplikasi → tab **Riwayat**: hari 1 ada. **Profil**: Versi, Koneksi, Server, tidak ada data tertunda.

### I-F. ⏰ Pengingat 17.00, hari 2 offline dan latar belakang

27. ⏰ Hari ini pukul **17.00 WIB**: Harapkan push **"Pengingat trip Min 4 Okt"** di HP Sutan (hari 2 punya driver + mobil).
28. Setelah 17.00 (atau besok pagi): hari 2 → **Terima tugas** (sinyal ada) → Claude cek `driver_accepted_at`.
29. **Mode Pesawat** → Foto odometer awal → Berangkat dari garasi (catat jam) → banner "… menunggu dikirim". Matikan Mode Pesawat, aplikasi tetap terbuka → terkirim sendiri ±30 detik, jam = jam tekan, tanpa data ganda.
30. **Mode Pesawat** → Sampai di lokasi jemput → Bensin dengan foto 100000 → tutup aplikasi (geser dari recent apps) → matikan Mode Pesawat → **jangan buka aplikasi 30 menit** → lapor ke Claude. Bila 45 menit belum masuk, buka aplikasi dan catat sebagai temuan.
31. Buka aplikasi → Foto odometer akhir → Selesai.

### I-G. Hari 3 dibatalkan, biaya tambahan, keuangan

32. Hari 3 → **Ubah** → Status **Dibatalkan** → Simpan. Harapkan trip hilang dari HP. 🐞 Tidak ada push pembatalan; 🐞 harga hari 3 mungkin tetap terhitung di total order.
33. **Tambah Biaya** → Tol 75000 → total order naik Rp 75.000. 🐞 "Total User" di kartu Keuangan belum ikut berubah sampai ada baris yang disimpan.
34. **Edit Fee Driver & Catatan**: Fee Driver 200000 → catat Margin. Lalu buka hari 1 → **Simpan & Hitung Ulang** tanpa perubahan → 🐞 Margin berubah (rumus ditimpa).

### I-H. Utang driver

35. **Utang** → Tagihan Driver → baris Sutan hari 1 & 2 (Rp 300.000). Edit hari 1: LAINNYA → Tambah `Uang makan` 50000 → TOTAL Rp 350.000 → Simpan.
36. **Bayar** hari 1 → Terbayar → ↺ **Tandai belum terbayar** → Belum → centang dua baris → **Bayar Terpilih** → keduanya Terbayar.

### I-I. Pelunasan dan finalisasi

37. **Invoice Tambahan** (Overtime + Tol = Rp 175.000) → **Tandai Terbayar** (bukti apa saja).
38. **Invoice Sewa** → Pelunasan (Sisa Tagihan) → cek jumlah yang disarankan dan "Jatuh tempo …" → **Buat Invoice** → **Tandai Terbayar** → order "Terbayar", kwitansi bercap LUNAS. Harapkan **tidak ada** event GA4 `purchase` kedua.
39. **Statement Gabungan (Pilih Invoice)** → pilih semua → PDF.
40. Order "Menunggu Finalisasi" (daftar Order: bucket "Perlu Finalisasi") → **Finalisasi Pesanan** → Selesai. Cek: "Edit Order" hilang; **Tambah Biaya** ditolak. 🐞 Tombol hari masih bisa mengubah order yang sudah final; 🐞 daftar masih "Belum Final".
41. **Pendapatan** (Oktober) dan **Dashboard**: catat Bruto, Biaya operasional, Fee driver, Margin bersih, dan "Margin Operasional". Claude menghitung angka yang benar. 🐞 Dashboard mengurangi biaya ops dua kali.

---

## Run E — Order rekanan (vendor uji)

Order E: pelanggan baru `TEST UJI REKANAN` (nomor HP kedua Anda), vendor uji, 3 hari: Kam 1 Okt (sudah lewat, untuk "Belum ditutup"), Min 4 Okt, Sen 5 Okt; Rp 1.500.000/hari; Parkir Rp 50.000 → total **Rp 4.550.000**; RTR Rp 1.200.000/hari. Bisa dijalankan sambil menunggu jam 17.00 Run I.

### E-A. Data rekanan

1. **Eksternal / Vendor** → **Tambah Vendor**: Nama kosong → "Nama vendor wajib diisi.". Lalu Nama `TEST VENDOR UJI`, Telepon (nomor kedua Anda), PIC `Pak Uji`, Area `Bogor`, Rekening `BCA` / `1234567890` / `TEST` → **Buat Vendor**.
2. Detail vendor → **Tambah Mobil**: `Toyota Alphard` plat `B 9999 UJI`; lalu `Isuzu Elf Long` plat `B 9998 UJI`.
3. **Edit vendor** → kosongkan Telepon → Simpan → 🐞 bisa gagal "Validation error". Isi lagi nomornya.

### E-B. Lead "Perlu rekanan" (tanpa GA4)

4. Website: kirim lead kedua, Tipe mobil **Toyota Alphard**, Catatan `TEST REKANAN`.
5. Lead Website: badge **Perlu rekanan**. **Buat order** → form terbuka dengan tab Vendor terpilih (vendor belum dipilih) → tutup **tanpa menyimpan**.
6. **Abaikan** → alasan "Hanya tanya harga" → pindah ke tab Diabaikan → **Buka lagi** → kembali ke Baru → **Abaikan** lagi (lead ini tidak dijadikan order supaya tidak ada GA4 `purchase` kedua).

### E-C. Order rekanan

7. **Order** → **Buat Order**: Nama `TEST UJI REKANAN` + nomor HP kedua Anda (pelanggan baru). Pelaksana Order: **Vendor** → TEST VENDOR UJI → Toyota Alphard.
   - Baris 1: 1 Okt, 12 Jam, Rp 1.500.000.
   - Baris 2: 4 Okt, Qty / Hari 2, Rp 1.500.000.
   - Biaya Tambahan: Parkir 50000 → **Buat Order**.
   Harapkan kode `ARS-20261003-C67-1` (pelanggan baru C67), 3 hari, semua Eksternal + Alphard.
8. Order masih **belum dibayar**. Hari 4 Okt → **Ubah**: Nama driver rekanan `Budi Uji`, No. HP (nomor kedua Anda), Plat terisi `B 9999 UJI`, RTR ketik `1.200.000` → Simpan → 🐞 RTR bisa terhapus diam-diam. Ulangi RTR `1200000`, Status **Ditugaskan** → tersimpan walau belum DP (hari rekanan bebas aturan DP). Harapkan pratinjau margin Rp 300.000 dan utang vendor Rp 1.200.000 di **Utang** → Tagihan Vendor.
9. Hari 5 Okt → **Ubah** → Internal → pilih Sutan → Harapkan ditolak "Order belum dibayar…" (hari internal di order rekanan tetap kena aturan DP). Batalkan dialog.

### E-D. Belum ditutup dan konfirmasi

10. **Trip** → Jadwal → chip **Belum ditutup (1)** + banner → hari 1 Okt → Edit: Budi Uji / nomor / plat, RTR 1200000, Status **Selesai** → hilang dari "Belum ditutup". 🐞 Jam selesai = jam Anda menutup.
11. Hari 4 Okt, kolom Konfirmasi: **Kirim ke Customer** → WhatsApp ke nomor kedua: "Data tim bertugas" berisi Budi Uji / nomor / B 9999 UJI / Alphard. **Kirim juga ke driver (WhatsApp)** → ke nomor driver rekanan; tidak ada push.
12. Ubah plat hari 4 Okt jadi `B 9997 UJI` → "Berubah, perlu kirim ulang" → **Kirim Perubahan** → "Update tim bertugas … (sebelumnya …)".
13. Hari 5 Okt sebelum diisi: kolom Konfirmasi menulis "Lengkapi driver & plat rekanan".

### E-E. Invoice gabungan, lebih bayar, refund

14. **Invoice Gabungan (Sewa + Tambahan)** (hanya bisa sebagai invoice pertama) → Rp 4.550.000 → Pratinjau → **Tandai Terbayar** dengan Jumlah Diterima **4650000** → order "Terbayar", kwitansi menampilkan "KELEBIHAN BAYAR (REFUND)" Rp 100.000, badge **Perlu refund**.
15. **Tandai Refund**: Jumlah kosong (= Rp 100.000), bukti apa saja, Catatan `uji` → badge **Sudah refund**.

### E-F. Hari campuran dan pindah internal ↔ rekanan

16. Hari 5 Okt → Internal → Sutan + F 1443 FBT, Biaya Ops 300000 → Simpan → push "Tugas baru" di HP Sutan; utang **driver** Rp 300.000.
17. Hari 5 Okt → Eksternal → TEST VENDOR UJI + Alphard, Budi Uji / nomor / `B 9999 UJI`, RTR 1200000, Status Ditugaskan → push **"Tugas dialihkan"** di HP Sutan; utang berubah jadi **vendor** Rp 1.200.000. 🐞 Biaya ops Rp 300.000 hari itu bisa tetap terhitung di total ops.
18. Pencarian **Order**: ketik `Budi Uji`, lalu `B 9999 UJI`, lalu `TEST VENDOR` → semuanya menemukan Order E.

### E-G. Penutupan, utang vendor, finalisasi

19. Hari 4 Okt dan 5 Okt → Edit → Status **Berlangsung** → Simpan → lalu **Selesai**. Order "Menunggu Finalisasi".
20. Kartu **Keuangan & Margin**: badge Eksternal, Harga Jual / RTR, "Margin (User − RTR)" = Rp 4.500.000 − Rp 3.600.000 = **Rp 900.000** (catat bila Parkir ikut dihitung).
21. **Finalisasi Pesanan** → Selesai. **Trip** → Riwayat: "Driver rekanan: Budi Uji · … · plat". 🐞 Utang vendor bisa tertulis sebagai "Fee driver".
22. Detail vendor → Tagihan & Trip → Riwayat Pembayaran → **Bayar** hari 1 Okt → 🐞 baris bisa tetap "BELUM" sampai halaman dimuat ulang; klik lagi → 409.
23. **Utang** → Tagihan Vendor → centang 2 baris lain → **Bayar Terpilih**. Detail vendor: Total Trip 3, Total Tagihan Rp 3.600.000, semua Terbayar.
24. **Pendapatan** Oktober: hari rekanan margin = pendapatan − RTR.

---

## Run X — Uji samping (order buangan)

Pakai pelanggan TEST UJI APLIKASI, **bukan dari lead**.

### X-A. Revisi invoice

1. Buat Order X: besok 4 Okt 08.00, 1 hari, Rp 1.000.000.
2. Invoice Sewa → DP 200000 → **Revisi** ("Perbarui Invoice Saat Ini") jadi 250000 → nomor baru `…-R1`, invoice lama "Direvisi".
3. Lihat badge pembayaran order. Harapkan "Belum Terbayar". 🐞 Kemungkinan "DP Terbayar" walau belum ada uang masuk; coba tugaskan driver Iwan → 🐞 diizinkan.

### X-B. Edit Order menghapus data hari

4. (Bila X-A memungkinkan penugasan; bila tidak, bayar DP dulu) Hari Order X → **Ubah**: Iwan + F 1037 ACD, Biaya Ops 300000, Status Ditugaskan → Simpan → utang Iwan Rp 300.000 muncul.
5. **Edit Order** → ubah hanya Catatan → Simpan → 🐞 hari kehilangan driver, mobil, biaya ops, status; utang Iwan hilang; status order tetap "Ditugaskan". Claude mengecek sebelum dan sesudah.

### X-C. Pembatalan

6. Tandai DP Order X terbayar (Rp 250.000).
7. **Batalkan Pesanan** → alasan `uji` → hari sebelum hari-H → tier **20%** = Rp 200.000 → panel "Refund ke pelanggan" Rp 50.000; invoice baru "Biaya Pembatalan" Rp 200.000; order hanya-baca.
   🐞 Invoice DP yang sudah dibayar ikut "Dibatalkan", jadi uang yang sudah masuk hilang dari hitungan. 🐞 Utang driver hari itu tidak terhapus.
8. ⏰ (Opsional, besok) Order Y untuk 4 Okt, batalkan sebelum 10.00 WIB → tier 50%; Order Z hari-H setelah 10.00 → 100%.

### X-D. Admin driver, unit, login aplikasi

9. **Driver** → Edit Iwan → ganti nomor HP dengan nomor Sutan ditulis `+62 813…` → Harapkan 409 "Nomor HP 08… sudah dipakai driver lain (Sutan Arief)…". Batal.
10. **Unit** → tambah unit uji `TEST 1` tanpa kode unit, lalu `TEST 2` tanpa kode unit → 🐞 yang kedua gagal (error server). Hapus unit uji setelahnya.
11. Aplikasi: **Profil** → **Keluar** (pastikan tidak ada data tertunda) → kata sandi salah → "Nomor HP/email atau kata sandi salah" → masuk dengan email admin → "Aplikasi ini untuk driver. Silakan pakai dashboard admin." → **Keluar** → masuk lagi sebagai Sutan.

---

## Pembersihan (setelah semua selesai)

Claude menyiapkan SQL; pemilik menjalankannya di SQL Editor (konektor Claude tidak bisa DELETE). Yang dihapus: Order A, I, E, X (+ Y/Z) beserta invoice, receipt, utang, laporan, biaya, log; pelanggan TEST UJI REKANAN; lead uji (2); vendor TEST VENDOR UJI + 2 mobilnya; unit TEST 1/2. Identitas uji di TEST UJI APLIKASI dikosongkan atau pelanggannya dihapus. File storage:
- bucket `invoices`: `invoices/<nomor>.pdf` dan `-receipt.pdf`, serta `trip-reports/<line>/…` (foto aplikasi disimpan di sini, bukan di `driver-reports`);
- bucket `payment-proofs`: `invoice/<id>/…`, `refunds/<order>/…`, `customer-docs/<id>/…`.
Lalu hapus schema `backup_20261002` bila uji dianggap selesai.

## Pertanyaan untuk pemilik (menentukan penilaian I-G/I-H)

1. **Biaya Ops vs Fee Driver.** Sekarang utang driver = Biaya Ops per hari, sedangkan "Fee Driver" di kartu Keuangan tidak terhubung ke utang. Yang dibayar ke driver itu Biaya Ops, Fee Driver, atau keduanya?
2. **Biaya dari aplikasi** (Bensin/Tol/Parkir/Biaya lain) tidak masuk Biaya Ops, utang, maupun margin, dan tidak tampil di dashboard selain media di Riwayat. Seharusnya masuk ke mana?
