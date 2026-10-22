import { defineProvider, presets } from "@shared/core";

/**
 * Reverse Contact (reversecontact.com): B2B people and company data. JSON
 * over HTTPS against `https://api.reversecontact.com`, public API v2,
 * bearer auth (`rc_...` keys). Published contract:
 * `https://api.reversecontact.com/openapi.json`; docs:
 * `https://docs.reversecontact.com`.
 *
 * Thirteen endpoints. Eleven are one synchronous exchange (fetch, enrich,
 * search, count). The two contact finders are asynchronous upstream: the
 * submit answers a job acknowledgement and the result is read from
 * `GET /v2/webhooks/{webhookId}`, which each of them polls in its own
 * lifecycle (none on the provider, which would replace the declarative path
 * of the synchronous eleven).
 *
 * THE RECEIPT SETTLES EVERY RUN. Every v2 success envelope reports what the
 * call drew, in Reverse Contact credits:
 *
 *   { success, data, error: null,
 *     quotas: { creditsConsumed, workspace: {...}, key: {...} },
 *     metadata: { requestId, executionTimeMs } }
 *
 * `quotas.creditsConsumed` is computed by the same function the gateway
 * bills with: 1 per delivered search result, 2 per enrichment, 1 per fetch,
 * the prompt searches' base credit, 0 on an empty page. So every billed doc
 * here is a leaf `PER_UNIT` in `CREDIT` units at amount 1, the provider's
 * `usage.evidence` reads the receipt as the count and `usage.consolidate`
 * claims the same figure. The receipt has to be the evidence and not only
 * the claim: the engine prunes a zero claim and falls back to the derived
 * fold, and an empty search page is a real zero.
 *
 * `quotas` is plucked out of every output, success and error alike: beside
 * the receipt it carries the ACCOUNT's balance, limits and ids, which are
 * the broker's business, not the caller's.
 *
 * MISSES ARE FREE, and arrive as non-2xx, which the engine zero-bills: a
 * profile the cached database does not hold, an enrichment without a match
 * and an unknown lookalike seed are 404 at 0 credits; every validation
 * refusal (422) and every 4xx other than 404 is 0 credits upstream.
 *
 * SURFACES NOT IN THIS CONNECTOR, and why:
 *   - The `/live` fetches: they bill a miss (2 credits on a 404), which
 *     cannot settle here, and they deliver through webhooks.
 *   - Lists (`/v2/lists/**`): durable workspace state. On a broker every
 *     caller shares one workspace, so one caller's list is every caller's.
 *   - `GET /v2/usage`: the broker account's balance, nothing a caller owns.
 */
