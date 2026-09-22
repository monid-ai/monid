import { z } from "zod";

/**
 * `POST /v1/fetch` request body — the vendor mirror (String's own docs,
 * portal.usestring.ai/docs/api-reference/fetch, read 2026-09-22).
 * Optionality only, per the mirror convention: String rejects any other
 * field with a 400, so the mirror is strict; defaults documented as vendor
 * behavior are applied at the endpoint binding, not here.
 *
 * `jsonSchema` (AI structured extraction) is deliberately NOT mirrored:
 * its surcharge is "metered per request, scales with page/schema size"
 * with no published flat rate — an unmoddelable line, left out of this
 * cut rather than priced by guess (see endpoint.ts).
 *
 * Cross-field rules the vendor documents (`headers` incompatible with
 * `executeJS`/`requireWSS`; `screenshot`/`actions` mutually exclusive and
 * restrict several other fields) are left to the vendor's own 400 rather
 * than re-encoded here, matching the sibling search mirror's minimalism.
 */
export const zFetchBody = z.object({
    url: z.url({ protocol: /^https?$/ }).describe(
        "The http/https URL to fetch.",
    ),
    method: z.enum(["GET", "POST", "PUT", "PATCH"]).optional().describe(
        "HTTP method, case-insensitive (vendor default 'GET'). `body` is " +
            "only valid for non-GET.",
    ),
    body: z.union([z.string(), z.record(z.string(), z.unknown())])
        .optional().describe(
            "Request body for POST/PUT/PATCH. Objects are JSON-" +
                "stringified. Forbidden on GET.",
        ),
    format: z.enum(["json", "raw", "markdown"]).optional().describe(
        "Response format (vendor default 'json').",
    ),
    markdownMode: z.enum(["readable", "full"]).optional().describe(
        "Markdown preservation level (vendor default 'full'). Only " +
            "affects markdown responses.",
    ),
    mainContentOnly: z.boolean().optional().describe(
        "Remove page chrome, keeping only main content (vendor default " +
            "false). Only affects markdown responses.",
    ),
    executeJS: z.boolean().optional().describe(
        "Render in a real browser. Incompatible with `headers`.",
    ),
    requireWSS: z.boolean().optional().describe(
        "Require a browser WebSocket fetch path. Incompatible with " +
            "`headers`.",
    ),
    headers: z.record(z.string(), z.string()).optional().describe(
        "Custom outbound headers (max 50). Direct fetch only.",
    ),
    countryCode: z.string().length(2).optional().describe(
        "ISO 3166-1 alpha-2 proxy country.",
    ),
    solveCaptcha: z.boolean().optional().describe(
        "Solve CAPTCHA challenges (vendor default true). false fails on " +
            "a challenge instead.",
    ),
    ignoreCertificateErrors: z.boolean().optional().describe(
        "Skip TLS certificate verification for this request (vendor " +
            "default false). Never applies to browser-rendered fetches.",
    ),
    screenshot: z.boolean().optional().describe(
        "Capture a screenshot. Shorthand for one screenshot action. " +
            "Mutually exclusive with `actions`.",
    ),
    actions: z.array(z.record(z.string(), z.unknown())).min(1).max(50)
        .optional().describe(
            "Browser actions to run (1-50). Mutually exclusive with " +
                "`screenshot`.",
        ),
}).strict();
