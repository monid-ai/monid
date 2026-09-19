import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zOrbitSearchBody } from "./schema/inputs.ts";

/**
 * `POST /v3/search` — find people, and come back with their context.
 *
 * ASYNC. The submit answers `202` with a snapshot carrying `search_id` and
 * `status: "running"`; the lifecycle polls `GET /v3/search/{search_id}` until
 * the status is terminal, so ONE monid run returns finished work. A search
 * that Orbit can answer from what it already knows answers `200` on the
 * submit and settles without a single poll.
 *
 * WHY THE POLL WATCHES: the public snapshot reports what a search FOUND, and
 * Orbit's rate card prices what a search BUILT. A result that arrives `ready`
 * was there to be read; a result seen `generating` or `enriching` on any tick
 * is one Orbit worked on, and that is the line that draws 5 or 10 credits.
 * The poll therefore accumulates the ids it observed mid-build into the
 * fn-owned `state.data.built` bag — which is exactly what that bag is for:
 * billing signals, never payloads — and `evidence` settles the depth line
 * from it.
 *
 * That derivation is a TRUE LOWER BOUND, deliberately. A profile built
 * entirely between two ticks is only ever seen `ready`, so it settles as an
 * index hit. Scaling the count up to cover it would invent work we did not
 * observe, and D27 is explicit that unobserved entries are omitted rather
 * than guessed. The exact fix is a vendor claim: the moment an Orbit snapshot
 * carries its own settled charge, a `usage.consolidate` reading that field
 * wins over this fold and the bound stops mattering.
 *
 * ESTIMATE IS THE CEILING the caller authorized, and it is worth reading
 * before running: `limit: 100, profile_depth: "full"` authorizes up to 1,010
 * credits, because every one of those hundred people might be a profile Orbit
 * has to build from live sources. Typical searches settle far below it —
 * `limit: 10` at partial depth over people Orbit can answer for is 1 credit —
 * and the gap between the two numbers is the whole reason `estimate` exists.
 */
