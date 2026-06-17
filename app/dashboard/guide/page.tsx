import {
  AlertCircle,
  Bot,
  Car,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  Handshake,
  HelpCircle,
  MessageCircle,
  MousePointerClick,
  Send,
  Table2,
  UserRound,
  Users,
} from "lucide-react";
import DashboardShell from "@/components/layout/DashboardShell";

const steps = [
  "Terima order dari customer atau owner.",
  "Input order lewat WhatsApp group Internal Arasya atau tombol Create Order di website.",
  "Cek order di menu Orders: PIC, service detail, rute, mobil, driver, dan harga.",
  "Assign driver/mobil per hari di menu Schedule. Order multi-hari bisa ganti driver tiap hari.",
  "Cek ketersediaan driver (FREE/BUSY) di Schedule sebelum assign agar tidak bentrok.",
  "Generate invoice dari Order Detail.",
  "Kirim invoice PDF ke WhatsApp customer dari menu Invoices.",
  "Driver kirim laporan/foto perjalanan ke bot.",
  "Set status tiap hari di Schedule (SCHEDULED -> IN_PROGRESS -> DONE).",
  "Order selesai setelah semua hari DONE dan data sudah lengkap.",
];

const keywords = [
  [
    "PIC / Nama / HP",
    "Data customer atau penanggung jawab yang bisa dihubungi.",
  ],
  [
    "Booking",
    "Waktu order dibuat. Di website otomatis memakai waktu order dibuat; di WhatsApp boleh ditulis jika order lama/perlu tanggal khusus.",
  ],
  [
    "DETAIL / Rincian / Itinerary",
    "Awal daftar layanan/rute. Setiap nomor jadi satu baris invoice sekaligus satu hari di Schedule. Driver bisa diisi berbeda di tiap nomor.",
  ],
  ["Pickup / Jemput", "Lokasi penjemputan."],
  ["Dropoff / Tujuan / Antar", "Lokasi tujuan/dropoff."],
  ["Mobil / Unit", "Kode unit atau tipe mobil, contoh ARA, FCB, VLZ1, Innova."],
  [
    "Driver",
    "Internal cukup nama pendek/tag. External wajib nama + HP + asal.",
  ],
  ["HP Driver / WA Driver", "Nomor WhatsApp driver external."],
  ["Asal Driver", "Base driver external, contoh Bandung, Bogor, Jakarta."],
  ["Harga", "Harga per baris layanan. Total order dihitung dari semua baris."],
  ["Catatan", "Info tambahan untuk admin/driver."],
  [
    "TBA / TBC / TBD / menyusul",
    "Boleh untuk lokasi/jam yang belum pasti, terutama hari berikutnya.",
  ],
];

const websiteCases = [
  [
    "Create Order",
    "Isi PIC, Booking, pickup/dropoff utama, lalu tambah Service Detail. Jika ada beberapa hari/rute, buat beberapa baris.",
  ],
  [
    "Edit Order",
    "Gunakan saat ada perubahan harga/rute. Jika harga berubah dan invoice sudah ada, tulis alasan perubahan agar tercatat.",
  ],
  [
    "Assign Driver/Car",
    "Pilih driver dan mobil dari daftar. Unit code seperti ARA/FCB/VLZ membantu mencari mobil cepat.",
  ],
  [
    "Generate Invoice",
    "Buat invoice setelah total order sudah benar. PDF otomatis dibuat dan bisa dipreview.",
  ],
  [
    "Revise Invoice",
    "Jika order berubah setelah invoice dibuat, gunakan revisi/sync invoice. Invoice lama tetap menjadi history.",
  ],
  [
    "Send Invoice WA",
    "Di menu Invoices, expand row, pilih penerima, lalu Send PDF via WhatsApp. History akan tersimpan.",
  ],
  [
    "Cars/Drivers",
    "Tambah/edit data master. Untuk internal, simpan phone asli agar tag WhatsApp bisa match ke database.",
  ],
];

