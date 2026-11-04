import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFundmomentumSearchLpsArgs } from "./schema/inputs.ts";

/**
 * `search_lps` — search Fund Momentum's 700+ disclosed limited
 * partners by country, LP type, and whether they back emerging
 * managers. Call `check_lp_coverage` first (free, unmetered) to see
 * whether a filter combination is worth paying for before calling this.
 *
 * BUILT 2026-11-04, after provider.ts's SCOPE note was updated to drop
 * this tool from its exclusion list: the vendor retired `search_lps`'s
 * standalone LP Radar subscription and now bills it exactly like
 * `search_funds` for agent-credits callers — see schema/inputs.ts for
 * the full live-verification story (a fresh self-registered agent key,
 * real calls, real responses, dated 2026-11-03). Four things to note
 * relative to `search-funds/endpoint.ts`, which this mirrors:
 *   1. Same PER_UNIT-on-`Unit.RESULT` billing, 1 credit per LP row
 *      actually returned; an empty match costs nothing and a balance
 *      that only covers part of a page is shrunk to fit and charged
 *      only for what came back (`truncated_reason: "balance"`) rather
 *      than refused outright — both live-verified here too.
 *   2. UNLIKE `search_funds`, this tool's success responses carry no
 *      in-payload `billing` block — only the older, undocumented
 *      `result._meta.credits_charged` provider.ts already reads as
 *      its fallback. No provider.ts change was needed for this: it
 *      already prefers the documented field only when present and
 *      falls back to `_meta` otherwise.
 *   3. UPDATE 2026-11-04 (later the same day): the vendor ADDED
 *      idempotency caching for this tool too, closing the one real
 *      gap noted above when this was first written (an identical
 *      repeat used to bill twice, live-verified at the time against a
 *      fresh agent key). Re-verified live against another fresh key:
 *      an exact repeat now comes back with `_meta.idempotent_replay:
 *      true`, `replay_note`, and `originally_charged_eur`, same shape
 *      as `search_funds`, and the real balance is untouched by the
 *      repeat. provider.ts's `idempotentReplay` state flag is generic
 *      per-tool and needed no code change to start firing here; only
 *      this file's `usage.evidence` below (now mirroring `search-
 *      funds/endpoint.ts`'s own zeroing) and schema/inputs.ts needed
 *      updating.
 *   4. A real HTTP 402 on insufficient credits for THIS tool is a live
 *      MPP (micropayment) payment-required challenge
 *      (`application/problem+json`, a `WWW-Authenticate: Payment ...`
 *      challenge, `type: ".../problems/payment-required"`) — not the
 *      ad-hoc `{error: {data: {error_reason: "insufficient_credits",
 *      nothing_charged: true}}}` JSON-RPC body `search-funds/fixtures/
 *      insufficient-credits.json` documents for that tool. Both are a
 *      real non-2xx, so provider.ts's `lifecycle.start` relays either
 *      shape untouched without needing to know the difference — this
 *      is purely a fixture/body difference, live-verified by draining
 *      a fresh agent key's 25 free credits to zero and calling again.
 *
 * Also live-verified: `limit` above 25 is rejected outright (not
 * clamped) as a body-level `invalid_args` error, checked and refused
 * before any credit is touched — same client-side floor-of-1-only
 * posture as `search-funds/endpoint.ts` (the ceiling is left to the
 * vendor, same reasoning: the real per-key/per-day ceiling, if any,
 * cannot be known without a round trip, and none was found or
 * documented for this tool as of this verification).
 */
export default defineEndpoint({
    meta: {
        displayName: "Fund Momentum Search LPs",
        summary: "Search Fund Momentum's 700+ disclosed limited " +
            "partners by country, LP type, and emerging-manager " +
            "backing.",
        description: "Search Fund Momentum's index of 700+ disclosed " +
            "limited partners, filtered by HQ country (full name or " +
            "ISO code), LP type, and whether the LP backs emerging " +
            "managers. Returns each matching LP's name, type, HQ " +
            "country/city, geographic focus, website, emerging-" +
            "manager backing, and a warm-path flag. Call " +
            "`check_lp_coverage` first (always free) to check whether " +
            "a filter combination is worth paying for before calling " +
            "this.",
        docsUrl: "https://fundmomentum.vc/mcp",
        categories: ["funding-data"],
        notes: [
            "Billed per LP row returned, 1 credit (€0.01) each — not " +
            "a flat per-call price. An empty match costs nothing, " +
            "and a balance covering only part of a page is shrunk to " +
            "fit and charged only for what came back, rather than " +
            "refused outright.",
            "`limit` defaults to 10 if omitted, hard range 1-25; a " +
            "value above 25 is rejected outright, not clamped, and " +
            "never charged.",
            "An exact repeat of a prior call is a free idempotent " +
            "replay (added by the vendor 2026-11-04), same as " +
            "`search_funds` — not double-billed.",
        ],
    },
    endpoint: "/mcp/search_lps",
    request: { method: "POST", path: "/_api/mcp" },
    input: {
        schema: {
            body: zFundmomentumSearchLpsArgs.extend({
                limit: zFundmomentumSearchLpsArgs.shape.limit.unwrap()
                    .min(1).optional(),
            }),
        },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "search_lps",
                    arguments: data.input.body ?? {},
                },
                id: 1,
            },
        }),
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 1 },
            label: "LPs returned",
            description: "1 credit per LP in `results`. An empty " +
                "match costs nothing, live-verified 2026-11-03.",
        },
        // Pre-run ceiling only, same posture as search-funds/
        // endpoint.ts: the real draw is settled from the vendor's own
        // receipt (provider.ts's usage.consolidate) or, absent that,
        // the derived fold below over rows actually returned. `limit`
        // is the caller's own authorized cap; omitting it authorizes
        // the vendor's documented default of 10.
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.body?.limit ?? 10 },
        }),
        // The settled fold when provider.ts's own usage.consolidate
        // claim is absent: count the LPs actually in `results` (never
        // `matched`, which can run far ahead of what was returned and
        // billed) — EXCEPT on an idempotent replay (provider.ts's
        // lifecycle.start flags this in state, added 2026-11-04,
        // mirroring search-funds/endpoint.ts's own check), where real
        // results still come back but the vendor charged nothing for
        // them: zero the fold too, so this endpoint's own derived
        // count can't re-introduce the double-bill that zeroing
        // consolidate's claim alone cannot prevent (that claim, once
        // zero, is pruned by the engine and falls back to exactly this
        // fold).
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: utils.json.optionalGet(
                        data.lifecycle?.state ?? null,
                        "$.data.idempotentReplay",
                    ) === true
                    ? 0
                    : utils.json.optionalLen(data.output, "$.results") ?? 0,
            },
        }),
    },
});