export default defineEndpoint({
    meta: {
        displayName: "Orbit People Search",
        summary:
            "Find people and get the deepest available context about each one.",
        description: "Find people and come back with deep, source-backed " +
            "context about each of them. Describe who you want in plain " +
            "English (`the founder of Anthropic`, `machine learning " +
            "engineers in Brooklyn who write about music`), pass structured " +
            "criteria in `intent`, or hand over what you already know in " +
            "`signals` — an email, a phone number, a street address, a " +
            "profile URL, a social handle. Any one of `query`, `intent` or " +
            "`signals` is enough, and they combine. Each ready result " +
            "carries identity and contact fields plus generated sections on " +
            "the person's background, interests and recent activity, every " +
            "claim attributed to the source it came from. `profile_depth` " +
            "picks how deep to go: `partial` answers in seconds, `full` " +
            "builds the deepest profile Orbit can and takes minutes. Set " +
            "`candidate_discovery: true` when a signal belongs to several " +
            "people — an address, a shared phone — and you want each of " +
            "them resolved. Reach for this the moment a person becomes the " +
            "subject — a name the user dropped in passing, a prospect " +
            "before outreach, a candidate or counterparty under diligence, " +
            "or the people behind a company you are researching (name the " +
            "employer in `intent` and Orbit returns its people). This " +
            "endpoint runs the whole search and returns the finished " +
            "snapshot. Pricing follows the " +
            "results: 1 credit per 10 people returned from the Orbit index, " +
            "1 per person candidate discovery resolves, and 5 (partial) or " +
            "10 (full) for each profile Orbit builds for you. Read " +
            "`estimate` before a large or full-depth run.",
        docsUrl: "https://docs.orbitsearch.com/api/search/search",
        categories: ["people-enrichment"],
    },
    request: { method: "POST", path: "/v3/search" },
    input: {
        schema: {
            // Orbit's own documented defaults, applied at the binding (D25 —
            // the mirror carries optionality only). `limit` and
            // `candidate_discovery_limit` are the limiting knobs, and both
            // are vendor-published, so the estimate reads a concrete cap
            // without a house constant.
            body: zOrbitSearchBody.extend({
                candidate_discovery: zOrbitSearchBody.shape.candidate_discovery
                    .unwrap().default(false),
                candidate_discovery_limit: zOrbitSearchBody.shape
                    .candidate_discovery_limit.unwrap().default(10),
                profile_depth: zOrbitSearchBody.shape.profile_depth.unwrap()
                    .default("partial"),
                include_profile: zOrbitSearchBody.shape.include_profile.unwrap()
                    .default(true),
                limit: zOrbitSearchBody.shape.limit.unwrap().default(20),
            }),
        },
    },
    /** A full-depth search over a hundred people builds profiles from live
     *  sources; 15 minutes is the whole-run budget that work lives inside.
     *  The individual requests are fast. */
    timeouts: { requestMs: 60_000, runMs: 900_000, pollMs: 5_000 },
    lifecycle: {
        /** The billing signal threaded between ticks: every profile id this
         *  run has seen Orbit working on. */
        state: z.strictObject({
            built: z.array(z.string()).describe(
                "Profile ids observed mid-build on some tick — the results " +
                    "Orbit built rather than read.",
            ),
            statusPath: z.string().optional().describe(
                "The status route Orbit named in `links.status`.",
            ),
        }),
        start: async ({ data, utils, logger }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":submit",
                },
            });
            if (res.status < 200 || res.status >= 300) {
                // Vendor non-2xx is DATA, zero-billed by the engine:
                // 400 bad input, 402 out of credits, 403 scope, 429 limit.
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const searchId = utils.json.optionalGet(res.body, "$.search_id");
            if (typeof searchId !== "string" || searchId === "") {
                throw new Error("Orbit did not return a search_id");
            }
            // `results` is REQUIRED on a v3 snapshot. A 2xx without it is
            // exactly as broken as a 2xx without `search_id` — and silently
            // tolerating it would settle a real search at zero, because
            // every count this endpoint bills is derived from these rows.
            // Infrastructure failure, not data.
            const results = utils.json.optionalGet(res.body, "$.results");
            if (!Array.isArray(results)) {
                throw new Error("Orbit search snapshot carried no results");
            }
            const built = [];
            {
                for (const row of results) {
                    const id = utils.json.optionalGet(row, "$.profile_id");
                    const state = utils.json.optionalGet(row, "$.status");
                    if (
                        typeof id === "string" &&
                        (state === "generating" || state === "enriching")
                    ) built.push(id);
                }
            }
            // The v3 contract tells callers to poll `links.status`.
            const link = utils.json.optionalGet(res.body, "$.links.status");
            const statusPath =
                typeof link === "string" && link.charAt(0) === "/"
                    ? link
                    : "/v3/search/" + encodeURIComponent(searchId);
            const status = utils.json.optionalGet(res.body, "$.status");
            const state = {
                externalRunId: searchId,
                data: { built, statusPath },
            };
            if (status === "failed") {
                // A search that fails on the submit reports its reason at
                // `candidate_discovery_failure`, where the provider's
                // fromError does not look — so it is lifted into Orbit's own
                // error envelope here, exactly as the poll does it. Handing
                // the snapshot back raw would publish the generic fallback
                // message and strand the real reason in `raw`.
                const failure = utils.json.optionalGet(
                    res.body,
                    "$.candidate_discovery_failure",
                );
                const message = utils.json.optionalGet(
                    failure ?? null,
                    "$.message",
                );
                const code = utils.json.optionalGet(failure ?? null, "$.code");
                logger.warn("orbit search failed on submit", { searchId });
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: res.status,
                    output: {
                        status: "failed",
                        error: {
                            code: typeof code === "string"
                                ? code
                                : "search_failed",
                            message:
                                typeof message === "string" && message !== ""
                                    ? message
                                    : "Orbit search failed",
                        },
                        search_id: searchId,
                    },
                    state,
                };
            }
            if (status !== "running") {
                // A search over people Orbit can already answer for never
                // goes RUNNING at all.
                logger.info("orbit search settled on submit", {
                    searchId,
                    status: String(status),
                });
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                    state,
                };
            }
            return { kind: "RUNNING", state };
        },
        poll: async ({ data, utils, logger }) => {
            const searchId = data.lifecycle.state.externalRunId;
            if (searchId === undefined) {
                throw Object.assign(
                    new Error("orbit search poll without externalRunId"),
                    { retriable: false },
                );
            }
            const previous = data.lifecycle.state.data;
            const res = await utils.http({
                method: "GET",
                path: previous?.statusPath ??
                    "/v3/search/" + encodeURIComponent(searchId),
            });
            if (res.status === 408 || res.status === 429 || res.status >= 500) {
                // The status LOOKUP failed, not the search. Orbit's error
                // guide puts 429 and every temporary server failure in one
                // retry class, so the whole 5xx range is held rather than a
                // hand-picked four — a 501 or 520 from a proxy is the same
                // "could not read the state" answer. The search keeps running
                // and keeps drawing credits, so settling here would abandon
                // work Orbit still bills us for. Bounded by runMs.
                //
                // `Retry-After` is in SECONDS on Orbit's 429s, and the v3
                // contract asks callers to honor it; a malformed or absent
                // header falls back to a fixed backoff, and the value is
                // clamped so a bad header cannot stall the run.
                const after = Number(res.headers["retry-after"]);
                const pollAfterMs = Number.isFinite(after) && after > 0
                    ? Math.min(Math.max(after * 1000, 1_000), 120_000)
                    : 15_000;
                logger.warn("orbit search status lookup transient", {
                    searchId,
                    status: res.status,
                    pollAfterMs,
                });
                return { kind: "RUNNING", pollAfterMs };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            // WHOLE-STATE semantics (D21): the returned state replaces the
            // previous one wholesale, so earlier ids are carried by hand.
            const built = (previous?.built ?? []).slice();
            const results = utils.json.optionalGet(res.body, "$.results");
            if (!Array.isArray(results)) {
                throw new Error("Orbit search snapshot carried no results");
            }
            {
                for (const row of results) {
                    const id = utils.json.optionalGet(row, "$.profile_id");
                    const state = utils.json.optionalGet(row, "$.status");
                    if (
                        typeof id === "string" && !built.includes(id) &&
                        (state === "generating" || state === "enriching")
                    ) built.push(id);
                }
            }
            const next = {
                externalRunId: searchId,
                data: { built, statusPath: previous?.statusPath },
            };
            const status = utils.json.optionalGet(res.body, "$.status");
            if (status === "running" || status === undefined) {
                return { kind: "RUNNING", state: next };
            }
            if (status === "failed") {
                // The SEARCH failed while the status route answered 200
                // perfectly well — ours/theirs (design D12). Shaped like
                // Orbit's own error envelope so the provider's fromError
                // maps it with one mapper.
                logger.warn("orbit search failed", { searchId });
                const failure = utils.json.optionalGet(
                    res.body,
                    "$.candidate_discovery_failure",
                );
                const message = utils.json.optionalGet(
                    failure ?? null,
                    "$.message",
                );
                const code = utils.json.optionalGet(failure ?? null, "$.code");
                return {
                    kind: "COMPLETED",
                    httpStatus: 500,
                    providerHttpStatus: 200,
                    output: {
                        status: "failed",
                        error: {
                            code: typeof code === "string"
                                ? code
                                : "search_failed",
                            message:
                                typeof message === "string" && message !== ""
                                    ? message
                                    : "Orbit search failed",
                        },
                        search_id: searchId,
                    },
                    state: next,
                };
            }
            // `completed` and `completed_with_errors` both DELIVERED people,
            // and Orbit charges for what it delivered — both settle as the
            // success they are, with the vendor's snapshot handed back whole.
            logger.info("orbit search settled", {
                searchId,
                status: String(status),
            });
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: res.body,
                state: next,
            };
        },
    },
    usage: {
        /** Orbit's published rate card (`GET /v2/developer/pricing`, version
         *  2026-09-17) as the billing algebra: a search settles the sum of
         *  the work it actually did. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                index_search: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    every: 10,
                    consumes: { credit: "default", amount: 1 },
                    label: "search results",
                    description:
                        "people the search returned from the Orbit index, " +
                        "charged in blocks of ten",
                },
                candidate_discovery: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 1 },
                    label: "candidates discovered",
                    description:
                        "additional people resolved from an address, email " +
                        "or phone number that belongs to several of them",
                },
                partial_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 5 },
                    label: "partial profiles built",
                    description:
                        "profiles Orbit built to partial depth for this search",
                },
                full_profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 10 },
                    label: "full profiles built",
                    description:
                        "profiles Orbit built to full depth for this search",
                },
            },
        },
        /** THE CEILING the caller authorized. `limit` bounds the index
         *  results and `candidate_discovery_limit` the discovered ones; the
         *  depth line assumes the worst honest case, that every person the
         *  search returns is one Orbit has to build. `candidate_discovery`
         *  stays 0 here because the depth line dominates it per result —
         *  Orbit charges a discovered person as a BUILD when it builds one,
         *  and counting both would price the same person twice. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const discovered = body.candidate_discovery
                ? body.candidate_discovery_limit
                : 0;
            const people = body.limit + discovered;
            const depth = body.profile_depth === "full"
                ? "full_profile"
                : "partial_profile";
            return {
                counts: {
                    index_search: body.limit,
                    [depth]: people,
                },
            };
        },
        /** Settles on the TERMINAL snapshot, following Orbit's own precedence
         *  — a built profile bills at its depth, and a person discovery
         *  merely resolved bills 1:
         *
         *    index_search  every non-failed result the index answered for
         *                  (`sources` carries "search"), in blocks of ten
         *    depth line    results this run observed mid-build
         *    discovery     the remaining results carrying "candidate_discovery"
         *
         *  `built` comes from the poll's observations rather than from the
         *  snapshot, because the snapshot reports what a search FOUND and
         *  never says which of those people it had to build. */
        evidence: ({ data, utils }) => {
            const observed = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.built",
            );
            const built = Array.isArray(observed)
                ? observed.map((id) => String(id))
                : [];
            const rows = utils.json.optionalGet(data.output, "$.results");
            // The REQUEST states the depth. The snapshot echoes it, but the
            // request is what Orbit priced the work against and it carries a
            // bound default, so it is the field to read.
            const depth = data.input.body.profile_depth === "full"
                ? "full_profile"
                : "partial_profile";
            let indexed = 0;
            let discovered = 0;
            let builtDelivered = 0;
            if (Array.isArray(rows)) {
                for (const row of rows) {
                    const status = utils.json.optionalGet(row, "$.status");
                    if (status === "failed") continue;
                    const id = utils.json.optionalGet(row, "$.profile_id");
                    const origins = utils.json.optionalGet(row, "$.sources");
                    const names = Array.isArray(origins)
                        ? origins.map((origin) => String(origin))
                        : [];
                    // "Candidate Discovery results are excluded from the
                    // cached-result count" (Orbit's credits page). `sources`
                    // is a UNION — a person found both ways carries both
                    // origins — while Orbit bills the row against the single
                    // origin that created it. Reading any discovery marking
                    // as a discovery row keeps the two lines exclusive, which
                    // is the reading that cannot overcharge.
                    const fromDiscovery = names.includes("candidate_discovery");
                    if (!fromDiscovery && names.includes("search")) {
                        indexed += 1;
                    }
                    if (typeof id === "string" && built.includes(id)) {
                        builtDelivered += 1;
                    } else if (fromDiscovery) {
                        discovered += 1;
                    }
                }
            }
            return {
                counts: {
                    ...(indexed > 0 ? { index_search: indexed } : {}),
                    ...(discovered > 0
                        ? { candidate_discovery: discovered }
                        : {}),
                    ...(builtDelivered > 0 ? { [depth]: builtDelivered } : {}),
                },
            };
        },
    },
});
