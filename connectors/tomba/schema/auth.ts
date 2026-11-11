import { z } from "zod";

/**
 * The credential SHAPE of a Tomba account: every request carries TWO
 * values, the API key (`X-Tomba-Key`) and its secret (`X-Tomba-Secret`),
 * both created in the dashboard (app.tomba.io/api). They travel together
 * as one credential object, declared once on the provider.
 *
 * Only the SHAPE lives here — never a value.
 */
export const zTombaCredentials = z.object({
    apiKey: z.string().min(1).describe(
        "The Tomba API key, sent as X-Tomba-Key (starts with `ta_`).",
    ),
    secretKey: z.string().min(1).describe(
        "The Tomba API secret, sent as X-Tomba-Secret (starts with `ts_`).",
    ),
});

/**
 * The credential field names, derived from the shape above so the live-test
 * gate can never drift from it: `liveSkip("tomba", TOMBA_KEYS)` opens only
 * when BOTH `TOMBA_CREDENTIALS_API_KEY` and `TOMBA_CREDENTIALS_SECRET_KEY`
 * are set.
 */
export const TOMBA_KEYS: readonly string[] = Object.keys(
    zTombaCredentials.shape,
);
