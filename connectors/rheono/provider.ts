import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

/**
 * Rheono (rheono.dev) — continuous, autonomous pentesting sold per surface.
 * The two integrated endpoints are the free front door: an instant read-only
 * posture check on any live URL, and the request that hands a domain to a
 * named researcher for the deeper probe. Both are FREE (0 credits; the free
 * check is the product's own lead offer, not a plan tier), keyless, and
 * read-only — nothing here writes to the target.
 *
 * NO AUTH: the endpoint is public by design (the MCP server and the free
 * check form on rheono.dev share it), so the connector declares a no-op
 * inject and an all-optional credential shape — nothing is required, the
 * injector resolves nothing, and the request egresses bare whether or not
 * a stray RHEONO_CREDENTIALS_API_KEY sits in the environment. The default
 * `{apiKey: required}` shape would wrongly demand a key.
 */
export default defineProvider({
    name: "rheono",
    meta: {
        displayName: "Rheono",
        summary: "Free read-only security checks on any live site or API.",
        description: "Read-only security checks on live web apps and APIs. " +
            "The instant check returns what is exposed right now: the TLS " +
            "handshake result, missing or weakened security headers, cookie " +
            "flags, server version disclosure, and conventionally exposed " +
            "admin, debug and environment paths, with each finding carrying " +
            "a severity and a plain-words detail line. For the deeper " +
            "read-only probe, request-pentest hands the domain to a named " +
            "researcher and the report arrives by email. Answers describe " +
            "public posture, not your code or data; nothing here changes " +
            "state on the target.",
        homepageUrl: "https://rheono.dev",
        docsUrl: "https://rheono.dev/docs/check-api",
        categories: ["security"],
        notes: [
            "Only submit a domain you own or are authorized to test; the " +
            "deeper probe is requested for a domain plus an email and runs " +
            "at about one request per second.",
            "Private, loopback and cloud-metadata addresses are refused, so " +
            "the check cannot be turned into a probe of your own network.",
            "Both endpoints are rate-limited per client; a 429 means the " +
            "budget is spent for this minute — wait for Retry-After.",
        ],
    },
    auth: {
        inject: ({ data }) => data.request,
        credentials: z.object({ apiKey: z.string().optional() }),
    },
    request: { baseUrl: "https://rheono.dev" },
    timeouts: { requestMs: 20_000, runMs: 25_000 },
    usage: {
        // FREE (designs D25/D27): the check is the vendor's own free offer —
        // no plan, no key, no meter. A future metered deep-run endpoint
        // would be a MODEL change on that endpoint, not a rate surprise.
        model: { kind: UsageModelKind.FREE },
    },
});
