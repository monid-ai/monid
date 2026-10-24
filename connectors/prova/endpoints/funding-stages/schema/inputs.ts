import { z } from "zod";

/**
 * POST /funding-stages body — mirror of Prova's `LookupRequest`
 * (https://api.provaapi.com/openapi.json). Optionality only (design D25).
 *
 * The vendor wants EXACTLY ONE of `name`, `domain`, `linkedinSlug`; that
 * rule stays a documented constraint (design D6) and Prova answers 422
 * otherwise. `view` mirrors only `full`: the `raw` and `simple` views are
 * legacy shapes without a `status`, which the billing evidence reads.
 */
export const zFundingStagesBody = z.object({
    name: z.string().min(1).max(500).optional().describe(
        "Company name (e.g. 'Clay'). A name that fits several companies " +
            "answers not_found with `candidates`; prefer domain.",
    ),
    domain: z.string().min(1).max(500).optional().describe(
        "Company website, as a host or any URL (e.g. 'clay.com'); reduced " +
            "to the registrable domain. The most reliable identifier.",
    ),
    linkedinSlug: z.string().min(1).max(500).optional().describe(
        "LinkedIn company slug or its linkedin.com/company URL.",
    ),
    country: z.string().regex(/^[A-Z]{2}$/).optional().describe(
        "ISO 3166-1 alpha-2 country code (e.g. 'US') that helps match a " +
            "company name.",
    ),
    max_age_seconds: z.number().int().min(0).optional().describe(
        "Maximum age of completed research before it is redone. Default " +
            "604800 (7 days).",
    ),
    allow_stale: z.boolean().optional().describe(
        "Allow older stored facts. Default true.",
    ),
    scope: z.enum(["history", "latest"]).optional().describe(
        "history (default): research the whole funding history. latest: " +
            "research the most recent round only.",
    ),
    history_since: z.iso.date().optional().describe(
        "Earliest round date to include (YYYY-MM-DD); only with scope " +
            "history.",
    ),
    refresh: z.enum(["auto", "force", "never"]).optional().describe(
        "auto (default): answer from storage and research only when " +
            "needed. force: research again now. never: answer from " +
            "storage only, never start research.",
    ),
    require_completed_research: z.boolean().optional().describe(
        "Wait while research for this company is still running. Default " +
            "false.",
    ),
    view: z.enum(["full"]).optional().describe(
        "full: the same answer with each round's sources (link, date, " +
            "exact quote) and notes. Leave out for the standard answer.",
    ),
}).strict().describe(
    "Provide EXACTLY ONE of name, domain, linkedinSlug — Prova answers " +
        "422 to zero or several.",
);