const scheduleCases = [
  [
    "Agenda (daftar harian)",
    "Tab Agenda menampilkan satu baris per hari per order. Filter berdasarkan tanggal, driver, tipe (Internal/External), dan status.",
  ],
  [
    "Assign / ganti per hari",
    "Klik Edit pada baris untuk pilih driver+mobil (internal) atau vendor+mobil (external) khusus hari itu. Order multi-hari boleh beda driver tiap hari.",
  ],
  [
    "Status per hari",
    "Setiap hari punya status sendiri: SCHEDULED, IN_PROGRESS, DONE, CANCELLED. Ubah saat perjalanan jalan.",
  ],
  [
    "Ketersediaan driver",
    "Tab Driver Availability menampilkan FREE/BUSY tiap driver untuk tanggal terpilih, dihitung dari jadwal (bukan status order). Pakai ini sebelum assign agar tidak bentrok.",
  ],
];

const customerCases = [
  [
    "Otomatis dari order",
    "Customer tersimpan otomatis saat order dibuat (dari WhatsApp atau website), dicocokkan berdasarkan nomor HP.",
  ],
  [
    "Riwayat order",
    "Buka detail customer untuk lihat total order dan daftar order sebelumnya. Berguna untuk customer langganan.",
  ],
  [
    "Tags & catatan",
    "Tambahkan tag (mis. VIP, Corporate) dan catatan untuk info penting customer.",
  ],
];

const externalCases = [
  [
    "Vendor & mobil",
    "Menu External menyimpan vendor/driver luar beserta mobil-mobil mereka (satu vendor bisa punya banyak mobil).",
  ],
  [
    "Otomatis dari order",
    "Saat order external dibuat dari WhatsApp (driver pakai nama + HP + asal), vendor dan mobilnya dibuat otomatis lalu bisa dirapikan di menu ini.",
  ],
  [
    "Pakai di Schedule",
    "Saat assign hari external di Schedule, pilih vendor dan mobilnya dari daftar yang sudah tersimpan di sini.",
  ],
];

const layananCities = [
  {
    city: "Jakarta",
    area: "Pemakaian dalam kota Jakarta",
    included: "Harga sewa termasuk Mobil, Supir, Bensin, Tol, dan Makan Supir.",
    excluded:
      "Belum termasuk Parkir/Tiket masuk wisata dan Tip Supir seikhlasnya.",
    twelveHour: [
      ["Avanza Sekelas", "750.000"],
      ["Xpander", "850.000"],
      ["Innova Reborn", "1.000.000"],
      ["Innova Zenix", "1.300.000"],
      ["Innova Zenix Q", "1.700.000"],
    ],
    fullDay: [
      ["Avanza Sekelas", "950.000"],
      ["Xpander", "1.100.000"],
      ["Innova Reborn", "1.250.000"],
      ["Innova Zenix", "1.600.000"],
      ["Innova Zenix Q", "2.100.000"],
    ],
    overtime:
      "Pemakaian melebihi durasi sewa atau lewat jam 23.00 dikenakan biaya overtime 10% per jam.",
    extra: [
      "Tangerang +200.000",
      "Bekasi +100.000",
      "Cikarang +200.000",
      "Depok +100.000",
      "Bogor +100.000",
      "Puncak +200.000",
    ],
  },
  {
    city: "Bandung",
    area: "Pemakaian area Bandung",
    included: "Harga sewa termasuk Mobil, Supir, Bensin, Tol, dan Makan Supir.",
    excluded:
      "Belum termasuk Parkir/Tiket masuk wisata dan Tip Supir seikhlasnya.",
    twelveHour: [
      ["Avanza Sekelas", "850.000"],
      ["Xpander", "950.000"],
      ["Innova Reborn", "1.100.000"],
      ["Innova Zenix", "1.400.000"],
      ["Innova Zenix Q", "1.800.000"],
    ],
    fullDay: [
      ["Avanza Sekelas", "1.100.000"],
      ["Xpander", "1.200.000"],
      ["Innova Reborn", "1.350.000"],
      ["Innova Zenix", "1.700.000"],
      ["Innova Zenix Q", "2.200.000"],
    ],
    overtime:
      "Pemakaian melebihi durasi sewa atau lewat dari jam 23.00 dikenakan biaya overtime 10% per jam.",
    extra: [
      "Tambahan 100.000 untuk area: Tangkuban Parahu, Ciater, Jatinangor, Pangalengan",
    ],
  },
  {
    city: "Surabaya",
    area: "Pemakaian dalam kota Surabaya",
    included: "Harga sewa termasuk Mobil, Supir, Bensin, Tol, dan Makan Supir.",
    excluded:
      "Belum termasuk Parkir/Tiket masuk wisata dan Tip Supir seikhlasnya.",
    twelveHour: [
      ["Avanza Sekelas", "850.000"],
      ["Veloz", "950.000"],
      ["Innova Reborn", "1.100.000"],
      ["Innova Zenix", "1.400.000"],
      ["Innova Zenix Q", "1.800.000"],
    ],
    fullDay: [
      ["Avanza Sekelas", "1.100.000"],
      ["Veloz", "1.200.000"],
      ["Innova Reborn", "1.350.000"],
      ["Innova Zenix", "1.700.000"],
      ["Innova Zenix Q", "2.200.000"],
    ],
    overtime:
      "Pemakaian melebihi durasi sewa atau lewat dari jam 23.00 dikenakan biaya overtime 10% per jam.",
    extra: [
      "Gresik +200.000",
      "Sidoarjo +150.000",
      "Prigen +250.000",
      "Mojokerto +250.000",
      "Kediri +500.000",
      "Pasuruan +400.000",
      "Malang +400.000",
      "Bromo +500.000",
      "Probolinggo +500.000",
    ],
  },
];

