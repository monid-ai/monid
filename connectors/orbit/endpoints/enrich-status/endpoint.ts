import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zEnrichStatusPathParams } from "./schema/inputs.ts";

/**
 * `GET /v3/enrich/requests/{request_id}` — read one enrichment.
 *
 * The read half of the enrichment surface, and the route the engine's poll
 * calls on every tick for both `orbit#v3/enrich/{profile_id}` and
 * `orbit#v3/enrich` — exposed so a caller can follow a build themselves, or
 * read one started elsewhere. It answers for a batch child exactly as it does
 * for a single enrichment: one `request_id`, one profile, one status.
 *
 * FREE. Orbit charges the build; reading its progress draws nothing.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Enrichment Status",
        summary: "Read one profile build: its progress and the profile.",
        description: "Read one profile build by its `request_id` — the " +
            "status, the depth reached, and the profile itself once it is " +
            "ready. `status` is `running` while the build continues, then " +
            "`completed` or `failed`. Batch children answer here too: " +
            "`orbit#v3/enrich` returns one `request_id` per profile, and " +
            "each reads back through this route. Free — the build was " +
            "already billed.",
        docsUrl: "https://docs.orbitsearch.com/api/enrich/enrich-status",
        categories: ["people-enrichment"],
    },
    request: { method: "GET", path: "/v3/enrich/requests/{request_id}" },
    input: { schema: { pathParams: zEnrichStatusPathParams } },
    timeouts: { requestMs: 30_000, runMs: 60_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
