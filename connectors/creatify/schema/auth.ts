import { z } from "zod";

/**
 * The credential SHAPE of a Creatify API account: the workspace id and one
 * of its API keys, sent together as the `X-API-ID` / `X-API-KEY` header
 * pair on every request (https://docs.creatify.ai/api-reference). Both
 * travel as one credential object, declared once on the provider.
 *
 * Only the SHAPE lives here — never a value. Locally the two fields read
 * from `CREATIFY_CREDENTIALS_API_ID` and `CREATIFY_CREDENTIALS_API_KEY`.
 */
export const zCreatifyCredentials = z.object({
    apiId: z.string().min(1).describe(
        "The Creatify workspace id, sent as the X-API-ID header.",
    ),
    apiKey: z.string().min(1).describe(
        "An API key of that workspace, sent as the X-API-KEY header.",
    ),
});

/** The credential field names, derived from the shape so the live-test
 *  gate (`liveSkip("creatify", CREATIFY_KEYS)`) can never drift from it. */
export const CREATIFY_KEYS: readonly string[] = Object.keys(
    zCreatifyCredentials.shape,
);
