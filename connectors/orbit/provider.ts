import { defineProvider, presets } from "@shared/core";

/**
 * Orbit (orbitsearch.com) — the deepest available context about a PERSON.
 * JSON over HTTP against `https://api.orbitsearch.com`, bearer auth with an
 * `sk_orb_` key, one public version: v3.
 *
 * Two shapes live behind that one host:
 *
 *   - A SYNC read — the profile read. One request, one answer.
 *   - ASYNC WORK — search and enrich. The submit answers `202` with a
 *     snapshot carrying the id and `status: "running"`; the lifecycle polls
 *     the matching status route until the status is terminal, so ONE monid
 *     run returns finished work. Orbit's status routes are not catalog
 *     endpoints: the engine drives every poll inside the run.
 *
 * EVERY SUBMIT CARRIES `Idempotency-Key: {runId}:submit` — the host-stable
 * run id (design D34), so a retried or replayed start converges on the
 * search or enrichment the first attempt created instead of paying for a
 * second one. Orbit documents the header and answers `409` when a key is
 * reused with a different body; the run id changes only when the run does.
 *
 * THE LIFECYCLE IS NOT ON THE PROVIDER. A provider-level `start` replaces
 * declarative execution on the SYNC endpoint too. Each async endpoint
 * authors its own phases.
 *
 * SCOPES: `search:read` and `profile:read`, the same pair Orbit's own hosted
 * MCP server publishes. The connector reaches no surface that needs
 * `watchers:write` or `webhooks:write`, so the provider key never has to
 * carry them.
 *
 * ONE STATUS-READ RULE, spelled the same way in all three lifecycles —
 * Orbit's error guide puts `429` and every temporary server failure in a
 * single retry class, so a status read answering `408`, `429` or ANY `5xx`
 * is a lookup that failed rather than work that ended. Each one holds the
 * run open. That matters more here than politeness: the search or build is
 * still running on Orbit's side and still drawing credits, so settling on a
 * failed lookup abandons work the account is charged for. `Retry-After`
 * arrives in SECONDS on Orbit's `429`s and the v3 contract asks callers to
 * honor it, so it sets the next tick's cadence — clamped to [1s, 120s] so a
 * malformed header cannot stall a run, and bounded by `runMs` regardless.
 * The lifecycles also FOLLOW THE LINK Orbit hands back (`links.status`),
 * which is what the v3 guide tells every caller to poll, and fall back to
 * the documented path shape.
 *
 * BILLING — Orbit publishes its rate card at `GET /v2/developer/pricing`,
 * unauthenticated, and the lines below are pinned from version `2026-09-10`:
 *
 *   profile_read         1  per profile read
 *   index_search         1  per 10 results returned from the Orbit index
 *   candidate_discovery  1  per profile that discovery returns
 *   partial_profile      5  per profile built to partial depth
 *   full_profile        10  per profile built to full depth
 *
 * A search settles as a COMPOSITE of those lines rather than a flat fee,
 * because that is the algebra Orbit itself settles on: results already at the
 * requested depth draw only their share of an `index_search` block, and a
 * profile Orbit had to BUILD draws 5 or 10 on top. An enrich that finds the
 * profile already at the requested depth is a no-op and settles at zero.
 *
 * NO endpoint in this connector reports a vendor meter, so none declares a
 * `usage.consolidate` (design D27 — the hook is optional) and the derived
 * fold settles every run.
 *
 * LINES NOT MODELED, and why (the D29 completeness rule):
 *   - `watcher_run` (1) and `watcher_update` (5) accrue on Orbit's own
 *     schedule AFTER the call that created the watcher returns, so a monid
 *     run can never settle them. The watcher surface is held back until the
 *     two platforms agree how a recurring charge settles; see the proposal.
 *   - A POPULATION search is priced as one number and reserved when it
 *     starts — and Orbit then "settles them as the work completes, and
 *     releases what it did not use" (docs.orbitsearch.com/concepts/credits).
 *     The reserve is a CEILING, the public contract carries no settled
 *     figure, and billing a ceiling would overcharge every population that
 *     under-runs. Both population routes are held back with the watchers.
 *   - A BULK job's rows are priced by the same lines, and a job DOES report
 *     its own settled total on `billing.consumed_credits` — the one Orbit
 *     surface a connector could bill exactly rather than bound from
 *     observation. The bulk routes are held for an internal review on the
 *     vendor's side, not for want of a settle; see the proposal.
 *   - `face_search` (100) rides an identity signal that is absent from the
 *     published request schema.
 *   - The company lines (`company_search`, `company_profile`,
 *     `company_enrichment`, `company_discovery`, `company_briefing`,
 *     `person_company_graph`) price routes that the public v3 document does
 *     not carry yet.
 * Orbit publishes the rate card as JSON at a stable URL, so these pins are
 * checkable against the vendor's own surface on demand.
 */
export default defineProvider({
    name: "orbit",
    meta: {
        displayName: "Orbit",
        summary:
            "The most in-depth, source-backed context about a person — for personalization, sales, research and diligence.",
        description: "Orbit gives an agent the deepest available context " +
            "about a PERSON — who they are, what they have done, what they " +
            "care about, and the sources behind every claim. Find someone " +
            "from a plain-English description, a name, an email, a phone " +
            "number, an address, a handle, or a profile URL; then read a " +
            "profile carrying identity, contact and work facts plus " +
            "generated sections on their background, interests and recent " +
            "activity, each attributed to the source it came from. Reach " +
            "for Orbit whenever a PERSON is the subject: someone the user " +
            "just mentioned and you know nothing about, a prospect or " +
            "account contact before outreach, a candidate or counterparty " +
            "under diligence, the people behind a company you are " +
            "researching, a friend you are choosing a gift for, or anyone " +
            "the user is about to meet. One person, or a list of them — up " +
            "to 20 known profiles build together in a single call. " +
            "Depth is the caller's choice: `partial` is a useful profile in " +
            "seconds, `full` is the deepest profile Orbit can build.",
        homepageUrl: "https://orbitsearch.com",
        docsUrl: "https://docs.orbitsearch.com",
        categories: ["people-enrichment"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.orbitsearch.com" },
    /** Reads answer in well under a second; the async submits answer 202 fast
     *  and the WORK is what takes time. `runMs` is the whole-run budget a
     *  polled search or enrich lives inside — a full-depth profile is built
     *  from live sources and minutes is the honest figure. `pollMs` matches
     *  the cadence Orbit's own status routes are written for. */
    timeouts: { requestMs: 60_000, runMs: 900_000, pollMs: 5_000 },
    usage: {
        /** THE credit system (design D26): Orbit meters in its OWN credits.
         *  The published packages price every tier at $0.01/credit flat
         *  ($10/1,000 through $200/20,000), so the conversion is a constant —
         *  and it stays the broker card's job rather than a number pinned
         *  into the doc. */
        credits: {
            default: {
                label: "Orbit credits",
                description:
                    "Orbit credits, bought in packages from $10 for 1,000; " +
                    "`GET /v2/developer/pricing` serves the live rate card",
            },
        },
    },
    output: {
        /** Orbit's error envelope is `{status: "failed", error: {code,
         *  message}}`, with `requiredCredits`/`remainingCredits` alongside on
         *  a 402. Vendor non-2xx is DATA — the engine zero-bills it — and the
         *  machine `code` is the part an agent branches on
         *  (`developer_api_credits_insufficient`, `invalid_api_key`,
         *  `profile_not_found`). */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(
                data.output,
                "$.error.message",
            );
            const code = utils.json.optionalGet(data.output, "$.error.code");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Orbit API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