const mistakes = [
  "External driver tidak boleh hanya tag. Tulis nama + nomor WA + asal/base.",
  "Jangan lupa Harga di setiap baris detail, karena invoice dihitung dari baris layanan.",
  "Invoice REVISED, CANCELLED, atau DRAFT tidak bisa dikirim ke WhatsApp customer.",
  "Jika invoice belum punya PDF, generate/sync invoice dulu sebelum kirim.",
  "Jika tag driver internal gagal match, pastikan nomor WhatsApp driver di database benar.",
];

const botTemplates = [
  {
    title: "1. Internal driver pakai nama pendek",
    note: "Paling aman untuk operasional. Bot match nama ke database.",
    text: `#order

PIC:
Nama: Budi Santoso
HP: 081234567890

Booking:
29 Mei 2026 15:00

DETAIL:
1. 30 Mei 2026 | 09:00-11:00
Pickup: Bandara Soekarno-Hatta Terminal 3
Dropoff: Hotel Mulia Senayan
Mobil: ARA
Layanan: 12 JAM
Driver: Sutan
Harga: 750000
Catatan: Jemput VIP`,
  },
  {
    title: "2. Internal driver pakai tag WhatsApp",
    note: "Bisa dipakai jika nomor tag sudah sama dengan phone driver di database.",
    text: `#order

PIC:
Nama: Budi Santoso
HP: 081234567890

Booking:
29 Mei 2026 15:00

DETAIL:
1. 30 Mei 2026 | 09:00-11:00
Pickup: Bandara Soekarno-Hatta Terminal 3
Dropoff: Hotel Mulia Senayan
Mobil: ARA
Layanan: 12 JAM
Harga: 750000
Catatan: Jemput VIP

@Sutan`,
  },
  {
    title: "3. Multi-day / banyak rute (driver bisa beda tiap hari)",
    note: "Setiap nomor menjadi satu hari di Schedule dan satu baris invoice. Tulis Driver di tiap nomor; boleh berbeda tiap hari. Total otomatis dari semua Harga.",
    text: `#order

PIC:
Nama: Budi Santoso
HP: 081234567890

Booking:
29 Mei 2026 15:00

DETAIL:
1. 30 Mei 2026 | 09:00-11:00
Pickup: Bandara Soetta T3
Dropoff: Hotel Mulia
Mobil: ARA
Layanan: 12 JAM
Driver: Sutan
Harga: 750000

2. 31 Mei 2026 | 08:00-17:00
Pickup: Hotel Mulia
Dropoff: Sentul
Mobil: ARA
Layanan: FULL DAY
Driver: Rori
Harga: 950000
Catatan: Hari kedua ganti driver`,
  },
  {
    title: "4. Lokasi/jam menyusul",
    note: "Boleh untuk hari berikutnya. Hari pertama sebaiknya lengkap.",
    text: `#order

PIC:
Nama: Rina
HP: 082222222222

Booking:
29 Mei 2026 16:00

DETAIL:
1. 30 Mei 2026 | 10:00-12:00
Pickup: Stasiun Gambir
Dropoff: Hotel Indonesia Kempinski
Mobil: FCB
Layanan: FULL DAY
Driver: Ruli
Harga: 650000

2. 31 Mei 2026 | 08:00-TBC
Pickup: Hotel Indonesia Kempinski
Dropoff: TBA
Mobil: FCB
Layanan: FULL DAY
Driver: Ruli
Harga: 650000
Catatan: Tujuan hari kedua menyusul`,
  },
  {
    title: "5. External driver",
    note: "Wajib nama + nomor WA + asal/base. External tidak perlu akun/email.",
    text: `#order

PIC:
Nama: Budi Santoso
HP: 081234567890

Booking:
29 Mei 2026 15:00

DETAIL:
1. 30 Mei 2026 | 09:00-11:00
Pickup: Bandara Soekarno-Hatta Terminal 3
Dropoff: Hotel Mulia Senayan
Mobil: External Innova
Layanan: ALL INCLUDED
Driver: Budi External / 081288889999 / Bandung
Harga: 750000
Catatan: Driver luar, asal Bandung`,
  },
  {
    title: "6. Beberapa PIC/customer",
    note: "PIC pertama jadi primary. PIC tambahan tetap tersimpan di order.",
    text: `#order

PIC:
Nama: Budi Santoso
HP: 081234567890
PIC 2: Sari Finance / 082222222222
PIC 3: Andi Lapangan / 083333333333

Booking:
29 Mei 2026 15:00

DETAIL:
1. 30 Mei 2026 | 09:00-11:00
Pickup: Kantor Customer
Dropoff: Bandara Soetta
Mobil: VLZ1
Layanan: 12 JAM
Driver: Rori
Harga: 700000`,
  },
];