export default defineProvider({
    name: "reversecontact",
    meta: {
        displayName: "Reverse Contact",
        summary: "B2B people and company data: enrich from a work email, " +
            "a domain or a profile URL, search people and organizations, " +
            "and find professional emails and phone numbers.",
        description: "Reverse Contact turns sparse B2B identifiers into " +
            "complete professional profiles. Resolve a work email, or a " +
            "name and a company, into the person behind it: current " +
            "position, full work history, education, skills, languages " +
            "and location. Fetch any person or company by its LinkedIn " +
            "URL. Enrich a company from its domain with firmographics: " +
            "headcount, industry, specialities, headquarters, founding " +
            "year, website. Search people by title, function, seniority, " +
            "current or past employer, industry, headcount, location, " +
            "skills, languages, tenure and recent job changes, or search " +
            "organizations by industry, size, founding year and " +
            "headquarters, with structured filters or one plain-language " +
            "prompt, and count either for free before paying for pages. " +
            "Find people similar to a seed profile. Find a person's " +
            "professional email address or phone number. Reach for it for " +
            "lead enrichment, prospect list building, account research, " +
            "CRM hygiene and recruiting. Lookups that find nothing cost " +
            "nothing.",
        homepageUrl: "https://reversecontact.com",
        docsUrl: "https://docs.reversecontact.com",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "Errors answer `{success: false, error: {code, message, " +
            "details?}}`. The `code` is the part to branch on: " +
            "`VALIDATION_ERROR` and the search-filter codes " +
            "(`UNKNOWN_FIELD`, `INVALID_FILTER_VALUE`, " +
            "`NO_FILTER_PROVIDED`...) name the field and suggest the fix.",
            "A 451 `DATA_SUBJECT_BLOCKED` means the person asked to be " +
            "removed (GDPR/CCPA): nothing is returned and nothing is " +
            "billed. Search pages drop such profiles silently and bill " +
            "only what they deliver.",
            "A 429 carries `details.retryAfter` (seconds) and a " +
            "`retry-after` header.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.reversecontact.com" },
    /** The gateway's own deadlines: 32s for fetches, 37s for searches, 52s
     *  for the prompt searches, 62s for a person enrichment. */
    timeouts: { requestMs: 65_000, runMs: 70_000 },
    usage: {
        /** ONE pool: Reverse Contact credits. Every surface (API, MCP,
         *  CLI, dashboard) draws from the same workspace balance. */
        credits: {
            default: {
                label: "Reverse Contact credits",
                description: "Reverse Contact credits, drawn from one " +
                    "workspace balance; each response reports its own " +
                    "draw in `quotas.creditsConsumed`",
            },
        },
        /** THE RECEIPT IS THE EVIDENCE: the count of a billed doc is the
         *  envelope's `quotas.creditsConsumed`, so a zero receipt settles
         *  zero. Free docs count nothing. */
        evidence: ({ data, utils }) => {
            if (data.usage.model.kind !== "PER_UNIT") return { counts: {} };
            const consumed = utils.json.optionalNum(
                data.output,
                "$.quotas.creditsConsumed",
            );
            return {
                counts: consumed === undefined
                    ? {}
                    : { [data.usage.model.unit]: consumed },
            };
        },
        /** The vendor's own claim, lifted out with the whole `quotas`
         *  block (the account's balance and limits). A zero receipt claims
         *  nothing, which keeps the free counts claim-free. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(data.output, "$.quotas");
            const consumed = value === undefined
                ? undefined
                : utils.json.optionalNum(value, "$.creditsConsumed");
            return {
                credits: {
                    ...(consumed !== undefined && consumed > 0
                        ? { default: consumed }
                        : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** `{success: false, data: null, error: {code, message, details?},
         *  quotas?, metadata?}` to `{message, code?, details?, raw}`, with
         *  `quotas` (the account's balance) removed from `raw`. Two other
         *  shapes land here: the phone finder's 410 when phone finding is
         *  off (`{error: "endpoint_unavailable", message, alternative}`),
         *  and a contact job the lifecycle settled as a miss or a failure
         *  (the poll envelope, whose `data.errorCode` says why). */
        fromError: ({ data, utils }) => {
            const raw = utils.json.pluck(data.output, "$.quotas").rest;
            const error = utils.json.optionalGet(raw, "$.error");
            const isObject = error !== null && typeof error === "object" &&
                !Array.isArray(error);
            const errorCode = isObject
                ? utils.json.optionalGet(raw, "$.error.code")
                : undefined;
            const errorMessage = isObject
                ? utils.json.optionalGet(raw, "$.error.message")
                : undefined;
            const details = isObject
                ? utils.json.optionalGet(raw, "$.error.details")
                : undefined;
            const jobCode = utils.json.optionalGet(raw, "$.data.errorCode");
            const code = typeof errorCode === "string"
                ? errorCode
                : typeof error === "string"
                ? error
                : typeof jobCode === "string"
                ? jobCode
                : undefined;
            const jobMessage = Object.entries({
                "email-not-found":
                    "No professional email address was found for this person. Nothing was billed.",
                "phone-not-found":
                    "No phone number was found for this person. Nothing was billed.",
                "person-not-found":
                    "The person could not be identified. Nothing was billed.",
                "data-not-found":
                    "No contact data was found for this person. Nothing was billed.",
                "invalid-request":
                    "The identifiers could not be used for a lookup. Nothing was billed.",
                "fetch-data-error":
                    "The lookup failed upstream and was not billed. It is safe to retry.",
            }).find((entry) => entry[0] === jobCode)?.[1];
            const topMessage = utils.json.optionalGet(raw, "$.message");
            const message = typeof errorMessage === "string" &&
                    errorMessage !== ""
                ? errorMessage
                : typeof topMessage === "string" && topMessage !== ""
                ? topMessage
                : jobMessage ?? "Reverse Contact API error";
            return {
                message,
                ...(code !== undefined ? { code } : {}),
                ...(details !== undefined ? { details } : {}),
                raw,
            };
        },
    },
});
