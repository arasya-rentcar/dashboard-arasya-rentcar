import { useCallback, useState } from 'react';

/**
 * Idempotency key for one money action (invoice, revision, refund): a new
 * uuid each time `open` turns true, the same one on every retry while it
 * stays open, and a fresh one after `renew()` (call it after a success), so a
 * resend after a timeout is a no-op on the API and a second action is not.
 */
export function useClientRef(open: boolean) {
  const [ref, setRef] = useState(() => crypto.randomUUID());
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setRef(crypto.randomUUID());
  }
  const renew = useCallback(() => setRef(crypto.randomUUID()), []);
  return [ref, renew] as const;
}
