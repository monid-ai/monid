import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFundmomentumSearchFundsArgs } from "./schema/inputs.ts";

/**
 * `search_funds` — search actively-deploying VC funds by stage, country,
 * industry and recent closes. `slug` values on the returned funds are
 * not derivable from the display name — call this before `get_fund`
 * rather than guessing one.
 *
 * RE-VERIFIED LIVE 2026-10-17 (see provider.ts's top comment for the
 * full story): this connector's first PR modeled this as a flat
 * PER_CALL 1 credit. That was wrong — the vendor now (and, per the
 * live receipt, actually always did) bill agent-credit callers 1
 * credit (€0.01) PER FUND RETURNED, minimum 1 so an empty result still
 * costs the floor. The response shape also changed: a bare array of
 * funds is now always wrapped in an object (`results`, `returned`,
 * `matched`, `limit`, `max_limit`, `filters_applied`, and, when more
 * match than were returned, `truncated` + `next_offset` + `note`).
 * `usage.model` below is PER_UNIT against `Unit.RESULT` so the
 * engine's derived fold already matches the vendor's own per-row
 * price; `usage.consolidate` on the provider still settles from the
 * vendor's own `_meta.credits_charged` receipt when present, which is
 * authoritative over the fold (e.g. the one free tracer row mixed into
 * an unpaid caller's response, which is real data but not itself
 * billed).
 *
 * RE-VERIFIED LIVE AGAIN 2026-10-24/25, after the vendor's own "safe
 * default limit" fix: omitting `limit` now defaults to 10 for every
 * caller (including on credits), where it used to return every match
 * within the day's allowance — see schema/inputs.ts for the full
 * before/after. `estimate` below already assumed a default of 10, so
 * it needed no change; only the input schema's description was stale.
 * Also newly documented: an agent-credits key is capped at 150 funds
 * per key per UTC day IN TOTAL across calls, on top of the existing
 * per-call ceilings (free/keyless 10, Starter 50, Pro 250 with
 * `offset` paging) — this is a vendor-side quota this connector does
 * not pre-enforce, same posture as every other tier ceiling here.
 *
 * RE-VERIFIED LIVE AGAIN 2026-10-28, against the v1.9.0 release (a
 * fresh self-registered agent key, real calls, bodies captured
 * verbatim — see fixtures/). Four real changes:
 *   1. New optional `max_credits` (schema/inputs.ts) clamps `limit`
 *      down to what it can afford, never up.
 *   2. The vendor's own per-call receipt is now ALSO a documented,
 *      public field in the payload itself — `billing: {credits_
 *      charged, balance_after, next_page_cost, next_offset, payment_
 *      mode, credits_unreturned}` — alongside the pre-existing
 *      undocumented `_meta.credits_charged` this connector already
 *      reads in provider.ts. Live-verified the two are always equal
 *      for this endpoint, so provider.ts now prefers the documented
 *      one when present and falls back to the old field otherwise.
 *   3. **The empty-result 1-credit floor is GONE.** An empty match
 *      now charges 0 (confirmed live: `credits_charged: 0`, balance
 *      unchanged) — `usage.model.description` and the first `notes`
 *      entry below said otherwise and were wrong as of this release;
 *      both are corrected.
 *   4. A genuinely new "balance-bound" case: when the balance covers
 *      only PART of a requested page, the vendor silently shrinks
 *      `limit`/`returned` to what's affordable (`truncated_reason:
 *      "balance"`) and still charges for the reduced count, rather
 *      than refusing outright — distinct from running out entirely,
 *      which is a real HTTP 402 with `error_reason: "insufficient_
 *      credits"` and `nothing_charged: true` (live-verified; this
 *      connector's `lifecycle.start` in provider.ts already relays a
 *      real non-2xx untouched, so this needed no code change there,
 *      only the fixtures/tests to lock it in).
 *
 * Also newly documented 2026-10-28, found while re-verifying but NOT
 * a v1.9.0 change: a brand-new agent key (free credits granted, no
 * completed real payment yet) is held to the keyless ceiling, not the
 * agent-credits one above — `limit` max 10/call, `offset` rejected
 * outright — until it completes one real payment. See schema/
 * inputs.ts for the live-verified wording.
 *
 * Also found live, unrelated to this release and NOT yet relied on
 * anywhere in this connector: an exact repeat of a prior call's
 * arguments is served from an idempotency cache for free (`_meta.
 * idempotent_replay: true`, with the ORIGINAL call's now-stale
 * billing numbers echoed back verbatim) rather than re-run and
 * re-billed. provider.ts's `lifecycle.start` now zeroes the usage
 * claim when this flag is set, so a repeated call never gets double-
 * counted against the engine's own ledger even though the vendor
 * itself charged nothing for it.
 */
