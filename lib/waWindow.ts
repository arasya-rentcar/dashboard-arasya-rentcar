// "Manual WhatsApp" mode: when the API runs without the WhatsApp bot, the
// send-* endpoints return a `wa_url` (https://wa.me/...?text=...) instead of
// sending. The admin then presses Send inside WhatsApp themselves.
//
// window.open() after an await can be popup-blocked, so in manual mode
// (the default) a blank tab is opened synchronously in the
// click handler and pointed at the wa.me link once the request succeeds, or
// closed when there is no link. In bot mode the link is opened directly.

export interface WaWindow {
  /** Navigate the pre-opened tab to `url`; closes it when `url` is empty.
   *  Returns true when a WhatsApp link was opened. */
  finish: (url?: string | null) => boolean;
  /** Close the pre-opened tab (request failed). */
  cancel: () => void;
}

function safeWaUrl(url?: string | null): string | null {
  if (!url || typeof url !== "string") return null;
  return /^https:\/\//i.test(url) ? url : null;
}

/** wa_url of one recipient in a send-confirmation response. */
export function extractRecipientWaUrl(
  data: unknown,
  who: "driver" | "old_driver_standdown",
): string | null {
  if (!data || typeof data !== "object") return null;
  const r = (data as Record<string, { wa_url?: unknown } | null | undefined>)[who];
  return safeWaUrl(typeof r?.wa_url === "string" ? r.wa_url : null);
}

/** Pull the wa_url out of a send-* response (`data.wa_url` for invoices and
 *  receipts, `data.customer.wa_url` for trip confirmations). */
export function extractWaUrl(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as { wa_url?: unknown; customer?: { wa_url?: unknown } | null };
  const url = d.wa_url ?? d.customer?.wa_url;
  return safeWaUrl(typeof url === "string" ? url : null);
}

// Manual WhatsApp is the default. Only the retired bot mode
// (NEXT_PUBLIC_WA_DELIVERY=bot) returns no link, where a pre-opened tab would
// just flash open and shut.
const PRE_OPEN = process.env.NEXT_PUBLIC_WA_DELIVERY !== "bot";

/** Call synchronously inside the click handler, before the request. */
export function openWaWindow(): WaWindow {
  let w: Window | null = null;
  if (PRE_OPEN) {
    try {
      w = window.open("", "_blank");
      // Drop the opener link before the tab navigates to an external site.
      if (w) w.opener = null;
    } catch {
      w = null;
    }
  }

  const close = () => {
    try {
      if (w && !w.closed) w.close();
    } catch {
      // ignore
    }
  };

  return {
    finish(url) {
      const safe = safeWaUrl(url);
      if (!safe) {
        close();
        return false;
      }
      if (w && !w.closed) {
        w.location.href = safe;
      } else {
        // Not pre-opened (bot mode) or blocked: open directly.
        window.open(safe, "_blank", "noopener");
      }
      return true;
    },
    cancel: close,
  };
}
