import { defineProvider, presets } from "@shared/core";
import { z } from "zod";

/**
 * Fund Momentum (fundmomentum.vc) — agentic fundraising intelligence:
 * 1,100+ actively-deploying VC funds and 700+ disclosed LPs, plus GP
 * investor-signal profiles and AI-powered startup-to-fund matching.
 *
 * WIRE: every tool is JSON-RPC 2.0 over ONE endpoint, `POST /_api/mcp`
 * (`{jsonrpc, method: "tools/call", params: {name, arguments}, id}`), so
 * the HTTP shape is identical across tools and each endpoint.ts differs
 * only in `params.name` (`toRequest`, endpoint-level) and its own
 * argument schema. The vendor answers HTTP 200 even for a logical
 * failure (unknown/ambiguous slug, a bad argument) with the verdict in
 * an `error` object in the body instead of the transport status — the
 * declarative engine judges by transport status alone, so `lifecycle.
 * start` here takes over the one exchange for every endpoint (opoint /
 * dataforseo posture) and:
 *   - relays a real non-2xx (401 bad key, 402 exhausted agent credits,
 *     403 `lp_access_required`, 429 monthly quota) untouched — already
 *     a provider error, zero usage, no translation needed;
 *   - on 200 with a body-level `error`, synthesizes a mapped httpStatus
 *     (`error_reason` "not_found" → 404, "invalid_args" → 400, anything
 *     else → 502) over `providerHttpStatus` 200, so the engine's own
 *     zero-usage-on-provider-error rule fires — matching Fund
 *     Momentum's own "checked before payment, never charged" guarantee
 *     for exactly these two cases;
 *   - on 200 with no `error`, unwraps the MCP envelope: the real payload
 *     is a JSON-encoded string at `result.content[0].text`, parsed and
 *     returned as `output`.
 *
 * BILLING — CORRECTED 2026-10-17 after re-verifying live against the
 * vendor. This connector's first PR called `result._meta` "a running
 * balance/rate, not a draw" and skipped `usage.consolidate` entirely.
 * That was wrong: a fresh live call (`search_funds`, 3 funds returned,
 * agent paying on credits) answered
 * `_meta: {billing: "credits", cost: "€0.03", credits_charged: 3,
 * credits_remaining: 22, ...}` — `credits_charged` IS the real,
 * reusable per-call draw (the cloro pattern: relay a response header or
 * body field into `lifecycle.state`, then a provider-level
 * `usage.consolidate` reads it from state and settles there), not a
 * balance snapshot. `credits_remaining` is the balance; `credits_charged`
 * is the receipt. Every success response carries this `_meta` block
 * (verified on `search_funds`, `get_fund`, `get_changes`); it is never
 * part of the tool payload itself, so `lifecycle.start` reads it off
 * the raw body into `state` BEFORE discarding `result._meta`, and
 * `usage.consolidate` below is the vendor's own claim, authoritative
 * over each endpoint's own `usage.model` (which still has to be
 * declared, as the derived-fold fallback and the pre-run estimate
 * ceiling — see search-funds/endpoint.ts, now PER_UNIT per fund
 * returned instead of the flat PER_CALL this connector shipped with).
 * `check_lp_coverage` never carries `credits_charged` at all
 * (`_meta: {billing: "free", metered: false, ...}`) — consolidate skips
 * any endpoint whose own model is FREE, so its zero usage is never
 * second-guessed by an absent claim.
 *
 * RE-VERIFIED LIVE 2026-10-28, against the vendor's v1.9.0 release
 * (fresh self-registered agent key, real calls — see search-funds/
 * endpoint.ts for the full story). Two things change here:
 *   - `search_funds` now ALSO carries its billing receipt as a
 *     documented, public field in the payload itself — `billing.
 *     credits_charged` — alongside the pre-existing undocumented
 *     `_meta.credits_charged` read below. Live-verified twice that
 *     the two are always equal for this tool, so `lifecycle.start`
 *     now prefers the documented field when the parsed payload
 *     carries one, and falls back to the `_meta` reading for every
 *     other tool (none of which have a `billing` block as of this
 *     release).
 *   - An exact repeat of a prior call's arguments comes back from an
 *     idempotency cache for free — `_meta.idempotent_replay: true`,
 *     with the ORIGINAL call's now-stale credits_charged/billing
 *     numbers echoed back verbatim, not the vendor actually charging
 *     again. Found live, unrelated to v1.9.0. `lifecycle.start` now
 *     zeroes the usage claim whenever this flag is set, so a
 *     replayed call is never double-counted against the engine's own
 *     ledger on top of the vendor's own "nothing charged" guarantee.
 *
 * SCOPE (v1 + 2026-10-24 addition): the four original tools servable
 * without a payment-protocol integration or a second entitlement —
 * `search_funds`, `get_fund`, `get_changes`, `check_lp_coverage` — plus
 * two more vendor-side tools added 2026-10-24, `get_usage` and
 * `send_feedback`, both FREE like `check_lp_coverage` (no arguments or
 * credentials entitlement issue, so they slot in the same way: `usage.
 * consolidate` above already skips any FREE-model endpoint, no change
 * needed there for the two new ones). The three Pro signal tools
 * (`get_fund_signals`, `get_gp_profile`, `match_startup`) are still a
 * deliberate follow-up once pricing/entitlement posture for those is
 * settled.
 *
 * UPDATE 2026-11-04: `search_lps`'s billing/entitlement posture is now
 * settled, so it is no longer excluded above for that reason — it is
 * a deliberate follow-up only in the sense that it still needs its
 * own endpoint folder, not because anything about its billing is
 * unresolved. The vendor retired its standalone LP Radar subscription
 * (the `error_reason: "lp_access_required"` 403 this connector's
 * `lifecycle.start` already maps to httpStatus 403 above was that
 * gate; it no longer fires for this tool). `search_lps` is now billed
 * exactly like `search_funds` — PER_UNIT, 1 credit per LP row
 * returned, same `_meta.credits_charged` / `billing.credits_charged`
 * receipt shape already read above — so wiring it in needs no new
 * billing design, the same `usage.consolidate` and `lifecycle.start`
 * handling already cover it.
 */
