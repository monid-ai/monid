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
 */
export default defineEndpoint({
    meta: {
        displayName: "Fund Momentum Search Funds",
        summary: "Search actively-deploying VC funds by stage, " +
            "country, industry and recent closes.",
        description: "Search Fund Momentum's index of 1,100+ VC funds " +
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
            "Billed per fund returned, 1 credit (€0.01) each, minimum " +
            "1 — not a flat per-call price. An empty result still " +
            "costs the floor.",
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
            description: "1 credit per fund in `results`, minimum 1 " +
                "even on an empty match (the vendor's own floor).",
        },
        // The pre-run ceiling only: the real draw is rows actually
        // returned, settled from the vendor's receipt by the
        // provider's usage.consolidate (or, absent that, the engine's
        // derived fold over this same RESULT count once the call
        // completes). `limit` is the caller's own authorized cap;
        // omitting it authorizes up to the vendor's free-tier default
        // of 10 per call, which is the safe floor to quote here since
        // the actual per-key/per-day ceiling cannot be known without a
        // round trip.
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.body?.limit ?? 10 },
        }),
        // The settled fold when the provider's own usage.consolidate
        // claim is absent: count the funds actually in `results`
        // (never `matched`, which can run far ahead of what was
        // returned and billed).
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: utils.json.optionalLen(data.output, "$.results") ??
                    0,
            },
        }),
    },
});
