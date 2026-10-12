import { z } from "zod";

/**
 * Shared fragments for the Vela Breakout endpoint schemas — faithful
 * mirror of the published OpenAPI (2026-10-12): optionality only, no
 * defaults (design D25). The price is flat per call, so `limit` is not a
 * billing knob and stays optional at every binding.
 */

/** `limit` on /breakouts, /ideas and /rising-companies (1-25). */
export const zLimit = z.number().int().min(1).max(25).describe(
    "How many rows to return, 1-25. The price is the same for any limit.",
);
