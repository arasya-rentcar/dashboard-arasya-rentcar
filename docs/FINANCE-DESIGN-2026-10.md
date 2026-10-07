# Design: finance package after 7 Oct (B1.2 per-day penalty, 4.4 per-day "Batalkan Pesanan", 4.2 saldo lebih, 4.3 actual money, B4 refunds)

Sources read: API `origin/main` at `20e4a85` (fetched; the local checkout on `claude/price-list` with someone else's uncommitted changes was not touched). Dashboard `main` at `546bd36`. Docs read: both `CLAUDE.md` files, `docs/HANDOFF.md` ("Review keuangan ulang 6 Okt", "Status 7 Okt" §4) and `docs/BACKLOG.md` §6. For the policy text I also grepped the local `arasya-web` checkout, which is on branch `claude/price-list`, not `main`.

Nothing was modified.

---

## 0. Summary and extra findings

`20e4a85` already shipped B1.1, B1.3, B2 (the DP rule uses money actually received), B7 and the B12 rounding. Still open, and confirmed in the code:

- **B9 is wider than the handoff says.** These paths take locks in different orders:
  - `cancelOrder` locks order → invoices → days. The order lock is at `orders.service.ts:1895`, the invoice `updateMany` at 1921 and the day `updateMany` at 1967–1988.
  - `markInvoicePaid` locks invoice → order (`invoices.service.ts:693–713`).
  - Edit Hari, Edit Order and the driver app lock day → order:
    - `schedule.service.ts:461` then 465;
    - `orders.service.ts:1021–1022`;
    - `applyOnce` in `driver-app.service.ts`.
  - So `cancelOrder` can deadlock against Edit Hari and the driver app, not only against `markInvoicePaid`.
  - `finalizeOrder` takes only the order lock (`orders.service.ts:1590`). It is not part of the problem.
- **The ACTIVE bucket hides refunded orders.** `searchOrders` (`orders.service.ts:396–400`) filters ACTIVE with `is_refunded: false`. Once partial refunds exist, an active order with any refund would disappear from the list.
- **Dead code that can mark an invoice paid without money.** `updateInvoiceStatus` (`invoices.service.ts:598–614`) has no route. It sets PAID and fires GA4. Delete it.
- **GA4 fires for a cancellation-fee invoice.** `reportLeadPurchase` (`ga4.service.ts:28–31`) counts any PAID invoice, including CANCELLATION_FEE. This is the rest of B12.
- **The dashboard recomputes money itself.**
  - `InvoiceSection.tsx:202–208` uses invoice amounts.
  - `orders/[id]/page.tsx:282–286` computes the refund client-side.
  - `GenerateInvoiceForm.tsx:84–85` computes the DP from `final_price`.
  - This is the root of B6 and BACKLOG 1.5. The design moves one `money` object into the API.

The core of the design is one server-side money model (§2) that every path, report and screen uses.

---

## 1. Current code paths (origin/main)

### 1.1 Cancelling a day (Edit Hari, `assignScheduleLine`, `schedule.service.ts:195–542`)

- `becomesCancelled` (315–316): no penalty is computed. A day that has not started gets `driver_fee = 0` (329–338).
- B1.1 last-open-day refusal: 322–325, re-checked under the lock at 489.
- Transaction order:
  1. day `update` (461);
  2. order lock (465);
  3. `recomputeLineMoney`;
  4. `rollupOrderFinance` (472);
  5. B1.3 check (494–507).
- The B1.3 check compares the new total with `billedSoFar`, which sums invoice amounts (`invoices.service.ts:271–291`). So cancelling a day on an order paid in full is refused (HANDOFF 7 Okt 2.2).
- A DONE day can be set to CANCELLED: `isOpenDay(DONE)` is false, so no guard applies.
- `rollupOrderFinance` (559–672):
  - `final_price = Σ` prices of days not cancelled `+ charges` (637–639).
  - It is frozen on orders that have `cancellation_fee` or an active CANCELLATION_FEE invoice.
  - Margin: a cancelled day subtracts its costs (610–611). The order-level fee is added at 627–629.
- `order-derive.service.ts:72`: when every day is cancelled, the order becomes CANCELLED.

### 1.2 Edit Order (`updateOrder`, `orders.service.ts:897–1226`)

- Days can only be deleted when they are `DELETABLE_DAY` (825–839): SCHEDULED, nothing on them. There is no cancellation status here.
- The last open day cannot be removed (1150–1165).
- The total must not drop below active invoice amounts (1179–1190), again an invoice-amount rule.

### 1.3 Batalkan Pesanan (`cancelOrder` 1800–2089, `computeCancellationPenalty` 1706–1763)

- **Tier rule.**
  - The tier comes from the *first* service date of the open days and the whole `final_price`, charges included (1840–1856).
  - The 10:00 test is `jakartaHour < 10 || (jakartaHour === 10 && jakartaMin === 0)` (1740–1741), so 10:00:00–10:00:59 still count as before 10:00 (B12).
  - `anyLineStarted` only looks at `trip_started_at` (1850). The started-day split looks at `actual_start_at || trip_started_at` (1951).
- **Inside the transaction:**
  1. Lock the order (1895).
  2. Void *every* active invoice, PAID ones included (1909–1925).
  3. `owed = penalty − netPaid` (1861, 1935).
  4. Cancel the days (1965–1989).
  5. Create the CANCELLATION_FEE invoice for what is owed (2002–2016).
  6. Set `final_price = penalty` and `cancellation_fee` (2045–2054).
  7. Run the rollup (2055).
- `refundDue = netPaid − penalty` (2070). It is only reported back; nothing is recorded.

### 1.4 Invoices

- **`generateInvoice` (385–586):**
  - `alreadyInvoiced = billedSoFar` is read outside any transaction (423).
  - The cap check is at 474–479.
  - The DP check `assertDpAmount` (368–383) is called at 470.
  - The create transaction (557–583) takes no lock and has no `client_ref` (B8).
- **`reviseInvoice` (991–1154):**
  - `billedSoFar` is read outside any lock (1032).
  - DP minimum check at 1042–1043.
  - The transaction locks only the invoice (1095).
- **`markInvoicePaid` (634–802):**
  - `amount_received` is any positive number and defaults to the invoice amount (671–672; validation at `invoices.validation.ts:25`).
  - Lock order is invoice → order (693–713).
  - `paid_to_date = paymentsOnOrder + received`. `paymentsOnOrder` (95–124) takes the first receipt per invoice.
  - `payment_status = paymentStatusFor(netPaid, final_price, dpBaseOf)` (753–757).
  - `becameReady` uses gross `paid_to_date` (763–765).
  - After commit: receipt PDF (788), GA4 (794), "lunas" push (799).
- **Why underpayment locks forever (B3).** The invoice is PAID for its full amount, so `billedSoFar` counts the full amount and the shortfall can never be billed. `startPayment` (`assignment-guard.ts:94–101`, `paid_to_date ≥ rentalBase`) then never becomes ready. "Mulai perjalanan" (`driver-app.service.ts:233–236`) stays locked.
- **Why overpayment is never credited.** The surplus raises `paid_to_date`, but the next invoice is still capped by `final_price − Σ invoice amounts`, so the surplus is never deducted from it.
- **PDFs:**
  - Receipt (`attachReceiptPdf` 809–893): `previouslyPaid` = active invoice amounts (843–851); `refundDue = received − total` with refunds ignored (883).
  - Statement (899–989): refunds are not listed.
  - Policy text: `pdf.service.ts:86–89`.

### 1.5 Payment status and guards (`assignment-guard.ts`)

- `netPaid` = `paid_to_date − (is_refunded ? refund_amount : 0)` (157–164). Only one refund is possible.
- `paymentStatusFor` (174–184), `dpBaseOf` (142–149), `minDpFor` (152–154).
- `startPayment` uses gross `paid_to_date` (B4). It is used by:
  - `driver-app.service.ts:107` and `:235`;
  - `schedule.service.ts:78`;
  - `driverNotify.ts:114`;
  - `orders.service.ts:764`.

### 1.6 Refunds (`markOrderRefunded`, `orders.service.ts:1635–1667`)

- Amount = input or `computeRefundDue` (1622–1629, `paid_to_date − final_price`). Earlier refunds are ignored.
- It overwrites `refund_amount` (1657–1666) with no transaction, no lock, no upper bound and no `client_ref`.
- It does not recompute `payment_status`.
- Dashboard: the button and badge only show while `refundDue > 0 && !isRefunded` (`orders/[id]/page.tsx:711, 748`), so a second refund is hidden.

### 1.7 Analytics (`analytics.service.ts`)

- Rule header: 869–922.
- `orderLevelSlice` (975–1031): `cancellation_income = fee − kept day prices − charges`, by `cancelled_at`.
- `cashSlice` (1095–1109): receipts − PAID payables. No refunds.
- `outstandingSnapshot` (1162–1262): `final_price − paid_to_date` (1193). Refunds are ignored.
- The old `dashboardAnalytics` receivables (183–201) use PAID invoice amounts. It is still exposed as `analyticsApi.dashboard`.

### 1.8 GA4 (`ga4.service.ts:11–73`)

- `paid = any PAID invoice || DP_PAID/PAID` (28–31).
- Value = `final_price`. The send is claimed once per lead.

---

## 2. The money model (one definition, used everywhere)

New module `src/modules/orders/order-money.ts` with `computeOrderMoney(tx, orderId)`. It is called under the order lock in every money transaction and also feeds `GET /orders/:id`.

Definitions:

| Symbol | Meaning | Stored or derived |
|---|---|---|
| **dayBillable(l)** | not cancelled → `total_price`; cancelled → `cancel_fee ?? 0` | derived |
| **charges** | Σ billable `order_adjustments` (`amount × quantity`) | derived |
| **T** (total, `final_price`) | Σ dayBillable + charges. Legacy order-level cancellations (`cancellation_rule='ORDER_V1'`) keep their frozen `final_price`. | `orders.final_price` (rollup) |
| **base** (DP and "lunas" base) | Σ dayBillable = T − charges. Legacy: `cancellation_fee` | derived |
| **minDp** | `pctRupiah(base, 20)` | derived |
| **received** | Σ receipts.amount | `orders.paid_to_date` (as today) |
| **refunded** | Σ order_refunds.amount | `orders.refunded_total` (new) |
| **Net** | received − refunded | derived |
| **C** (saldo lebih) | Σ order_credit_entries.amount | `orders.credit_balance` (new) |
| **Covered** | Net − C (part of T settled with money) | derived |
| **OpenBilled** | Σ `amount` (cash asked) of active unpaid invoices (DRAFT/ISSUED) | derived |
| **Billable** | T − Covered − OpenBilled (the most a new invoice may cover, before credit) | derived |
| **Outstanding** (piutang) | max(0, T − Net) | derived |
| **payment_status** | PAID if T > 0 and Net ≥ T; DP_PAID if Net > 0 and Net ≥ minDp; else UNPAID. The legacy-import rule (`orderPaymentStatus` 212–219) is kept. | stored |
| **start_ready** | Net ≥ base (Q10) | derived |
| **refundable** | C | derived |

Invoice fields:

- `gross` = the part of T this invoice covers.
- `credit_applied` = how much saldo lebih was used for it.
- `amount` = the cash asked (`gross − credit_applied`; this is the existing column's meaning).
- `amount_received` = the money actually taken on mark-paid.
- `shortfall` = `amount − amount_received` when positive.

How each event moves the numbers (this is why it works):

- **Create an invoice** of gross *g ≤ Billable*. `applied = apply_credit ? min(C, g) : 0` → C −= applied (Covered += applied), OpenBilled += g − applied. Billable falls by exactly g.
- **Pay** with received *r* on an invoice of amount *a*. Net += r and OpenBilled −= a.
  - If r > a: an OVERPAYMENT entry r − a goes to the credit, so Covered += a.
  - If r < a: Covered += r, so the shortfall a − r becomes Billable again. This fixes B3.
- **T drops** (a day cancelled, a price lowered) and Covered > T: a RELEASE entry of Covered − T goes to the credit. This covers 4.2 for cancellations.
- **Refund** *x ≤ C*: Net −= x and C −= x. Covered does not change; Outstanding rises only if Net < T.
- **An unpaid invoice is revised or voided**: an UNAPPLIED entry gives its `credit_applied` back.

Rounding helper `pctRupiah(price, pct)`:

- Compute in integer sen and round half-up to whole rupiah: `Math.floor((sen(price) × pct + 5000) / 10000)`.
- Use it for every fee and for minDp. Never round a float × 0.2.

---

## 3. Item designs and exact money rules

### 3.1 Item 1 (4.1, B1.2): per-day penalty

New pure function in `src/modules/orders/cancellation-policy.ts`:

```ts
dayCancellation({ price, dayDate, started, decidedAt }) → { tier: 1|2|3, pct: 20|50|100, fee, label }
```

- **The day's date.** WIB calendar day of `service_date`. Fallbacks: `start_at`, then `order.service_start_at`. With no date at all: tier 1.
- **The tiers:**
  - Decision day before the day's date → **tier 1, 20%**.
  - Same WIB day, **not started**, and time-of-day `< 10:00:00.000` WIB → **tier 2, 50%**. Computed as `((decidedAt + 7h) mod 86 400 000) < 36 000 000`.
  - Otherwise → **tier 3, 100%** (same day from 10:00:00 on, already started, or after the day).
- **Started** = `actual_start_at` or `trip_started_at` is set, or `line_status ∈ {IN_PROGRESS, DONE}`. This matches the website's "driver belum berangkat menjemput" (Q2).
- **Fee** = `pctRupiah(total_price of that day, pct)`.
- **`decidedAt`** = server time captured once at the start of the request. It is stored on the day as `cancelled_at`. An optional backdated `requested_at` waits on owner question Q3.

`computeCancellationPenalty` is removed. It is replaced by this function plus a sum.

**Worked numbers.** A 3-day order, 10/11/12 Okt, 1.250.000 per day, T = 3.750.000.

| Cancel | When | Tier | Fee |
|---|---|---|---|
| Day 12 Okt | 9 Okt 15:00 | 1 | 250.000 |
| Day 10 Okt, not started | 10 Okt 09:59:59.999 | 2 | 625.000 |
| Day 10 Okt | 10 Okt 10:00:00.000 | 3 (old code: 2) | 1.250.000 |
| Day 10 Okt | 10 Okt 10:00:59 | 3 (old code: 2, B12) | 1.250.000 |
| Day 10 Okt, driver left 07:30 | 10 Okt 08:00 | 3 | 1.250.000 |

- After cancelling 12 Okt on 9 Okt: T = 1.250.000 + 1.250.000 + 250.000 = 2.750.000.
- Rounding, price 1.234.567:
  - 20% = 246.913 (246.913,4);
  - 50% = 617.284 (617.283,5, rounded half-up);
  - 100% = 1.234.567.
- Two such days cancelled at 50% each: 2 × 617.284 = 1.234.568. Fees are rounded **per day, then summed**.

**DP and status after a day is cancelled.** Example: 3 × 1.000.000, DP of 600.000 received.

- Cancel day 3 at H-2 (fee 200.000): base = 2.000.000 + 200.000 = 2.200.000, minDp = 440.000. Net 600.000 → still **DP Terbayar**.
- Cancel day 2 too: base = 1.400.000, minDp = 280.000. Outstanding = 1.400.000 − 600.000 = 800.000.

**Edit Hari behaviour.**

- A cancel may carry `expected_cancel_fee`. If the server's fee differs (for example the save crossed 10:00), the API answers 409 `CANCEL_FEE_CHANGED` with the new quote and changes nothing.
- B1.1 stays: the last open day still goes through Batalkan Pesanan (Q16).
- The B1.3 check becomes the INV-6 rule from §6: refuse when `OpenBilled > T_new − Covered`.
  - Cancelling a day on an order paid in full is now **accepted** and releases saldo lebih.
  - If an unpaid issued invoice is larger than what is still owed, the cancel is refused with the amounts ("Revisi invoice … menjadi Rp …").
- A DONE day cannot be cancelled (Q7).
- Reopening a cancelled day clears its `cancel_*` fields, so T rises again. The credit stays and is used on the next bill (Q8).
- A per-day cancellation does not create its own invoice. The fee becomes part of T and is billed with the next invoice or taken from credit (Q17).

**Edit Order.** Deleting a day stays free only while the order has no money and no active invoice: Net = 0, OpenBilled = 0 and no PAID invoice. Otherwise the API answers 409: "Batalkan hari itu lewat Edit Hari supaya biaya pembatalan dihitung" (Q6). Lowering a day's price on a paid order releases credit through the same path.

### 3.2 Item 2 (4.4): Batalkan Pesanan computed per day

- Every open day (SCHEDULED, ASSIGNED, IN_PROGRESS) gets `dayCancellation` with its own date. All use one `decidedAt`.
- Days already cancelled keep their fee. DONE days keep their price.
- **New total:** T_new = Σ DONE prices + Σ fees of all cancelled days + charges. Charges stay billed in full and are not part of the fee base (Q4).
- `orders.cancellation_fee` = Σ day fees (it is still the "this order was cancelled" marker). `orders.cancellation_rule = 'DAY_V2'`. `final_price` is no longer frozen; the rollup computes it.
- **Invoices:** void only *unpaid* invoices. PAID invoices stay PAID; this is a change, since the old code voided them. Voiding gives their `credit_applied` back.
- **The fee invoice:** gross = T_new − Covered − OpenBilled (OpenBilled is now 0).
  - If gross > 0: one CANCELLATION_FEE invoice. Credit is applied by default.
  - If gross ≤ 0: no invoice, and a RELEASE entry turns the excess into credit.

This is never more than the old whole-order tier: each day's rate is at most the first day's rate, so the per-day result always takes over.

**Comparison** on the 3 × 1.250.000 order:

| Cancelled at | Old rule (whole order) | New rule (per day) |
|---|---|---|
| 9 Okt | 750.000 | 250.000 × 3 = 750.000 |
| 10 Okt 09:00, not started | 1.875.000 | 625.000 + 250.000 + 250.000 = 1.125.000 |
| 10 Okt 11:00 | 3.750.000 | 1.250.000 + 250.000 + 250.000 = 1.750.000 |

**Day 1 already done (like e2e O13).** 2 × 500.000, paid 1.000.000, day 1 DONE, cancelled on day 1's date:

- Day 2 is tomorrow, tier 1 → fee 100.000.
- T_new = 600.000. RELEASE 400.000 → **saldo lebih 400.000**.
- The old rule kept 1.000.000.

**With credit and an unpaid invoice.** T = 3.000.000, DP 600.000 paid with 700.000 (C = 100.000), settlement issued with gross 2.400.000, credit_applied 100.000, amount 2.300.000:

1. Batalkan Pesanan at 09:00 on day 1: fees 500.000 + 200.000 + 200.000 → T_new = 900.000.
2. Void the settlement → UNAPPLIED +100.000 → C = 100.000. Covered = 700.000 − 100.000 = 600.000.
3. Gross = 300.000; credit applied 100.000 → **fee invoice 200.000**. This equals T_new − Net, the same answer as the old "fee − paid".

### 3.3 Item 3 (4.2): saldo lebih on the order

- **Where credit comes from:**
  - OVERPAYMENT (received > invoice amount);
  - RELEASE (T drops below Covered);
  - UNAPPLIED (an invoice that used credit is revised or voided);
  - OPENING (backfill).
- **Where it goes:** APPLIED (on any invoice create or revise, by default) or REFUND.
- **Default:** credit reduces the next bill. Create and revise take `apply_credit` (default `true`). The admin can untick it to keep the credit for a refund.
- **Invoice fully paid from credit** (cash amount 0): create it as PAID at once, with `amount_received = 0` and a kwitansi that says "Dibayar dari saldo lebih". No GA4. Needs owner confirmation (Q12).

**Example.** FULL 3.750.000 paid, then day 12 Okt cancelled on 9 Okt:

1. T = 2.750.000 → RELEASE 1.000.000 → C = 1.000.000. Status Terbayar, piutang 0.
2. Overtime 300.000 → T = 3.050.000. ADDITIONAL invoice: gross 300.000, credit_applied 300.000, amount 0 → PAID from credit. C = 700.000.
3. The admin refunds 700.000 → Net = 3.050.000 = T, C = 0.
4. Cash for October: collected 3.750.000, refunded 700.000, net 3.050.000.

The credit belongs to one order only (Q18).

### 3.4 Item 4 (4.3, B2 + B3): "Tandai terbayar" records the money received

- `amount_received` defaults to the invoice amount.
- If it differs from the invoice amount, the request must carry `amount_mismatch_ack=true`, or the API answers 409 with both numbers and the effect. This also guards against the `RupiahInput` "750.000,00" paste bug.
- The invoice becomes PAID with its `amount_received` stored. Underpaid invoices stay PAID and show a "Kurang bayar Rp X" badge (Q13).

**Underpayment.** T = 3.750.000, minDp 750.000:

1. DP invoice 750.000 is marked paid with 700.000 → Net 700.000 < 750.000 → **UNPAID**.
2. Driver assignment is refused with "kurang Rp 50.000" (the B2 rule).
3. Billable = 3.750.000 − 700.000 = 3.050.000.
4. The admin issues a new **ADJUSTMENT** invoice ("Invoice Penyesuaian — kekurangan pembayaran INV-…", `adjusts_invoice_id`) for 50.000. It is allowed below the DP minimum because it is not a DP.
5. Once paid → DP Terbayar.

**Start lock.** A one-day order of 1.000.000, FULL invoice paid with 950.000:

- `board` answers 409. The ADJUSTMENT invoice for 50.000 is accepted.
- When it is paid, `becameReady` → one "lunas" push, and "Mulai perjalanan" opens. Today the remaining 50.000 can never be billed, so the trip stays locked forever.

**Overpayment.** DP 750.000 paid with 800.000 (acknowledged):

1. OVERPAYMENT 50.000 → C = 50.000. Status DP Terbayar.
2. The settlement suggestion is gross 3.000.000 with 50.000 credit → **cash 2.950.000**.

DP status always uses Net and base, so "DP Terbayar" and "Terbayar" stay one rule.

### 3.5 Item 5 (B4): refunds

- **New table:** `order_refunds`, several rows per order.
- **Bound:** under the order lock, `amount ≤ credit_balance`, else 409 "Saldo lebih tinggal Rp …".
- **Each refund writes, in one transaction:** the refund row, a REFUND credit entry, `refunded_total`, and the old `is_refunded`/`refund_amount`/`refunded_at`/`refund_proof_url` columns (as the cumulative total and latest refund, for compatibility). `payment_status` is recomputed.
- **Prepayment credit:** refunding credit while Net < T is allowed and returns `outstanding_after`; the dashboard warns (Q15).
- **Where refunds count:**
  - Cash: `refunded` in range by `refunded_at` (WIB), and `net_cash = collected − refunded − paid_out`.
  - Piutang: max(0, T − Net).
  - "Lunas" check: `startPayment` uses Net.
- **Example:** 2 × 1.000.000 paid, day 2 cancelled at H-1 (fee 200.000) → T 1.200.000, C 800.000.
  - Refund 800.000 → Net 1.200.000, Terbayar, start ready (base 1.200.000). Cash for the month −800.000.
  - A second refund of 100.000 → 409 (C = 0).
  - Today's code would accept any amount and overwrite the first refund.

---

## 4. Data model: Prisma migrations (additive only, RLS on new tables)

**Migration `20261008090000_order_money_credit`** (PR A1):

```sql
ALTER TYPE "InvoiceType" ADD VALUE 'ADJUSTMENT';           -- not used in this migration's transaction
CREATE TYPE "CreditEntryKind" AS ENUM ('OPENING','OVERPAYMENT','RELEASE','APPLIED','UNAPPLIED','REFUND');

ALTER TABLE "orders"
  ADD COLUMN "credit_balance" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "refunded_total" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "cancellation_rule" TEXT,          -- 'ORDER_V1' legacy | 'DAY_V2'
  ADD COLUMN "cancel_client_ref" TEXT;
ALTER TABLE "orders" ADD CONSTRAINT "orders_credit_balance_nonneg" CHECK ("credit_balance" >= 0);
ALTER TABLE "orders" ADD CONSTRAINT "orders_refunded_total_nonneg" CHECK ("refunded_total" >= 0);
CREATE UNIQUE INDEX "orders_cancel_client_ref_key" ON "orders"("cancel_client_ref");

ALTER TABLE "invoices"
  ADD COLUMN "client_ref" TEXT,
  ADD COLUMN "credit_applied" DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN "amount_received" DECIMAL(12,2),
  ADD COLUMN "adjusts_invoice_id" TEXT REFERENCES "invoices"("id") ON DELETE SET NULL;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_credit_applied_nonneg" CHECK ("credit_applied" >= 0);
CREATE UNIQUE INDEX "invoices_client_ref_key" ON "invoices"("client_ref");

ALTER TABLE "order_adjustments" ADD COLUMN "client_ref" TEXT;   -- B8
CREATE UNIQUE INDEX "order_adjustments_client_ref_key" ON "order_adjustments"("client_ref");

CREATE TABLE "order_refunds" (
  "id" TEXT PRIMARY KEY, "order_id" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "amount" DECIMAL(12,2) NOT NULL CHECK ("amount" > 0), "refunded_at" TIMESTAMP(3) NOT NULL,
  "proof_url" TEXT, "note" TEXT, "client_ref" TEXT UNIQUE, "created_by" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE "order_credit_entries" (
  "id" TEXT PRIMARY KEY, "order_id" TEXT NOT NULL REFERENCES "orders"("id") ON DELETE CASCADE,
  "kind" "CreditEntryKind" NOT NULL, "amount" DECIMAL(12,2) NOT NULL CHECK ("amount" <> 0),
  "invoice_id" TEXT REFERENCES "invoices"("id") ON DELETE SET NULL,
  "refund_id" TEXT REFERENCES "order_refunds"("id") ON DELETE SET NULL,
  "service_item_id" TEXT, "note" TEXT, "actor" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX ON "order_refunds"("order_id"); CREATE INDEX ON "order_credit_entries"("order_id");
CREATE UNIQUE INDEX "credit_one_overpayment_per_invoice" ON "order_credit_entries"("invoice_id") WHERE "kind" = 'OVERPAYMENT';
CREATE UNIQUE INDEX "credit_one_entry_per_refund"        ON "order_credit_entries"("refund_id")  WHERE "kind" = 'REFUND';
ALTER TABLE "order_refunds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "order_credit_entries" ENABLE ROW LEVEL SECURITY;
-- + backfill (section 10)
```

**Migration `20261009090000_day_cancellation`** (PR A3):

```sql
ALTER TABLE "order_service_items"
  ADD COLUMN "cancel_fee" DECIMAL(12,2), ADD COLUMN "cancel_tier" INTEGER,
  ADD COLUMN "cancelled_at" TIMESTAMP(3), ADD COLUMN "cancel_reason" TEXT,
  ADD COLUMN "cancel_requested_at" TIMESTAMP(3);   -- only if Q3 = yes
ALTER TABLE "order_service_items" ADD CONSTRAINT "osi_cancel_fee_nonneg" CHECK ("cancel_fee" IS NULL OR "cancel_fee" >= 0);
```

Generate the SQL with `prisma migrate diff`, as the API `CLAUDE.md` describes. Partial indexes and CHECK constraints are added by hand, as in `20261004150000_etoll_cards`.

---

## 5. API changes per endpoint

1. **`GET /orders/:id`** adds:
   - `money`: `{ total, base, min_dp, charges, received, refunded, net_paid, credit_balance, covered, open_billed, billable_remaining, outstanding, payment_status, start_ready, rule: 'v3' }`;
   - `refunds[]`: `{ id, amount, refunded_at, note, has_proof }`;
   - `credit_entries[]`: `{ kind, amount, invoice_number?, created_at, note }`;
   - per day: `cancel_fee`, `cancel_tier`, `cancelled_at`, `cancel_reason`;
   - per invoice: `credit_applied`, `amount_received`, `shortfall`, `adjusts_invoice_id`.

   `start_payment` stays (`{ rental_total: base, paid_to_date: net_paid, ready }`) for older clients.

2. **`GET /schedule/lines/:id/cancel-quote`** (A3) returns `{ decided_at, tier, pct, price, fee, label, started, blocked: null | 'LAST_OPEN_DAY' | 'OPEN_INVOICE_EXCEEDS' | 'DONE_DAY', new_total, credit_release, open_billed, owed_after }`.

3. **`PUT /schedule/lines/:id`** (A3). When `line_status` changes to CANCELLED:
   - request adds `cancel_reason` (required, 1–500 characters), `expected_cancel_fee?` and `cancel_requested_at?` (Q3);
   - response adds `cancellation: { tier, fee, label }` and `order_money`;
   - errors: 409 `CANCEL_FEE_CHANGED` with `quote`; 409 for the last open day, an exceeding invoice, or a DONE day;
   - a resend on a day that is already cancelled is a no-op (idempotent by state).

4. **`PUT /orders/:id`**: the delete rule from §3.1; the B1.3 check becomes INV-6.

5. **`GET /orders/:id/cancel-quote`** (A3) returns `{ decided_at, days: [{ id, date, price, started, tier, pct, fee, label }], fee_total, charges, new_total, net_paid, credit_balance, voided_invoices: [{ number, amount }], fee_invoice: { gross, credit_applied, amount } | null, credit_after }`.

6. **`POST /orders/:id/cancel`** (A3)
   - Request: `{ reason, client_ref, expected_fee_total?, requested_at? }`.
   - Response keeps the old keys `tier` (highest day tier), `penalty` (= `fee_total`), `originalFinalPrice`, `paidToDate`, `refundDue` (= `credit_balance` after), `stillOwed` and `cancellationInvoiceNumber`, and adds `days[]`, `newTotal`, `netPaid`, `creditBalance` and `creditApplied`.
   - A resend with the same `client_ref` returns 200 with the stored result. A different ref on a cancelled order → 409 (as today).

7. **`POST /orders/:id/generate-invoice`** (A1/A2)
   - Request: `{ invoice_type: DP|SETTLEMENT|FULL|ADDITIONAL|COMBINED|ADJUSTMENT, amount /* gross */, payment_method, note?, issue_date?, client_ref, apply_credit = true, adjusts_invoice_id? }`.
   - Under the order lock: `gross ≤ Billable`. The DP rule checks the gross: `≥ min_dp`, `≤ base`.
   - Response: the invoice with `gross`, `credit_applied` and `amount`.
   - A replay of the same `client_ref` → 200 with the existing invoice. The check runs before the PDF; a unique-key race deletes the uploaded PDF.
   - `client_ref` is optional for one release, so the dashboard currently in production keeps working. It becomes required after D1.

8. **`POST /orders/:id/invoice/:invoiceId/revise`** adds `client_ref` and `apply_credit`. It takes the order lock first; UNAPPLIED on the old invoice, APPLIED on the new one.

9. **`POST /orders/:id/invoice/:invoiceId/mark-paid`** (multipart)
   - Adds `amount_mismatch_ack`.
   - Response: the invoice plus `payment: { received, shortfall, overpayment, credit_added }` and `order_money`.
   - GA4 is skipped for CANCELLATION_FEE and ADJUSTMENT invoices and for cancelled orders.

10. **`POST /orders/:id/refunds`** (multipart: `proof`, `amount`, `note`, `client_ref`)
    - 201 `{ refund, order_money, outstanding_after }`; a replay → 200 with the same row; amount > credit → 409.
    - `GET /orders/:id/refunds/:refundId/proof` returns a signed URL.
    - **`POST /orders/:id/mark-refunded`** stays one release as an alias: amount defaults to `credit_balance` and is bounded the same way.

11. **`POST /orders/:id/adjustments`** adds `client_ref` (B8); a replay → 200 with the same row.

12. **`GET /analytics/dashboard-v2`** adds:
    - `cash.refunded` and `net_cash = collected − refunded − paid_out`;
    - `outstanding.ar_outstanding` from Net;
    - new `outstanding.customer_credit` (Σ `credit_balance`, money held for customers);
    - `accrual.cancellation_income` including per-day fees.

    **`GET /analytics/revenue`**: `order_level.cancellation_income` includes per-day fees too.

13. **Removals:** `updateInvoiceStatus` (dead code). `billedSoFar` and `computeRefundDue` are replaced by `computeOrderMoney`.

Mobile app: no change. It reads `payment_ready` and `start_ready`, which come from `startPayment`.

---

## 6. Invariants, lock order, idempotency

**One lock order for every write transaction:**

1. **Days** of the order, only when the transaction changes days: `SELECT id FROM order_service_items WHERE order_id=$1 [AND id = ANY($2)] ORDER BY id FOR NO KEY UPDATE` (or the day `update` itself, as Edit Hari does now).
2. **Order row**: `FOR NO KEY UPDATE`.
3. **Invoices** of the order: conditional `updateMany` or `SELECT … ORDER BY id FOR UPDATE`.
4. **Payables.**
5. **Drivers and cars** (`lockUnits`, already in id order).
6. **Customer row and counters** (`nextInvoiceNumber`/`nextReceiptNumber`, `total_billed`/`total_paid`).

Inserts (receipts, refunds, credit entries, adjustments) only take FK KEY SHARE locks, which do not conflict with `FOR NO KEY UPDATE`.

Changes needed:

- `cancelOrder`: lock the days *before* the order (fixes the cycle with Edit Hari and the driver app); invoices after the order.
- `markInvoicePaid`: order lock *before* the invoice conditional update. The PDF and storage work stays outside the transaction.
- `reviseInvoice`, `generateInvoice`, refunds, `createOrderAdjustment`: take the order lock first and re-check the caps inside.
- `rollupOrderFinance` already locks the order after the days (566).
- One comment block in `order-money.ts` documents the order; every caller cites it.

**Invariants and where each is enforced:**

- **INV-1** `credit_balance ≥ 0`: DB CHECK, plus a computed check under the lock.
- **INV-2** `credit_balance = Σ entries` and **INV-3** `refunded_total = Σ refunds`: only the helpers `creditEntry(tx, …)` and `addRefund(tx, …)` write the rows and the cached totals, in the same transaction, under the order lock. An e2e reconciliation sweep checks it.
- **INV-4** `paid_to_date = Σ receipts`: as today; one receipt per invoice by the status guard.
- **INV-5** `Covered ≤ T`: `settleCredit(tx, orderId)` runs at the end of the rollup, mark-paid and cancel. If `Net − C > T` it inserts RELEASE.
- **INV-6** `Covered + OpenBilled ≤ T`: invoice create and revise check it under the lock. Edit Hari, Edit Order and price edits refuse when a lower T would break it. Batalkan Pesanan voids unpaid invoices instead.
- **INV-7** `refund ≤ C`: under the lock.
- **INV-8** at most one OVERPAYMENT per invoice and one REFUND entry per refund: partial unique indexes.
- **INV-9** `payment_status = f(Net, T, base)`: recomputed in every transaction that changes Net, T or base. Refunds now included.
- **INV-10** a day is cancelled once: `updateMany WHERE id=$1 AND line_status <> 'CANCELLED'` writes the fee in the same statement.
- **INV-11** one Batalkan Pesanan: `cancellation_fee IS NULL` checked under the lock, plus `cancel_client_ref`.

**Idempotency via `client_ref`:** invoice create and revise, adjustments, refunds, cancel order. Edit Hari cancel is idempotent by state, and mark-paid by the status guard. A replay returns the first result and never reserves a second number.

---

## 7. Formulas: one rule for Dashboard, Pendapatan and the order card

This is rule set v3 and `MARGIN_FORMULA_VERSION` `v6-…`. Change the header at `analytics.service.ts:869–922`, `rollupOrderFinance` and `margin.ts` together.

**Accrual**

- `day_revenue`: unchanged (days not cancelled, by `service_date`).
- `cancellation_income` = Σ `cancel_fee` of cancelled days by the day's `cancelled_at` (WIB) (Q5), **plus** the legacy part `fee − kept − charged` for `ORDER_V1` orders only.
- `extra_charges`: unchanged. On DAY_V2 cancellations charges are no longer subtracted (Q4).
- Costs: unchanged.

**Order card (`rollupOrderFinance`)**

- `final_price` = Σ dayBillable + charges. The freeze applies to `ORDER_V1` only.
- Margin: a cancelled day adds `cancel_fee − its costs`. The legacy branch is unchanged.
- The rollup also calls `settleCredit` and recomputes the status.

**Cash:** `collected` (receipts) − `refunded` (refunds by `refunded_at`) − `paid_out`. Using credit on an invoice is not cash.

**Piutang:** Σ max(0, T − (paid_to_date − refunded_total)) over orders not PAID. `customer_credit` = Σ `credit_balance`.

- The old `dashboardAnalytics` receivables (183–201) should use `computeOrderMoney` too, or be marked deprecated.
- `searchOrders`: ACTIVE drops `is_refunded:false`; REFUNDED becomes `refunded_total > 0`.

No recompute is needed at deploy. No existing day has a `cancel_fee`, so v6 gives the same numbers as v5 on today's data.

---

## 8. PDFs, captions, GA4, policy text

**PDF (`invoices.service.ts` + `pdf.service.ts`)**

- A cancelled day prints "(Dibatalkan — biaya pembatalan 20%/50%/100%)" with its fee as the amount, so the lines add up to T. `rentalDocumentItems` keeps its `ORDER_V1` branch.
- The CANCELLATION_FEE invoice lists one fee line per day.
- Invoices print "Dipotong dari saldo lebih −Rp X" when `credit_applied > 0`. `previouslyPaid` becomes Covered.
- Kwitansi: actual money received, "Kekurangan Rp X (ditagih lewat invoice penyesuaian)" or "Masuk saldo lebih Rp X". `remainingBalance` = max(0, T − Net). The "KELEBIHAN BAYAR (REFUND)" row (`pdf.service.ts:550–561`) becomes "SALDO LEBIH" = C.
- Statement: refund lines ("Pengembalian dana tanggal …", negative) and the closing credit.

**GA4:** `paid` = `payment_status ∈ {DP_PAID, PAID}` and `cancelled_at IS NULL` and `order_status ≠ CANCELLED`. Never triggered from CANCELLATION_FEE or ADJUSTMENT invoices. Add an optional `GA4_COLLECT_URL` environment variable so the e2e mock can record the sends.

**Policy text: change only after the owner approves a draft.**

- API:
  - `src/services/pdf.service.ts:80–89` (payment terms and cancellation block);
  - `src/utils/waCaptions.ts:144` (also check `:168`);
  - the "Cancellation" rule in the system map of all four repos' `CLAUDE.md`.
- Dashboard:
  - `messages/id.json:772` and the matching key in `messages/en.json` (Panduan);
  - `app/dashboard/guide/page.tsx` if it repeats the text;
  - `CLAUDE.md`.
- Website (`arasya-web`):
  - the live Sanity `settings.cancellationPolicy` (`src/sanity/schemas/settings.ts:59–60, 114`);
  - `src/data/seed.json:1376–1415` (en + id);
  - `scripts/content/policy.py:4–25` (plus `apply.py`);
  - rendered by `src/components/PolicyNotice.astro`, `src/templates/TermsPage.astro`, `src/lib/faq.ts:15–19` and `src/pages/llms.txt.ts:62`.
  - Leave `scripts/migrations/2026-09-29-policy.mjs` as history.

Draft for the owner (Indonesian): "Biaya pembatalan dihitung per hari layanan dari harga hari tersebut: dibatalkan sebelum hari tersebut 20%; pada hari tersebut sebelum pukul 10.00 WIB dan driver belum berangkat menjemput 50%; setelah itu 100%. Biaya tambahan yang sudah terjadi tetap ditagih penuh. Kelebihan pembayaran menjadi saldo yang mengurangi tagihan berikutnya atau dapat dikembalikan."

---

## 9. Dashboard UI

**D1 (after API A1 + A2)**

- **`app/dashboard/orders/[id]/page.tsx`:**
  - Replace the client-side `refundDue` (282–286) and `notPaidForTrip` (1060) with `order.money`.
  - The refund badge and button show whenever `credit_balance > 0` (fixes 711 and 748).
  - New "Pengembalian dana" list and a collapsible "Riwayat saldo lebih".
- **`components/orders/InvoiceSection.tsx`:**
  - Summary (202–227): Total, Diterima, Dikembalikan, Saldo lebih, Sisa tagihan (piutang), Bisa ditagih.
  - Per invoice: "dipotong saldo lebih", "diterima", a "Kurang bayar Rp X" badge with a "Tagih kekurangan" button (opens the invoice form as ADJUSTMENT, prefilled), and "Lebih bayar → saldo lebih".
- **`components/forms/GenerateInvoiceForm.tsx`:**
  - DP suggestion = `money.min_dp`; maximum = `billable_remaining` (fixes 71–85, BACKLOG 1.5).
  - "Pakai saldo lebih (Rp X)" checkbox, on by default.
  - Preview of "yang harus ditransfer".
  - ADJUSTMENT type.
  - `client_ref` created when the dialog opens, reused on retry, renewed after success.
- **`ReviseInvoiceForm.tsx`:** DP minimum hint, the credit checkbox, `client_ref`.
- **`components/invoices/MarkPaidDialog.tsx`:** a live difference panel ("Kurang Rp X → status order: …; sisa bisa ditagih" / "Lebih Rp X → saldo lebih"), the DP minimum hint, and an acknowledgement checkbox when the amount differs (`amount_mismatch_ack`).
- **`components/orders/RefundDialog.tsx`:** default and maximum = `credit_balance`; a warning when it creates piutang; `client_ref`; earlier refunds listed.
- **`components/orders/OrderFinanceCard.tsx`:** a line "Biaya pembatalan hari".
- **`app/dashboard/page.tsx`:** the cash card shows "Masuk / Dikembalikan / Keluar" (163–165, `cashInOut` message); a "Saldo lebih pelanggan" figure; the rule comment at line 33.
- **Plumbing:** `types/index.ts`, `lib/schemas.ts`, `lib/api.ts` (refunds, quotes), `hooks/useOrders.ts`, `hooks/useInvoices.ts` (invalidate order, invoices, analytics), and `messages` in both id and en.

**D2 (after API A3)**

- **`components/schedule/ScheduleLineDialog.tsx`:** choosing CANCELLED (629) fetches the line quote and shows "Biaya pembatalan: 20% × Rp 1.000.000 = Rp 200.000 (sebelum hari H)", the new order total, saldo lebih to be released, a required reason, and the hint "hari terakhir lewat Batalkan Pesanan" (BACKLOG 1.5). It sends `expected_cancel_fee`; on 409 it re-shows the new quote.
- **Batalkan Pesanan dialog in the order page:** a per-day table (date, price, berangkat?, tier, fee), totals, invoices to void, the fee invoice or credit after. It sends `expected_fee_total` and `client_ref`. The result panel (1742–1772) uses the new fields.
- **Day list and DayDrawer:** a "Dibatalkan · biaya Rp X" badge.
- **`EditOrderForm.tsx`:** removing a day is disabled once the order has money, with a hint.
- **Revenue page:** the cancellation label. **Guide:** the new policy text.

---

## 10. Migration and backfill

**Read-only check before coding** (SQL, run on production):

- orders with `cancellation_fee IS NOT NULL`;
- orders with `is_refunded`;
- PAID invoices whose first receipt amount ≠ the invoice amount;
- orders with `paid_to_date − refund > final_price`.

Production was wiped on 2 Oct and on 7 Oct had 3 orders, all paid in full, so these counts are expected to be about 0.

**Backfill, in the A1 migration:**

1. `refunded_total` = `is_refunded ? COALESCE(refund_amount, 0) : 0`. One `order_refunds` row per refunded order, taking `refunded_at`, `proof_url` and `note`, with `client_ref = 'legacy-' || id`.
2. `invoices.amount_received` = the first receipt amount for PAID invoices and for CANCELLED invoices with `paid_at`.
3. `credit_balance` = an OPENING entry of max(0, paid_to_date − refunded_total − final_price), skipping legacy imports (`paid_to_date = 0`).
   - Over-transfers made earlier on a DP are not reconstructed. The next invoice is still smaller, because Billable = T − Net.
   - Legacy refunds get no REFUND credit entry, because OPENING is already net of them.
4. `cancellation_rule = 'ORDER_V1'` where `cancellation_fee IS NOT NULL`.

The A3 migration needs no backfill.

---

## 11. E2E (`scripts/e2e/flows.mjs`)

**Existing checks to update**

- **E3:** the DP invoice stays PAID, it is no longer CANCELLED. `refundDue` becomes credit 100.000.
- **O14–O17:**
  - fee = 100.000 (day 2 at tier 1);
  - total 600.000;
  - credit 400.000;
  - order card total 600.000, margin 400.000.
- **Q2:** total 1.200.000. **Q6/Q7:** messages say Rp 1.200.000.
- **Q13:** DP base 1.200.000 → minimum 240.000; use 240.000, and 200.000 must be refused.
- **G9:** goes through `/refunds`, with the alias also checked.
- **O9 and O10:** the receivable is computed from Net.

O4–O8, G15, J7, Q16 and Q17–Q18 keep their numbers (all single-day).

**New group R** ("R. Per-day cancellation, saldo lebih, actual money, refunds")

*Per-day fee*

- **R1:** per-day tier 1 in Edit Hari. Day fee 20%, total, `cancel_*` stored, change log.
- **R2:** `expected_cancel_fee` mismatch → 409 `CANCEL_FEE_CHANGED`; nothing changed.
- **R3:** the line quote equals what the save charges.
- **R4:** boundaries through `createRequire(dist/.../cancellation-policy.js)`, like line 1506:
  - 09:59:59.999 → 2;
  - 10:00:00.000 → 3;
  - 10:00:59 → 3 (B12);
  - 23:59 the day before → 1;
  - started → 3;
  - no date → 1.
- **R5:** rounding 1.234.567 → 246.913 / 617.284 / 1.234.567; two days summed after rounding.
- **R6:** day H with the real clock; the tier follows the WIB hour, like J7.

*Batalkan Pesanan per day*

- **R7:** a 3-day order starting today. Penalty = Σ per-day fees, below the old whole-order rule. `days[]` in the response.
- **R8:** `cancel-quote` equals the result.
- **R9:** an earlier per-day fee is kept.
- **R10:** day 1 done, then cancel → credit released.
- **R11:** paid in full, one day cancelled → 200, RELEASE entry, status PAID.

*Saldo lebih*

- **R12:** the next invoice uses the credit (fully credit-paid → PAID with 0 cash; no GA4).
- **R13:** `apply_credit=false`.

*Actual money received*

- **R14:** overpayment without ack → 409; with ack → OVERPAYMENT entry, DP_PAID, settlement net of credit.
- **R15:** double mark-paid with overpayment → one receipt, one OVERPAYMENT.
- **R16:** underpaid DP → UNPAID, Billable grows, ADJUSTMENT below the DP minimum accepted, then DP_PAID and assignment allowed.
- **R17:** FULL 950.000 on 1.000.000 → `board` 409; after the ADJUSTMENT is paid → 200 and one "lunas" push.

*Refunds*

- **R18:**
  - a refund ≤ credit → 201;
  - `cash.refunded` and `net_cash` move by the amount, `ar` unchanged;
  - a second refund is visible;
  - more than the credit → 409;
  - the same `client_ref` → 200, no second deduction;
  - two refunds at once → one 409.
- **R19:** refunding a prepayment credit → piutang rises, status recomputed, `start_ready` false.
- **R20:** the alias is bounded.
- **R21:** `start_ready` uses Net.

*Concurrency and idempotency*

- **R22 (B9):** run `cancelOrder` together with `markInvoicePaid`, and `cancelOrder` together with a driver `start` and with Edit Hari, 10 times each. Zero 500 responses and consistent money.
- **R23 (B8):** the same `client_ref` twice at once → one invoice and one number. Two different refs over Billable → one 409.
- **R24:** adjustment `client_ref`.

*GA4, reports, PDFs and remaining rules*

- **R25:** GA4 through the mock: no purchase for a fee invoice or a cancelled order.
- **R26:** formula, as before/after differences like group O: the per-day fee appears in `accrual.cancellation_income` on `cancelled_at`, the order card margin equals the Dashboard, and `order_level` on the revenue page.
- **R27:** PDFs: day fee line with tier; statement with refunds and credit; kwitansi "Dipotong dari saldo lebih" and "Kekurangan".
- **R28:** Edit Order delete rule (with money → 409; without → free).
- **R29:** reopening a cancelled day clears the fee; credit kept.
- **R30:** a DONE day cannot be cancelled.
- **R31:** INV-6 refusal with the amounts.
- **R32 (B6):** `money.billable_remaining` accepted exactly; +1 → 409.
- **R33:** invariant sweep over every order the run touched: INV-1 to INV-6.

Update `scripts/e2e/README.md` (group table) and `docs/TEST-PLAN.md` case ids.

---

## 12. Questions the owner must answer before coding (recommended default in brackets)

| # | Question | Recommended default |
|---|---|---|
| Q1 | Is 10:00:00 itself already 100%? | Yes. Strictly "sebelum 10.00", as the owner wrote. The text changes from "s.d." to "sebelum". |
| Q2 | Does "belum jalan" mean the driver has not left the garage (Berangkat)? Or not yet arrived, or customer not yet on board? | Not yet left the garage. Matches the website. |
| Q3 | Is the tier taken at the admin's save time, or at the time the customer asked (backdate)? | Save time. An optional "waktu pelanggan membatalkan", no later than now and at most 3 days back, logged, if the owner wants it. |
| Q4 | Extra charges on a cancelled order: billed in full, outside the fee base? | Yes. The old rule took a % of them. |
| Q5 | Per-day fee in reports: by cancellation date or by service date? | Cancellation date. |
| Q6 | Removing a day in Edit Order: a free correction before any money or invoice, otherwise must go through Edit Hari with the fee? | Yes. |
| Q7 | Refuse cancelling a DONE day? | Yes. |
| Q8 | Reopening a cancelled day removes its fee and keeps the credit? | Yes. |
| Q9 | Waive or override a fee (Arasya's fault, force majeure)? | Not in v1. If wanted: `waive_fee` with a mandatory reason, logged. |
| Q10 | Must the cancelled-day fees be paid before "Mulai perjalanan" (base = T − charges)? | Yes. |
| Q11 | Does the DP base include the fees? | Yes, the same base. |
| Q12 | Invoice fully paid from credit: create it as PAID with a kwitansi "dibayar dari saldo lebih"? | Yes. |
| Q13 | An underpaid invoice stays "Terbayar" with a "kurang" badge, and the remainder goes on an "Invoice Penyesuaian"? Or a new status? | Keep PAID plus the badge. |
| Q14 | Any upper limit on overpayment? | Explicit confirmation only. |
| Q15 | May the admin refund credit while the customer still owes (prepayment)? | Yes, with a warning. |
| Q16 | Now that both paths agree, may Edit Hari cancel the last open day? | Keep the refusal. |
| Q17 | Does a per-day cancel issue its own fee invoice? | No. The fee goes into the total. |
| Q18 | Credit per order only, not moved to the customer's other orders? | Per order. |
| Q19 | Partner (rekanan) days use the same customer tiers, with RTR as the admin enters it? | Yes. |
| Q20 | GA4: never for a fee invoice or a cancelled order; no `refund` event? | Yes. |
| Q21 | Approve the policy-text draft (§8) before A3 is released. | — |

---

## 13. PRs, in release order

1. **API A1 — "Order money, credit ledger, locks"** (migration 1)
   - `order-money.ts`; `money` in `GET /orders/:id`.
   - One lock order (B9) in `cancelOrder`, `markInvoicePaid`, revise and generate.
   - `client_ref` on invoices and adjustments with caps checked under the lock (B8).
   - B12 rest: the 10:00 boundary in today's `computeCancellationPenalty`; GA4 guard; delete `updateInvoiceStatus`.
   - ACTIVE and REFUNDED buckets.
   - e2e: R22–R25, R33 and the updated G checks.
   - No user-visible money change except the bug fixes. Deploy, then wait.
2. **API A2 — "Uang diterima, saldo lebih, refund"** (4.2, 4.3, B4)
   - mark-paid acknowledgement and OVERPAYMENT; ADJUSTMENT type; billing on Covered; credit applied on create and revise.
   - Refunds endpoint plus the bounded alias.
   - `startPayment`, payment status and analytics cash/piutang on Net; rule set v3 for cash.
   - Kwitansi and statement lines.
   - e2e: R12–R21, R32.
3. **Dashboard D1** (after A1 + A2 are live): `money`, InvoiceSection, MarkPaidDialog, GenerateInvoiceForm and ReviseInvoiceForm (DP minimum, credit, ADJUSTMENT, `client_ref`), RefundDialog plus history, the cash card.
4. **Owner approves the policy text** (Q21) and answers Q1–Q20.
5. **API A3 — "Denda per hari"** (4.1, 4.4; migration 2)
   - Policy module; quotes; Edit Hari, Edit Order and `cancelOrder` per day; rollup and margin v6; per-day `cancellation_income`.
   - PDF day-fee lines; **the new policy text** in `pdf.service.ts`, `waCaptions.ts` and `CLAUDE.md`.
   - e2e: R1–R11, R26–R31 and the updated O, Q and E checks.
6. **Dashboard D2** (after A3): Edit Hari fee preview, Batalkan Pesanan per-day dialog, badges, EditOrderForm hint, Panduan text.
7. **Website W1** (`arasya-web` + Sanity `cancellationPolicy`, `seed.json`, `policy.py`) the same day as A3 and D2, so the website, captions, PDFs and system say the same thing (a `CLAUDE.md` rule).
8. **Docs:** HANDOFF, BACKLOG §6.1 marked done, TEST-PLAN, API e2e README.

Each API PR runs `scripts/e2e/run-local.sh` and `/code-review` before merge (HANDOFF 7 Okt §5). Each dashboard PR runs `tsc` and `next build`.

Out of scope, still open: B5 (margin of days not yet assigned), B10 (driver-paid costs added after the payable was paid), B11 (dates not in WIB). B6 and BACKLOG 1.5 are fixed by the `money` object in D1.

### Critical files for implementation
- `E:\Arasya RentCar\api-arasya-rentcar\src\modules\orders\orders.service.ts` (`cancelOrder`, `computeCancellationPenalty`, `updateOrder`, `markOrderRefunded`, `searchOrders`)
- `E:\Arasya RentCar\api-arasya-rentcar\src\modules\invoices\invoices.service.ts` (`generateInvoice`, `reviseInvoice`, `markInvoicePaid`, `billedSoFar`, PDF builders)
- `E:\Arasya RentCar\api-arasya-rentcar\src\modules\schedule\schedule.service.ts` (`assignScheduleLine`, `rollupOrderFinance`)
- `E:\Arasya RentCar\api-arasya-rentcar\src\modules\orders\assignment-guard.ts` (`netPaid`, `startPayment`, `paymentStatusFor`, `dpBaseOf`); new `order-money.ts` and `cancellation-policy.ts` next to it
- `E:\Arasya RentCar\api-arasya-rentcar\src\modules\analytics\analytics.service.ts` (rule header, `orderLevelSlice`, `cashSlice`, `outstandingSnapshot`)
- `E:\Arasya RentCar\api-arasya-rentcar\prisma\schema.prisma` and `scripts\e2e\flows.mjs`
- `E:\Arasya RentCar\dashboard-arasya-rentcar\app\dashboard\orders\[id]\page.tsx`, `components\orders\InvoiceSection.tsx`, `components\invoices\MarkPaidDialog.tsx`, `components\schedule\ScheduleLineDialog.tsx`, `components\forms\GenerateInvoiceForm.tsx`