import { z } from "zod";
import {
    zCountry,
    zDomains,
    zGoogleTime,
    zLanguage2,
} from "../../../schema/common.ts";

/** `POST /v1/google/news` request body — the faithful vendor mirror.
 *  The vendor takes `query` or `topic`, not both; the binding enforces it. */
export const zGoogleNewsBody = z.object({
    query: z.string().min(1).max(400).optional(),
    topic: z.enum([
        "world",
        "nation",
        "business",
        "technology",
        "entertainment",
        "sports",
        "science",
        "health",
    ]).describe(
        "The top 10 headlines in one section instead of a search. Send " +
            "query or topic, not both.",
    ).optional(),
    country: zCountry.optional(),
    language: zLanguage2.optional(),
    includeDomains: zDomains.optional(),
    excludeDomains: zDomains.optional(),
    time: zGoogleTime.optional(),
    sort: z.enum(["relevance", "newest"]).describe(
        "By relevance (the default), or newest first.",
    ).optional(),
    page: z.number().int().min(1).max(10).describe(
        "Page number, starting at 1.",
    ).optional(),
}).strict();
