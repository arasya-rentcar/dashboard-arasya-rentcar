# Website Operation Flow — Arasya Rentcar

Dokumen ini menjelaskan flow yang harus terlihat dan bisa dikelola dari Website/Admin Dashboard Arasya.

Dokumen integrasi utama:

```text
/root/.openclaw/workspace/arasya-projects/ARASYA_INTEGRATION_FLOW.md
```

---

## 1. Peran Website

Website bukan hanya CRUD admin. Website harus menjadi layar operasional utama untuk:

- Membuat order manual.
- Melihat order yang masuk dari WhatsApp bot.
- Melacak status dispatch ke driver.
- Melihat status trip berjalan.
- Melihat report driver dari WhatsApp.
- Membuka attachment foto/PDF.
- Melihat summary setelah order selesai.
- Menangani order/report yang butuh review.
- Export laporan bulanan jika dibutuhkan.

API tetap menjadi source of truth; website membaca dan menulis lewat API.

---

## 2. Order Sources

Order bisa datang dari dua sumber:

### WHATSAPP

```text
Admin kirim order ke grup internal WhatsApp
        ↓
Bot parse + create order ke API
        ↓
Website menampilkan order source=WHATSAPP status=CREATED
```

### WEB

```text
Admin create order manual dari Website
        ↓
Website create order ke API
        ↓
Website menampilkan order source=WEB status=CREATED
```

Website harus memperlakukan keduanya sebagai order yang sama-sama valid.

---

## 3. Website Order Lifecycle

```text
CREATED
  Order sudah dibuat, tapi belum terbukti diterima driver.

ASSIGNED
  Driver sudah menerima detail order via WhatsApp bot, atau admin override eksplisit.

IN_PROGRESS
  Driver sudah START/mulai/jemput, atau admin override eksplisit.

DONE
  Driver sudah FINISH/selesai/drop off, atau admin close manual eksplisit.

CANCELLED
  Order dibatalkan admin.

NEEDS_REVIEW
  Ada masalah: dispatch gagal, report unmatched, data kurang, konflik driver/mobil, atau summary missing item.
```

Rule penting:

- Pilih driver/mobil saja tidak otomatis `ASSIGNED`.
- Foto/PDF/report biasa tidak otomatis `DONE`.
- `DONE` harus dari FINISH/selesai/drop off atau admin manual close.

---

## 4. Orders List

Orders List minimal menampilkan:

- Order Code
- Source: `WHATSAPP` / `WEB`
- Status
- Customer utama
- Tanggal/jam jemput
- Pickup
- Tujuan
- Driver
- Mobil
- Last report time
- Needs review flag

Filter minimal:

- Tanggal
- Status
- Source
- Driver
- Mobil
- Needs review

Quick indicators:

- `CREATED` terlalu lama belum dispatch.
- `ASSIGNED` tapi belum START.
- `IN_PROGRESS` terlalu lama belum FINISH.
- Ada unmatched report.
- Ada missing document/report setelah FINISH.

---

## 5. Create Order dari Website

Flow:

```text
Admin klik Create Order
        ↓
Isi customer, phone, tanggal, jam, pickup, tujuan, layanan, penumpang, driver, mobil, notes
        ↓
Website POST order ke API source=WEB
        ↓
API generate/return order_code
        ↓
Website redirect ke Order Detail
```

Setelah order dibuat, admin punya opsi:

1. Simpan saja sebagai order internal.
2. Assign driver/mobil.
3. Send to Driver via WhatsApp bot.
4. Manual mark assigned dengan reason jika driver dihubungi di luar bot.

---

## 6. Send to Driver via WhatsApp

Target flow:

```text
Admin klik Send to Driver via WhatsApp
        ↓
Website/API membuat dispatch request
        ↓
Bot mengirim detail order ke driver
        ↓
Jika sukses:
  bot update driver_message_sent_at
  API status → ASSIGNED
        ↓
Website menampilkan status ASSIGNED
```

Jika gagal:

```text
API/Website set needs_review=true
review_reason=driver_message_failed
Order tetap CREATED
Admin melihat alert dan bisa retry
```

---

## 7. Order Detail Page

Order Detail harus menampilkan:

### Header

- `order_code`
- status
- source
- needs review badge
- created time
- last updated time

### Order Info

- Semua customer (`OrderCustomer`)
- Pickup/dropoff
- tanggal/jam
- service type
- passenger count
- notes
- raw WhatsApp text jika source `WHATSAPP`

### Assignment

- Driver
- Driver phone
- Driver origin
- Mobil
- Driver message sent time
- Manual override reason jika ada

### Timeline / Reports

Tampilkan semua `TripReport` / `OrderReport`:

- START
- PHOTO
- STOP
- TEXT_REPORT
- ETOLL_DOCUMENT
- ODOMETER_DOCUMENT
- EXPENSE_DOCUMENT
- FINISH
- UNMATCHED / NEEDS_REVIEW

Untuk tiap report tampilkan:

- Waktu
- Driver
- Report type
- Input type
- Notes
- Attachment link/image/PDF
- Extracted text jika ada
- Match method
- Status matched/unmatched

### Summary

Setelah order selesai, tampilkan `OrderSummary`:

- START received
- FINISH received
- Expense/document received
- e-toll/tol
- BBM
- parkir
- odometer start/finish
- total KM
- missing items
- needs review reason

---

## 8. Dashboard Cards

Dashboard operational cards yang disarankan:

- Today Orders
- Pending Dispatch (`CREATED` belum sent driver)
- Assigned Not Started
- Active Trips (`IN_PROGRESS`)
- Done Today
- Needs Review
- Unmatched Reports
- Dispatch Failed

Dashboard harus membantu admin tahu apa yang perlu ditindak sekarang.

---

## 9. Manual Override

Website boleh punya action manual, tapi wajib eksplisit dan tersimpan reason.

Contoh action:

- Mark as Assigned
- Mark as Started
- Mark as Done
- Cancel Order
- Link unmatched report to order
- Change driver/mobil
- Retry send to driver

Setiap override harus menyimpan:

- Admin user
- Timestamp
- Previous status
- New status
- Reason

---

## 10. Reporting / Export

Website/API sebaiknya menjadi sumber laporan bulanan.

Google Sheets bisa tetap dipakai sebagai:

- Export otomatis.
- Backup laporan.
- File yang mudah dibaca manajemen.

Tapi data operasional utama tetap:

```text
API → Website
```

Bukan:

```text
Google Sheets → Website
```

---

## 11. Non-Negotiable Rules

- Jangan auto `ASSIGNED` hanya karena driver dipilih.
- Jangan auto `DONE` dari PDF/foto.
- Jangan hilangkan unmatched report; simpan dan tampilkan untuk review.
- Jangan hanya simpan report di Sheets; report harus masuk API.
- Jangan sembunyikan dispatch failure dari dashboard.
- Semua manual override wajib punya reason.
