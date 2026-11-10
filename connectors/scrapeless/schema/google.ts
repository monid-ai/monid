import { z } from "zod";

/** Vendor mirror: optionality only, no operational defaults. See doc-800321. */
export const zGoogleInput = z.strictObject({
    engine: z.literal("google.search").optional().describe(
        "Optional engine spelling shown in the current Google endpoint guide.",
    ),
    q: z.string().min(1).describe(
        "Search query, including Google operators such as site: and intitle:.",
    ),
    location: z.string().optional().describe(
        "Canonical location. Mutually exclusive with uule.",
    ),
    uule: z.string().optional().describe(
        "Encoded Google location. Mutually exclusive with location.",
    ),
    ludocid: z.string().optional(),
    lsig: z.string().optional(),
    kgmid: z.string().optional(),
    si: z.string().optional(),
    ibp: z.string().optional(),
    uds: z.string().optional(),
    google_domain: z.string().optional().describe(
        "Google domain; vendor documents google.com as its default.",
    ),
    gl: z.string().optional().describe("Google country code, for example us."),
    hl: z.string().optional().describe("Google language code, for example en."),
    cr: z.string().optional(),
    lr: z.string().optional(),
    tbs: z.string().optional(),
    safe: z.enum(["active", "off"]).optional(),
    nfpr: z.union([z.literal("0"), z.literal("1"), z.literal(0), z.literal(1)])
        .optional().describe(
            "Prefer string 0/1, as sent by the official n8n integration. Numeric legacy input is retained unchanged; a combined numeric probe returned an input parse error, with cause not isolated.",
        ),
    filter: z.union([
        z.literal("0"),
        z.literal("1"),
        z.literal(0),
        z.literal(1),
    ]).optional().describe(
        "Prefer string 0/1, as sent by the official n8n integration. Numeric legacy input is retained unchanged; a combined numeric probe returned an input parse error, with cause not isolated.",
    ),
    tbm: z.string().optional(),
    start: z.number().int().nonnegative().optional().describe(
        "Result offset. Local search requires a multiple of 20.",
    ),
    num: z.number().int().positive().optional().describe(
        "Requested result count, not a hard cap: the 2026-10-22 live sample requested 1 and returned 2. Do not use num alone as a billing or output-size ceiling.",
    ),
    device: z.literal("desktop").optional(),
});

/** A union survives JSON Schema compilation; Zod refine does not. */
export function googleBody(tbm?: string) {
    const base = tbm === undefined
        ? zGoogleInput.omit({ tbm: true })
        : zGoogleInput.extend({ tbm: z.literal(tbm).optional() });
    const shape = base.extend({
        start: tbm === "lcl"
            ? z.number().int().nonnegative().multipleOf(20).optional()
            : zGoogleInput.shape.start,
    });
    return z.strictObject({
        actor: z.literal("scraper.google.search").default(
            "scraper.google.search",
        ),
        input: z.union([
            shape.omit({ uule: true }),
            shape.omit({ location: true }),
        ]),
    });
}
