import { defineProvider, presets } from "@shared/core";

/**
 * DataForB2B (dataforb2b.ai) — B2B people and company data: structured
 * search over professional profiles and companies, and per-profile
 * enrichment with work email, personal email and phone. Three synchronous
 * endpoints against `https://api.dataforb2b.ai`, auth header `api_key`.
 *
 * Every endpoint prices the PUBLISHED card (docs, 2026-09-23) as whole
 * units — results for the searches, items found for the enrichment — and
 * every successful response carries `credits_used`, DataForB2B's own
 * charge. That receipt is the CLAIM (design D27): the provider consolidate
 * lifts it out of the payload and it bills. Some accounts are on an
 * earlier, lower card; their runs bill the lower receipt and ride out a
 * `usage.mismatch.derived` — said, never failing the run.
 */
export default defineProvider({
    name: "dataforb2b",
    meta: {
        displayName: "DataForB2B",
        summary: "Search and enrich B2B people and companies, with work " +
            "email, personal email and phone.",
        description: "DataForB2B is a B2B data API over professional " +
            "profiles and companies. Search people by current or past " +
            "employer, title, seniority signals, skills, education, " +
            "languages, location and company funding; search companies by " +
            "industry, size, headcount growth, headquarters and office " +
            "locations, and funding stage. Then enrich any profile into its " +
            "full work history with a work email, a personal email and a " +
            "mobile phone, each charged only when found. Reach for it to " +
            "build a prospect or candidate list from structured criteria " +
            "and turn the matches into contactable leads.",
        homepageUrl: "https://dataforb2b.ai",
        docsUrl: "https://docs.dataforb2b.ai",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "Errors use FastAPI's `{detail}` envelope: a string for 400/401/" +
            "404, an object `{error, available_credits, required_credits}` " +
            "for 402, and a list of field errors for 422.",
            "A 402 is decided BEFORE the call from the worst case " +
            "(requested count × rate), so a balance that would cover the " +
            "actual results can still be refused.",
        ],
    },
    auth: { inject: presets.auth.header("api_key") },
    request: { baseUrl: "https://api.dataforb2b.ai" },
    // live enrichment fetches fresh data per result, so large searches take
    // tens of seconds; enrichment with contact lookup runs a few seconds
    timeouts: { requestMs: 120_000, runMs: 120_000 },
    usage: {
        credits: {
            default: {
                label: "DataForB2B credits",
                description: "DataForB2B credits; each response's " +
                    "`credits_used` is the charge",
            },
        },
        /** The vendor's own claim (design D27), lifted out of the payload. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.credits_used",
            );
            return {
                credits: {
                    ...(typeof value === "number" ? { default: value } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** `{detail}` → `{message, error_code?, raw}`. `detail` is a string
         *  (400/401/404), an object with `error` (402), or a list of
         *  field errors (422). */
        fromError: ({ data, utils }) => {
            const detail = utils.json.optionalGet(data.output, "$.detail");
            const error = typeof detail === "object" && detail !== null &&
                    !Array.isArray(detail)
                ? utils.json.optionalGet(detail, "$.error")
                : undefined;
            const first = Array.isArray(detail) && detail.length > 0
                ? utils.json.optionalGet(detail[0], "$.msg")
                : undefined;
            const message = typeof detail === "string" && detail !== ""
                ? detail
                : typeof error === "string"
                ? error
                : typeof first === "string"
                ? first
                : "DataForB2B API error";
            return {
                message,
                ...(typeof error === "string" ? { error_code: error } : {}),
                raw: data.output,
            };
        },
    },
});
