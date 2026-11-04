import { z } from "zod";

/**
 * `search_lps` tool arguments (fundmomentum.vc). LIVE-VERIFIED 2026-11-03
 * against a freshly self-registered agent key (25 free credits), right
 * after the vendor retired this tool's standalone LP Radar subscription
 * gate (see provider.ts's 2026-11-04 note) — the registration response
 * now lists `search_lps` on the same `tools_on_credits` set as
 * `search_funds`, `get_fund`, `get_changes`, `get_usage` and
 * `send_feedback`.
 *
 * `country` mirrors `check_lp_coverage`'s field of the same name: a
 * full name (e.g. "Germany") or a two-letter ISO code — not re-verified
 * independently here since both tools share one vendor-side LP filter.
 *
 * `lp_type`, UNLIKE `check_lp_coverage`'s mirrored free string (whose
 * doc comment notes the full list wasn't published at the time), IS
 * live-verified here as a real, server-enforced closed enum: an
 * unrecognized value is rejected outright, with the complete valid list
 * echoed back in the error body —
 *   `"Invalid value \"Not A Real Type\" for parameter \"lp_type\".
 *   Valid values: Pension fund, Insurer, Foundation / Endowment,
 *   University / Research, Bank, Public / State institution,
 *   Sovereign wealth fund, Fund-of-Funds, Asset manager / Investment
 *   firm, Family office / Holding, Corporate / Strategic, Impact
 *   investor, Investment vehicle, Individual / Angel, Institutional
 *   LP."`, `data: {error_reason: "invalid_args", checked_before_
 *   payment: true, no_payment_required: true}`
 * — so D25 calls for reproducing it as a real closed enum here, not a
 * mirrored string. This is the same posture send-feedback/schema/
 * inputs.ts already takes for its own server-enforced `tool_name` enum.
 *
 * `backs_emerging_managers` filters to LPs with at least one disclosed
 * emerging-manager-backed fund (`emerging_manager_funds >= 1` and
 * `backs_emerging_managers: true` on the returned rows).
 *
 * `limit` — live-verified default 10 when omitted, hard range 1-25,
 * and values above 25 are REJECTED outright, not clamped (live-
 * verified: `limit: 30` comes back as a body-level `invalid_args`
 * error — "Values above 25 are rejected rather than clamped. Narrow
 * the filters instead." — checked and refused before any credit is
 * touched: `checked_before_payment: true, no_payment_required: true`,
 * same "never charged for a bad call" guarantee every other tool here
 * carries). Unlike `search_funds`, no per-key daily total cap and no
 * `max_credits` field were found or are documented for this tool as of
 * this verification.
 *
 * Billing, live-verified: 1 credit (€0.01) per LP row actually
 * returned, read off `result._meta.credits_charged` exactly like
 * `search_funds` — an empty match (0 rows) costs nothing, and a
 * balance that only covers part of a page silently shrinks the page to
 * what's affordable (`truncated_reason: "balance"`) and charges only
 * for what came back, rather than refusing outright. Unlike
 * `search_funds`, this tool's responses carry NO in-payload `billing`
 * block (`_meta.credits_charged` is the only receipt as of this
 * verification), so provider.ts's documented-field preference never
 * applies here and it always falls back to the `_meta` reading — no
 * code change was needed there for this.
 *
 * UPDATE 2026-11-04 (later the same day as the verification above):
 * the vendor ADDED idempotency caching for this tool, closing the gap
 * first found when this file was written (an identical repeat used
 * to bill twice — live-verified at the time by firing the identical
 * `{country: "Germany", limit: 3}` call twice in a row and seeing
 * `credits_remaining` drop twice, with no `idempotent_replay` flag
 * either time). Re-verified live against a fresh agent key after the
 * fix: the second of two identical calls now comes back with `_meta.
 * idempotent_replay: true`, `replay_note`, and `originally_charged_
 * eur`, same shape as `search_funds`, and `credits_remaining` is
 * unchanged by the repeat. `../endpoint.ts`'s `usage.evidence` now
 * zeroes its fold on that flag, mirroring `search-funds/endpoint.ts`'s
 * own check — provider.ts's state flag is generic per-tool and needed
 * no code change to start firing here.
 *
 * `z.looseObject`: vendor-forward keys ride through, same as every
 * other endpoint here.
 */
export const zFundmomentumSearchLpsArgs = z.looseObject({
    country: z.string().describe(
        "LP HQ country — a full name (e.g. 'Germany') or a two-letter " +
            "ISO code.",
    ).optional(),
    lp_type: z.enum([
        "Pension fund",
        "Insurer",
        "Foundation / Endowment",
        "University / Research",
        "Bank",
        "Public / State institution",
        "Sovereign wealth fund",
        "Fund-of-Funds",
        "Asset manager / Investment firm",
        "Family office / Holding",
        "Corporate / Strategic",
        "Impact investor",
        "Investment vehicle",
        "Individual / Angel",
        "Institutional LP",
    ]).describe(
        "LP type. Server-enforced closed list, live-verified — an " +
            "unrecognized value is rejected outright (checked before " +
            "any credit is touched), not normalized like " +
            "`search_funds`'s `stage`/`industry`.",
    ).optional(),
    backs_emerging_managers: z.boolean().describe(
        "Filter to LPs that have backed at least one emerging " +
            "manager (`emerging_manager_funds >= 1` on the returned " +
            "rows).",
    ).optional(),
    limit: z.number().int().describe(
        "Maximum number of LPs to return. Defaults to 10 if omitted. " +
            "Hard range 1-25; a value above 25 is rejected outright, " +
            "not clamped (checked, and refused, before any credit is " +
            "charged). The response's `matched` and `truncated` say " +
            "whether more exist.",
    ).optional(),
});
