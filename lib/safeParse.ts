import type { ZodType } from 'zod';

/**
 * Validate an API response at the hook boundary WITHOUT throwing.
 *
 * The dashboard previously trusted `res.data.data` blindly (axios `any`) into a
 * typed `useQuery<T>` generic — so any FE/BE shape drift became a silent typed
 * lie that crashed at render time. This helper runs a lenient zod parse and, on
 * mismatch, logs a loud, locatable warning in dev — but still returns the raw
 * data cast as T so production stays resilient (no white-screens).
 */
export function parseResponse<T>(
  schema: ZodType,
  data: unknown,
  label: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success && process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.warn(
      `[API contract] ${label} response did not match expected shape:`,
      result.error.issues,
    );
  }
  return data as T;
}
