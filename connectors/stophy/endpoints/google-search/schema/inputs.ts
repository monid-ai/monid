import { z } from "zod";
import {
    zCountry,
    zDomains,
    zGoogleTime,
    zLanguage2,
} from "../../../schema/common.ts";

/** `POST /v1/google/search` request body — the faithful vendor mirror. */
export const zGoogleSearchBody = z.object({
    query: z.string().min(1).max(400),
    country: zCountry.optional(),
    language: zLanguage2.optional(),
    includeDomains: zDomains.optional(),
    excludeDomains: zDomains.optional(),
    time: zGoogleTime.optional(),
    safeSearch: z.boolean().describe("Hide explicit results.").optional(),
    scrapeResults: z.boolean().describe(
        "Also read the top results and add each page's text as markdown. " +
            "Each result that comes back with its text costs 1 more Stophy " +
            "call.",
    ).optional(),
    scrapeLimit: z.number().int().min(1).max(5).describe(
        "How many of the top results to read when scrapeResults is on " +
            "(vendor default 3).",
    ).optional(),
    page: z.number().int().min(1).max(100).describe(
        "Page number, starting at 1.",
    ).optional(),
}).strict();