export default defineProvider({
    name: "fundmomentum",
    meta: {
        displayName: "Fund Momentum",
        summary: "Agentic fundraising intelligence: actively-deploying " +
            "VC funds and disclosed LPs for founders and emerging " +
            "managers.",
        description: "Fundraising intelligence for founders and " +
            "emerging fund managers — search 1,100+ VC funds that have " +
            "raised capital since September 2024 by stage, country, and " +
            "industry; pull a full fund profile with GP background and " +
            "a provenance block (source, last-checked date, " +
            "confidence); poll only what changed since a timestamp " +
            "instead of re-searching; and check LP coverage by country " +
            "and LP type across 700+ disclosed limited partners " +
            "(counts only — full LP records, names included, are a " +
            "separate per-row-billed tool not yet wired into this " +
            "connector). Two more " +
            "tools are always free and never draw a credit: check your " +
            "own usage before a batch of calls, and send short " +
            "feedback on a tool or the data. Every fund profile is " +
            "primary research (GP blog posts, fund sites, published " +
            "interviews), not a scraped summary.",
        homepageUrl: "https://fundmomentum.vc",
        docsUrl: "https://fundmomentum.vc/mcp",
        categories: ["funding-data"],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://fundmomentum.vc" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    lifecycle: {
        state: z.strictObject({
            creditsCharged: z.number().nonnegative().optional(),
            // v1.9.0, carried for search-funds/endpoint.ts's usage.evidence
            // (see the lifecycle.start comment below): true only on an
            // idempotent-replay response, so that endpoint's evidence fold
            // can zero its own count too — a nonzero derived fold is what
            // the engine falls back to once a zeroed consolidate claim gets
            // pruned, so zeroing creditsCharged alone is not enough on its
            // own to land at zero total usage.
            idempotentReplay: z.boolean().optional(),
        }),
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const err = utils.json.optionalGet(res.body, "$.error");
            if (err !== undefined) {
                const reason = utils.json.optionalGet(
                    res.body,
                    "$.error.data.error_reason",
                );
                const status = reason === "not_found"
                    ? 404
                    : reason === "invalid_args"
                    ? 400
                    : reason === "lp_access_required"
                    ? 403
                    : 502;
                return {
                    kind: "COMPLETED",
                    httpStatus: status,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            // `result._meta.credits_charged` is the vendor's own receipt
            // for THIS call (absent on a FREE-tier tool like
            // check_lp_coverage). Read it off the raw body now, before
            // `result._meta` is discarded below, and carry it in
            // lifecycle state for usage.consolidate — it never rides in
            // the tool payload itself.
            const creditsCharged = utils.json.optionalNum(
                res.body,
                "$.result._meta.credits_charged",
            );
            // Found live 2026-10-28, unrelated to v1.9.0: `_meta.
            // idempotent_replay` marks a cached-and-free repeat of an
            // identical prior call (see the effectiveCreditsCharged
            // comment below for why this needs to be read now).
            const idempotentReplay = utils.json.optionalGet(
                res.body,
                "$.result._meta.idempotent_replay",
            ) === true;
            const text = utils.json.optionalGet(
                res.body,
                "$.result.content[0].text",
            );
            const parsed = typeof text === "string"
                ? JSON.parse(text)
                : res.body;
            // v1.9.0 added `billing.credits_charged` inside the parsed
            // payload itself — the vendor's now-documented public
            // receipt (search_funds only, so far). Prefer it over the
            // undocumented `_meta` reading above when present; they're
            // live-verified to always agree when both exist.
            const billingCreditsCharged = utils.json.optionalNum(
                parsed,
                "$.billing.credits_charged",
            );
            const effectiveCreditsCharged = idempotentReplay
                // Found live, unrelated to v1.9.0: a repeated call is
                // served from cache with the ORIGINAL call's stale
                // credits_charged echoed back, but the vendor charged
                // nothing this time — never claim usage for it. (This
                // alone only gets consolidate's own claim to zero, which
                // the engine then PRUNES and falls back to the derived
                // fold over the real results — still carrying the flag
                // into state below is what lets an endpoint's own
                // usage.evidence zero that fold too; search-funds/
                // endpoint.ts does.)
                ? 0
                : billingCreditsCharged ?? creditsCharged;
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: parsed,
                ...(effectiveCreditsCharged !== undefined || idempotentReplay
                    ? {
                        state: {
                            data: {
                                ...(effectiveCreditsCharged !== undefined
                                    ? {
                                        creditsCharged: effectiveCreditsCharged,
                                    }
                                    : {}),
                                ...(idempotentReplay
                                    ? { idempotentReplay: true }
                                    : {}),
                            },
                        },
                    }
                    : {}),
            };
        },
    },
    usage: {
        credits: { default: { label: "Fund Momentum credits" } },
        // The vendor's own claim (design D27), read out of lifecycle
        // state rather than the output payload (see the WIRE note
        // above: it never rides there). Skipped for a FREE-model
        // endpoint (check_lp_coverage) so an absent claim can never
        // second-guess its structurally-enforced zero usage; every
        // other endpoint falls back to its own model's derived fold
        // when, for whatever reason, this claim is absent.
        consolidate: ({ data, utils }) => {
            if (data.usage.model.kind === "FREE") return { credits: {} };
            const creditsCharged = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.creditsCharged",
            );
            return {
                credits: {
                    ...(typeof creditsCharged === "number"
                        ? { default: creditsCharged }
                        : {}),
                },
            };
        },
    },
});
