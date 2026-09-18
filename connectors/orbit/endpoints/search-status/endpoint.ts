import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSearchStatusPathParams } from "./schema/inputs.ts";

/**
 * `GET /v3/search/{search_id}` — read a search.
 *
 * The second half of Orbit's search surface. `orbit#v3/search` runs a search
 * to a terminal status and settles the finished snapshot; this endpoint is
 * the same read the engine's poll performs on every tick, exposed so a caller
 * can drive the wait themselves — follow a long full-depth search, resume one
 * started in another session, or re-read a completed one.
 *
 * FREE. Orbit charges the search, and reading its snapshot draws nothing.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Search Status",
        summary: "Read a people search: its progress and the people found.",
        description: "Read a people search by id — its status, the people " +
            "found so far, and each of their profiles. Results are " +
            "append-only, so a person the search has already reported stays " +
            "reported and a ready result stays ready. `status` is `running` " +
            "while work continues, then `completed`, " +
            "`completed_with_errors`, or `failed`. Two flags say how much " +
            "of the work is done: `candidate_discovery_completed` marks the " +
            "result list final, and `profile_upgrades_completed` marks " +
            "every result as having reached the depth the search asked for. " +
            "Free — the search itself was already billed.",
        docsUrl: "https://docs.orbitsearch.com/api/search/search-status",
        categories: ["people-enrichment"],
    },
    request: { method: "GET", path: "/v3/search/{search_id}" },
    input: { schema: { pathParams: zSearchStatusPathParams } },
    timeouts: { requestMs: 30_000, runMs: 60_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