const driverReportExamples = [
  ["Start", "#start\nStart dari pool Arasya menuju pickup customer. Odo 12345."],
  ["Drop", "#drop\nSudah dropoff di tujuan / customer sudah turun."],
  ["Drop 1", "#drop 1\nCustomer pertama turun di Hotel Mulia."],
  ["Drop 2", "#drop 2\nCustomer kedua turun di Bandara Soetta Terminal 3."],
  ["Drop tambahan", "#drop\nDrop tambahan di PIK. Parkir 20000."],
  ["Finish", "#finish\nSelesai semua. Odo 12430. Parkir 25000."],
  [
    "Foto/PDF/Dokumen",
    "Foto, PDF, nota, atau dokumen wajib diberi caption yang diawali #start, #drop, atau #finish.",
  ],
];

const botWakeKeywords = [
  ["#order", "Admin membuat order baru dari grup Internal Arasya."],
  ["#start", "Driver mulai jalan / sampai pickup / mulai pekerjaan. Bisa teks, foto, atau dokumen dengan caption."],
  ["#drop", "Driver laporan drop-off/customer turun. Tidak menutup order. Untuk multi-drop/multi-day, tetap pakai #drop lalu tulis nomor drop di isi pesan: #drop 1, #drop 2, dst."],
  ["#finish", "Driver menyelesaikan pekerjaan dan menutup order/trip."],
];

function Card({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center gap-2">
        <div className="rounded-lg bg-gray-900 p-2 text-white">
          <Icon className="h-4 w-4" />
        </div>
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </section>
  );
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="whitespace-pre-wrap rounded-lg bg-gray-950 p-4 text-sm leading-relaxed text-gray-50">
      {children}
    </pre>
  );
}

