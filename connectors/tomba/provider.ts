import { defineProvider } from "@shared/core";
import { zTombaCredentials } from "./schema/auth.ts";

/**
 * Tomba (tomba.io) — find, verify, and enrich professional email
 * addresses, phone numbers, and companies. Twenty endpoints against
 * `https://api.tomba.io/v1`: the data tools of Tomba's remote MCP server
 * (docs.tomba.io/llm/remote-mcp/tools), each bound to the REST endpoint
 * the tool calls. Account, key, log, lead, flag, bulk, and scrape-campaign
 * endpoints are out of scope (design D1).
 *
 * Auth is a key PAIR — `X-Tomba-Key` + `X-Tomba-Secret` — so the
 * credential shape is declared here and the provider's own inline inject
 * sets both headers (no preset speaks two headers; the dataforseo posture).
 *
 * Billing (docs.tomba.io/usage-and-quotas#credit-costs, 2026-11-11): FOUR
 * balances, each its own pool (design D2) — search, verification, email
 * count, and sources credits. A request is charged only when it succeeds
 * AND meets the endpoint's "charged when" condition (an address found, a
 * definitive verdict, a valid phone, …); that condition is a COUNTING rule
 * in each metered endpoint's own evidence (D19). Tomba reports no meter in
 * the response body, so there is no consolidate: the derived fold is the
 * bill.
 */
export default defineProvider({
    name: "tomba",
    meta: {
        displayName: "Tomba",
        summary: "Find, verify, and enrich professional email addresses, " +
            "phone numbers, and companies.",
        description: "Tomba.io — B2B contact data for agents: find every " +
            "email address Tomba has for a company domain, resolve a " +
            "person's address from their name and company, a LinkedIn " +
            "profile, or an article they wrote, verify deliverability down " +
            "to the SMTP level, find and validate phone numbers, enrich " +
            "people and companies (Tomba's own format or Clearbit-" +
            "compatible), search a company database by filters or a " +
            "natural-language query, and look up a domain's email formats, " +
            "employee locations, similar companies, and technologies.",
        homepageUrl: "https://tomba.io",
        docsUrl: "https://docs.tomba.io",
        categories: ["people-enrichment", "company-enrichment"],
        notes: [
            "Tomba answers a failure with `{errors: {type, message, code}}` " +
            "— a single object, never an array. Branch on `errors.type`: " +
            "missing or expired credentials are a 400 " +
            "(`authentication_failed` / `api_key_expired`), credentials " +
            "that match no account a 401.",
            "A request that would cost more credits than the balance holds " +
            "fails with 402 `quota_exceeded` before any work is done; an " +
            "exhausted email-count or sources balance answers 429 instead. " +
            "Both settle as provider errors with zero usage.",
            "Sending the same request again within the same usage window " +
            "is free upstream; the usage recorded here is the published " +
            "rate, not the deduplicated draw.",
            "Searches and verifications run live against remote mail " +
            "servers and websites — responses can take up to a few minutes.",
        ],
    },
    auth: {
        credentials: zTombaCredentials,
        /** The key pair as two headers (design D3). */
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                "X-Tomba-Key": data.params.apiKey,
                "X-Tomba-Secret": data.params.secretKey,
            },
        }),
    },
    request: {
        baseUrl: "https://api.tomba.io/v1",
        headers: { Accept: "application/json" },
    },
    // the vendor's own advice: "set a client timeout of at least 180
    // seconds" — searches and verifications are live SMTP / web lookups
    timeouts: { requestMs: 180_000, runMs: 200_000 },
    usage: {
        /** FOUR pools — Tomba's four balances (owner decision 2026-11-11,
         *  design D2). Each is drained by at least one endpoint. */
        credits: {
            search: {
                label: "Tomba search credits",
                description: "The search balance: finders, enrichment, " +
                    "phone lookups, company search, and similar companies.",
            },
            verification: {
                label: "Tomba verification credits",
                description: "The verification balance: email verifier.",
            },
            email_count: {
                label: "Tomba email count credits",
                description: "The email count balance: email count, email " +
                    "format, and location.",
            },
            sources: {
                label: "Tomba sources credits",
                description: "The sources balance: email sources.",
            },
        },
        /** The generic QUANTITIES default (design D27): the FREE and flat
         *  docs have nothing to count. Every metered doc states its own
         *  basis — there is no one collection key across them. */
        evidence: () => ({ counts: {} }),
    },
    output: {
        /** Tomba's error envelope `{errors: {type, message, code}}` →
         *  `{message, error_code, raw}` (design D4). */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.errors.message",
            );
            const type = utils.json.optionalGet(data.output, "$.errors.type");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Tomba API error",
                ...(typeof type === "string" ? { error_code: type } : {}),
                raw: data.output,
            };
        },
    },
});
