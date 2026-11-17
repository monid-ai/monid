import { z } from "zod";

/**
 * `POST /v1/fetch` request body — the vendor mirror (String's own docs,
 * portal.usestring.ai/docs/api-reference/fetch, read 2026-10-24), shared
 * by the two endpoints that call it: `string#fetch` reads a page with a
 * GET and `string#request` sends a POST, PUT or PATCH, the split String's
 * `/v3` tools make. Optionality only, per the mirror convention: String
 * rejects any other field with a 400, so the mirror is strict; each
 * endpoint picks its fields and applies its defaults at the binding.
 *
 * Mirrored: the fields `/v3`'s fetch and request tools send. Not
 * mirrored: browser actions, screenshots, XHR and iframe capture,
 * `waitUntil`, `requireWSS`, `markdownMode`, `mainContentOnly`,
 * `ignoreCertificateErrors`, and `jsonSchema` (AI structured extraction),
 * whose surcharge "scales with page/schema size" with no published flat
 * rate — an unmodelable line, left out rather than priced by guess.
 *
 * Cross-field rules the vendor documents (`headers` with `executeJS`,
 * `body` on GET) cannot survive compilation; they are each endpoint's
 * `notes`, and String's own 400 enforces them.
 */
export const zFetchBody = z.object({
    // `z.url({protocol})` doesn't carry its protocol constraint through
    // to the compiled runtime validator (confirmed empirically: a
    // ftp:// URL passed it), so this mirrors the plain-regex convention
    // the rest of the repo already uses for URL fields (e.g.
    // connectors/minimax/schema/h3-video.ts).
    url: z.string().regex(
        /^https?:\/\/[^/?#\s]/,
        "must be a public http(s) URL",
    ).describe("The full http or https URL."),
    // The `i` regex flag doesn't survive compilation to the runtime JSON
    // Schema `pattern` (confirmed empirically, same as the url protocol
    // constraint above), so case-insensitivity is spelled out with
    // per-letter character classes instead of a flag.
    method: z.string().regex(
        /^([gG][eE][tT]|[pP][oO][sS][tT]|[pP][uU][tT]|[pP][aA][tT][cC][hH]|[dD][eE][lL][eE][tT][eE]|[hH][eE][aA][dD]|[oO][pP][tT][iI][oO][nN][sS])$/,
    ).describe(
        "HTTP method: GET, POST, PUT, PATCH, DELETE, HEAD or OPTIONS, in " +
            "any case (vendor default 'GET').",
    ).optional(),
    body: z.union([
        z.string().max(1_000_000),
        z.record(z.string(), z.unknown()),
    ])
        .describe(
            "Request body, at most 1,000,000 characters. A string is sent " +
                "as given; an object is sent as the JSON text you wrote.",
        ).optional(),
    format: z.enum(["json", "raw", "markdown"]).describe(
        "Response format (vendor default 'json'): 'json' for an envelope " +
            "with the destination's statusCode, headers and data, 'raw' for " +
            "the destination's body as it was sent, 'markdown' for the page " +
            "as Markdown.",
    ).optional(),
    executeJS: z.boolean().describe(
        "true renders JavaScript first, for pages that build their content " +
            "in the browser. Not with `headers`.",
    ).optional(),
    headers: z.record(z.string(), z.string()).describe(
        "Request headers to send, up to 50, in the order given. A name " +
            "given twice is an error. Not with `executeJS`.",
    ).optional(),
    countryCode: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "ISO 3166-1 alpha-2 code the request is sent from, such as 'US'.",
    ).optional(),
    solveCaptcha: z.boolean().describe(
        "Whether the request attempts a challenge page (vendor default " +
            "true). false fails the call on a challenge instead.",
    ).optional(),
}).strict();