export default defineEndpoint({
    meta: {
        displayName: "Fund Momentum Search Funds",
        summary: "Search actively-deploying VC funds by stage, " +
            "country, industry and recent closes.",
        description: "Search Fund Momentum's index of 950+ VC funds " +
            "that have raised capital since September 2024, filtered " +
            "by funding stage, HQ country (spelled out, not an ISO " +
            "code), industry focus, and a 'closed on or after' date. " +
            "Returns each matching fund's name, country, funding " +
            "stage, fund size, industries and slug — the slug is " +
            "required by 'Get Fund Profile' and is not derivable from " +
            "the display name, so call this first. The response is an " +
            "object: `results` plus `matched` (total matches) and, " +
            "when the page did not cover every match, `truncated` and " +
            "`next_offset` for paging on.",
        docsUrl: "https://fundmomentum.vc/mcp",
        categories: ["funding-data"],
        notes: [
            "Billed per fund returned, 1 credit (€0.01) each — not a " +
            "flat per-call price. An empty result costs nothing " +
            "(the old 1-credit floor on a zero match was removed in " +
            "the vendor's 2026-10-28 release).",
            "`limit` defaults to 10 if omitted, for every caller " +
            "(changed 2026-10-24). Agent-credits callers are also " +
            "capped at 150 funds per key per UTC day in total, and " +
            "an optional `max_credits` (2026-10-28) can cap a single " +
            "call's spend further. A brand-new agent key with no " +
            "completed payment yet is held to the 10/call keyless " +
            "ceiling instead, with `offset` rejected outright.",
        ],
    },
    endpoint: "/mcp/search_funds",
    request: { method: "POST", path: "/_api/mcp" },
    input: {
        schema: {
            body: zFundmomentumSearchFundsArgs.extend({
                limit: zFundmomentumSearchFundsArgs.shape.limit.unwrap()
                    .min(1).optional(),
            }),
        },
        toRequest: ({ data }) => ({
            ...data.input,
            body: {
                jsonrpc: "2.0",
                method: "tools/call",
                params: {
                    name: "search_funds",
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
            label: "funds returned",
            description: "1 credit per fund in `results`. An empty " +
                "match costs nothing — the vendor removed its old " +
                "1-credit floor on zero results in the 2026-10-28 " +
                "release (live-verified).",
        },
        // The pre-run ceiling only: the real draw is rows actually
        // returned, settled from the vendor's receipt by the
        // provider's usage.consolidate (or, absent that, the engine's
        // derived fold over this same RESULT count once the call
        // completes). `limit` is the caller's own authorized cap;
        // omitting it authorizes up to the vendor's free-tier default
        // of 10 per call, which is the safe floor to quote here since
        // the actual per-key/per-day ceiling cannot be known without a
        // round trip. `max_credits` (added 2026-10-28) only ever
        // clamps `limit` DOWN, never up, so the tighter of the two is
        // always a valid upper bound.
        estimate: ({ data }) => {
            const limit = data.input.body?.limit ?? 10;
            const maxCredits = data.input.body?.max_credits;
            return {
                counts: {
                    RESULT: typeof maxCredits === "number"
                        ? Math.min(limit, maxCredits)
                        : limit,
                },
            };
        },
        // The settled fold when the provider's own usage.consolidate
        // claim is absent: count the funds actually in `results`
        // (never `matched`, which can run far ahead of what was
        // returned and billed) — EXCEPT on an idempotent replay
        // (provider.ts's lifecycle.start flags this in state), where
        // real results still come back but the vendor charged nothing
        // for them: zero the fold too, so this endpoint's own derived
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
