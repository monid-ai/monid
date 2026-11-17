import { z } from "zod";

/**
 * Faithful mirror of the Mindcase `sec/filings` agent's `parameters`
 * (GET https://api.mindcase.co/v1/data/sec/filings). Generated; optionality
 * only, no defaults: tightening lives at the binding (design D25). The API
 * rejects unknown keys with 422, hence `.strict()`.
 */
export const zSecFilingsBody = z.object({
    company: z.string()
        .describe("Company."),
    formTypes: z.array(
        z.enum([
            "10-K",
            "10-Q",
            "8-K",
            "S-1",
            "S-3",
            "S-4",
            "S-8",
            "424B",
            "DEF 14A",
            "DEFA14A",
            "3",
            "4",
            "5",
            "144",
            "13F-HR",
            "SC 13D",
            "SC 13G",
            "20-F",
            "6-K",
            "40-F",
            "11-K",
            "NT 10-K",
            "NT 10-Q",
        ]),
    )
        .describe(
            "Which SEC forms to include. Pick one or more; any case works (10k, 10-K, sc13d). SC 13D and SC 13G also cover the newer SCHEDULE 13D/13G filings. Leave empty for all form types, amendments included.",
        )
        .optional(),
    includeAmendments: z.boolean()
        .describe(
            "Also return amended filings (10-K/A, 8-K/A, 4/A and so on) for the picked form types. Off by default; has no effect when Form Types is empty, since that already returns every form.",
        )
        .optional(),
    dateFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Date From as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    dateTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        .describe("Date To as a date (YYYY-MM-DD). Format YYYY-MM-DD.")
        .optional(),
    maxResults: z.number().int()
        .describe(
            "How many filings to return in total. Defaults to 100; use 0 for all.",
        )
        .optional(),
}).strict();