export default function GuidePage() {
  return (
    <DashboardShell title="Guide">
      <div className="mx-auto max-w-6xl space-y-5">
        <div className="rounded-2xl bg-gray-900 p-6 text-white">
          <p className="text-sm text-gray-300">Panduan singkat admin Arasya</p>
          <h1 className="mt-1 text-2xl font-semibold">
            Cara pakai Website + WhatsApp Bot
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-300">
            Panduan ini dibuat untuk admin operasional: ikuti alurnya, pakai
            contoh template, lalu cek hasilnya di dashboard.
          </p>
        </div>

        <Card title="Alur kerja harian" icon={CheckCircle2}>
          <ol className="grid gap-2 text-sm text-gray-700 md:grid-cols-2">
            {steps.map((step, i) => (
              <li key={step} className="flex gap-2">
                <span className="font-semibold text-gray-900">{i + 1}.</span>
                {step}
              </li>
            ))}
          </ol>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Website: menu dan komponen" icon={MousePointerClick}>
            <div className="space-y-3 text-sm text-gray-700">
              <p>
                <b>Orders</b> adalah pusat operasional. Klik order untuk detail,
                edit order, dan generate invoice.
              </p>
              <p>
                <b>Schedule</b> mengatur assign driver/mobil <b>per hari</b> dan
                cek ketersediaan driver. <b>Customers</b> menyimpan data
                customer otomatis, <b>External</b> menyimpan vendor/driver luar.
              </p>
              <p>
                <b>Form</b> dipakai untuk input/edit data. Jika field wajib
                kosong, sistem menampilkan error.
              </p>
              <p>
                <b>Service Detail Rows</b> adalah baris layanan/rute. Setiap
                baris menjadi line item invoice dan dihitung ke total.
              </p>
              <p>
                <b>Table</b> adalah daftar data. Gunakan search, tombol action,
                atau klik row/chevron untuk membuka detail.
              </p>
              <p>
                <b>Badge warna</b> menunjukkan status seperti AVAILABLE,
                ASSIGNED, ISSUED, PAID, SENT, atau FAILED.
              </p>
            </div>
          </Card>

          <Card title="Contoh kasus website" icon={Table2}>
            <div className="space-y-2 text-sm text-gray-700">
              {websiteCases.map(([title, desc]) => (
                <div key={title} className="rounded-lg border p-3">
                  <b>{title}</b>
                  <p className="mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title="Schedule: jadwal & ketersediaan driver" icon={CalendarDays}>
          <div className="space-y-3 text-sm text-gray-700">
            <p>
              Menu <b>Schedule</b> mengatur penugasan <b>per hari</b>, bukan per
              order. Inilah cara order yang berlangsung beberapa hari bisa
              memakai driver berbeda di tiap harinya.
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {scheduleCases.map(([title, desc]) => (
                <div key={title} className="rounded-lg border p-3">
                  <b>{title}</b>
                  <p className="mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <div className="grid gap-5 lg:grid-cols-2">
          <Card title="Customers: data customer" icon={UserRound}>
            <div className="space-y-2 text-sm text-gray-700">
              {customerCases.map(([title, desc]) => (
                <div key={title} className="rounded-lg border p-3">
                  <b>{title}</b>
                  <p className="mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card title="External: vendor & driver luar" icon={Handshake}>
            <div className="space-y-2 text-sm text-gray-700">
              {externalCases.map(([title, desc]) => (
                <div key={title} className="rounded-lg border p-3">
                  <b>{title}</b>
                  <p className="mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card title="Invoice dan kirim WhatsApp" icon={FileText}>
          <div className="grid gap-4 text-sm text-gray-700 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <b>Generate</b>
              <p className="mt-1">
                Buat invoice setelah total order benar. PDF akan tersedia untuk
                preview dan kirim.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <b>Send PDF</b>
              <p className="mt-1">
                Di menu Invoices, expand row, pilih customer/PIC, isi catatan
                opsional, lalu kirim PDF via WhatsApp.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <b>History</b>
              <p className="mt-1">
                Setiap pengiriman tersimpan: penerima, nomor, status
                SENT/FAILED, error, dan View PDF.
              </p>
            </div>
          </div>
        </Card>

        <Card title="Jenis layanan / referensi harga Arasya" icon={Car}>
          <div className="space-y-4 text-sm text-gray-700">
            <p>
              Pilihan <b>Layanan</b> mengikuti paket operasional Arasya saat
              ini: <b>ALL INCLUDED</b>, <b>12 JAM</b>, dan <b>FULL DAY</b>.
              Gunakan referensi harga di bawah untuk menentukan nominal per
              service row.
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              {layananCities.map((city) => (
                <div
                  key={city.city}
                  className="rounded-xl border bg-gray-50 p-4"
                >
                  <h3 className="text-base font-semibold text-gray-900">
                    {city.city}
                  </h3>
                  <p className="mt-1 text-xs font-medium text-gray-600">
                    {city.area}
                  </p>
                  <div className="mt-3 rounded-lg bg-white p-3 text-xs leading-5 text-gray-700">
                    <p>
                      <b>PAKET ALL-INCLUDED kecuali parkir</b>
                    </p>
                    <p>• {city.included}</p>
                    <p>• {city.excluded}</p>
                  </div>

                  <div className="mt-3 overflow-hidden rounded-lg border bg-white">
                    <div className="bg-gray-100 px-3 py-2 text-xs font-semibold uppercase text-gray-600">
                      Paket 12 Jam
                    </div>
                    {city.twelveHour.map(([car, price]) => (
                      <div
                        key={`${city.city}-12-${car}`}
                        className="flex justify-between border-t px-3 py-2 text-xs"
                      >
                        <span>{car}</span>
                        <b>{price}</b>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 overflow-hidden rounded-lg border bg-white">
                    <div className="bg-gray-100 px-3 py-2 text-xs font-semibold uppercase text-gray-600">
                      Paket 06.00-23.00 Full Day
                    </div>
                    {city.fullDay.map(([car, price]) => (
                      <div
                        key={`${city.city}-full-${car}`}
                        className="flex justify-between border-t px-3 py-2 text-xs"
                      >
                        <span>{car}</span>
                        <b>{price}</b>
                      </div>
                    ))}
                  </div>

                  <div className="mt-3 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                    <p>
                      <b>Overtime:</b> {city.overtime}
                    </p>
                    <p className="mt-2">
                      <b>Tambahan area:</b>
                    </p>
                    <ul className="list-disc pl-4">
                      {city.extra.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card title="WhatsApp Bot: aturan trigger" icon={Bot}>
          <div className="space-y-4 text-sm text-gray-700">
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <b>Wajib pakai keyword di awal pesan.</b>
              <p className="mt-1">
                Bot akan mengabaikan semua chat biasa. Untuk text, foto, PDF,
                dan dokumen, caption/pesan harus diawali keyword. Huruf besar
                kecil bebas: <b>#START</b>, <b>#Start</b>, dan <b>#start</b>
                dianggap sama.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              {botWakeKeywords.map(([keyword, desc]) => (
                <div key={keyword} className="rounded-lg border p-4">
                  <div className="font-mono text-base font-semibold text-gray-900">
                    {keyword}
                  </div>
                  <p className="mt-2 text-xs leading-5 text-gray-600">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <CodeBlock>{`#order
PIC:
Nama: Budi
HP: 081234567890

DETAIL:
1. 30 Mei 2026 | 09:00
Pickup: Bandara Soetta
Dropoff: Hotel Mulia
Mobil: ARA
Driver: Sutan
Harga: 750000`}</CodeBlock>
              <CodeBlock>{`#start
Sudah sampai lokasi pickup

#drop
Customer sudah turun di tujuan

#drop 1
Customer pertama turun di Hotel Mulia

#drop 2
Customer kedua turun di Bandara Soetta T3

#finish
Selesai semua, unit kembali standby`}</CodeBlock>
            </div>
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-900">
              <b>Multi-drop / multi-day:</b> jangan buat keyword baru seperti <b>#drop1</b> atau <b>#drop2</b>. Tetap pakai <b>#drop</b>, lalu tulis nomor drop setelah keyword atau di isi pesan. Contoh: <b>#drop 1</b>, <b>#drop 2</b>, <b>#drop ke-3</b>. Semua drop hanya menyimpan laporan; order baru ditutup dengan <b>#finish</b>.
            </div>
            <p className="text-xs text-gray-500">
              Foto/dokumen tanpa caption keyword tidak diproses. Contoh benar:
              kirim foto dengan caption <b>#start</b>, <b>#drop</b>, <b>#drop 1</b>, atau <b>#finish</b>.
            </p>
          </div>
        </Card>

        <Card title="WhatsApp Bot: aturan order" icon={MessageCircle}>
          <div className="grid gap-4 text-sm text-gray-700 lg:grid-cols-3">
            <div className="rounded-lg border p-4">
              <Users className="mb-2 h-5 w-5 text-gray-900" />
              <b>Driver internal</b>
              <p className="mt-1">
                Pakai nama pendek atau tag. Bot match ke database untuk
                mengambil nama lengkap, phone, type, dan base.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <Car className="mb-2 h-5 w-5 text-gray-900" />
              <b>Driver external</b>
              <p className="mt-1">
                Wajib tulis nama, nomor WA, dan asal/base. Jangan pakai tag
                untuk external.
              </p>
            </div>
            <div className="rounded-lg border p-4">
              <AlertCircle className="mb-2 h-5 w-5 text-gray-900" />
              <b>TBA/TBC</b>
              <p className="mt-1">
                Boleh untuk lokasi/jam yang belum pasti. Hari pertama sebaiknya
                lengkap.
              </p>
            </div>
          </div>
        </Card>

        <Card
          title="Contoh chat order WhatsApp untuk berbagai kasus"
          icon={MessageCircle}
        >
          <div className="grid gap-4 lg:grid-cols-2">
            {botTemplates.map((tpl) => (
              <div key={tpl.title} className="space-y-2 rounded-xl border p-4">
                <div>
                  <b className="text-sm text-gray-900">{tpl.title}</b>
                  <p className="text-xs text-gray-500">{tpl.note}</p>
                </div>
                <CodeBlock>{tpl.text}</CodeBlock>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Contoh laporan driver ke bot" icon={Send}>
          <div className="grid gap-3 text-sm text-gray-700 md:grid-cols-2">
            {driverReportExamples.map(([title, text]) => (
              <div key={title} className="space-y-2 rounded-lg border p-3">
                <b>{title}</b>
                <CodeBlock>{text}</CodeBlock>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Keyword yang dipahami bot" icon={ClipboardList}>
          <div className="overflow-hidden rounded-lg border">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="p-3">Keyword</th>
                  <th className="p-3">Artinya</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {keywords.map(([k, v]) => (
                  <tr key={k}>
                    <td className="p-3 font-medium text-gray-900">{k}</td>
                    <td className="p-3 text-gray-700">{v}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="Contoh tampilan komponen" icon={Table2}>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="mb-2 text-sm font-semibold">
                Contoh table invoice
              </div>
              <div className="rounded-md bg-white p-3 text-sm shadow-sm">
                <div className="grid grid-cols-4 gap-2 border-b pb-2 text-xs font-medium text-gray-500">
                  <span>Invoice</span>
                  <span>Customer</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                <div className="grid grid-cols-4 gap-2 py-2">
                  <span>INV-001</span>
                  <span>Budi</span>
                  <span className="text-emerald-600">ISSUED</span>
                  <span>PDF / Send</span>
                </div>
              </div>
            </div>
            <div className="rounded-lg border bg-gray-50 p-4">
              <div className="mb-2 text-sm font-semibold">
                Contoh service row
              </div>
              <div className="space-y-2 rounded-md bg-white p-3 text-sm shadow-sm">
                <div>
                  <b>Pickup:</b> Bandara Soetta T3
                </div>
                <div>
                  <b>Dropoff:</b> Hotel Mulia
                </div>
                <div>
                  <b>Mobil:</b> ARA | <b>Harga:</b> Rp750.000
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card title="Kesalahan yang sering terjadi" icon={HelpCircle}>
          <ul className="space-y-2 text-sm text-gray-700">
            {mistakes.map((m) => (
              <li key={m} className="flex gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                {m}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </DashboardShell>
  );
}
