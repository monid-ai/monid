import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

/**
 * SalesBook (maxeds.org): a directory of technology companies that sell to
 * enterprises, ranked on a published methodology, published by MaxedS.
 *
 * Five synchronous, read-only JSON POSTs against
 * `https://mcp.maxeds.org/v1/tools/<tool>` (the REST twin of the SalesBook
 * MCP server; OpenAPI at https://mcp.maxeds.org/v1/openapi.json). The
 * vendor's write tools (corrections, listing updates, intro opt-ins, the
 * agent mailbox) are deliberately NOT ported: this connector only reads.
 *
 * KEYLESS. The API takes no credential, so the provider declares an EMPTY
 * credential shape and an identity `auth.inject`: the compiler requires
 * `inject` to resolve, the injector validates `{}` against `{}`, and the
 * request egresses exactly as built. No header, query parameter or cookie
 * is added.
 *
 * FREE. SalesBook charges nothing for any call, so usage is the FREE
 * model alone (tinyfish posture, D25/D27): the quantities fns are
 * compiler-synthesized and there is no vendor meter to consolidate.
 *
 * ENVELOPE. Every response is `{ text, isError }`. `text` is the tool's
 * answer as the vendor writes it (ranked lines with `source:` URLs, a
 * profile's sourced fields with their checked dates, or a ranking as a
 * JSON document in a string). It passes through untouched: no
 * `output.fromResponse`, so source URLs, as-of dates and the methodology
 * version reach the caller verbatim. Failures are non-2xx with
 * `isError: true` (400 bad input or unknown id, 429 the service-wide
 * daily cap, 503 maintenance): data, zero-billed.
 */
export default defineProvider({
    name: "salesbook",
    meta: {
        displayName: "SalesBook by MaxedS",
        summary: "Enterprise tech vendors ranked by sector on a published " +
            "methodology. Free, no key.",
        description: "SalesBook is a directory of technology companies " +
            "that sell to enterprises, ranked by sector (healthcare, " +
            "retail and CPG, manufacturing, education, cross-industry " +
            "and agentic commerce) on a published, versioned methodology. " +
            "Scores are built from dated public sources; search results " +
            "and profiles carry the source URLs SalesBook read, and the " +
            "connector passes them through as returned. Use it to " +
            "shortlist vendors for an enterprise " +
            "problem, read one company's sourced profile, pull a sector's " +
            "ranked list, find ranked alternatives to a vendor, or put 2 " +
            "to 5 vendors side by side. It covers companies, not people: " +
            "no contact details, no emails. Read-only and free.",
        homepageUrl: "https://maxeds.org/tools/salesbook",
        docsUrl: "https://mcp.maxeds.org/v1/openapi.json",
        categories: ["company-enrichment"],
        notes: [
            "Every response is `{ text, isError }`. `text` is the answer as " +
            "SalesBook writes it, with source URLs and checked dates where " +
            "SalesBook returns them and the methodology version it was " +
            "ranked under; cite those rather than restating a rank alone.",
            "Coverage is the ranked corpus, not the whole market. A company " +
            "SalesBook has not ranked is reported as missing: a 400 from " +
            "get_profile, a 200 saying so from find_alternatives and " +
            "compare_vendors.",
            "Free and keyless, with no guaranteed capacity. The service has " +
            "one daily call cap shared by every caller; past it, calls " +
            "answer 429 until midnight UTC.",
            "Search matches keywords and can be broad: a company sharing " +
            "one generic word with the query can be returned. Check each " +
            "match's description before relying on it.",
        ],
    },
    auth: {
        // keyless: the empty shape validates `{}` and the identity inject
        // returns the request untouched
        credentials: z.object({}),
        inject: ({ data }) => data.request,
    },
    request: { baseUrl: "https://mcp.maxeds.org" },
    // observed 0.2-0.7 s per call (2026-10-22); generous headroom for a
    // cold worker
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
