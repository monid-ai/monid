import { z } from "zod";

/**
 * `search_funds` tool arguments (fundmomentum.vc, RE-VERIFIED LIVE
 * 2026-10-28 against the v1.9.0 release — see provider.ts and
 * ../endpoint.ts for the full story). Mirror carries optionality only
 * (D25): the vendor normalizes common spellings of `stage`/`industry`
 * server-side ("Pre-Seed" → `pre_seed`, "AI/ML" → `ai_ml`), so this
 * stays a plain string rather than a fabricated closed enum — the real
 * enum is not published. `country` is spelled out in full here (not an
 * ISO code, per the vendor's own docs).
 *
 * `limit` — CHANGED 2026-10-24 ("safe default limit" fix): omitting it
 * now defaults to 10 for EVERY caller, including an agent paying on
 * credits (this connector's first PR, and its 2026-10-17 correction,
 * both still said omitting it returned every match within the day's
 * allowance — that was true before this date and is not anymore).
 * The tier ceiling above the default is unchanged and still
 * REJECTED, not clamped, when exceeded: free/keyless max 10/call,
 * Starter max 50/call, Pro max 250/call with `offset` paging, and an
 * agent-credits key up to 150 funds per key per UTC day in total
 * (across calls — not a per-call cap). Only a floor of 1 is enforced
 * client-side at the binding in endpoint.ts; everything above is the
 * vendor's own rejection.
 *
 * NEWLY DOCUMENTED 2026-10-28, not a v1.9.0 change but a previously
 * unrecorded tier boundary found while re-verifying live: a brand-new
 * agent key — free credits granted, but with no completed real
 * on-chain payment yet — is held to the SAME ceiling as a keyless
 * caller, not the agent-credits ceiling described above: `limit` max
 * 10/call (rejected above that, live-verified: "limit 15 is above the
 * 10-result cap for callers without a paid account"), and `offset` is
 * rejected outright ("offset is only available to paying callers
 * (agent credits after a completed payment, Pro)"). The higher
 * agent-credits ceiling (150/day, `offset` paging) only applies once
 * that key has a completed payment on it.
 *
 * `max_credits` — ADDED in the v1.9.0 release (2026-10-28): an
 * optional per-call spend ceiling, live-verified against the vendor.
 * It only ever clamps `limit` DOWN (never raises it), so pass both
 * freely. `z.looseObject`: vendor-forward keys ride through.
 */
export const zFundmomentumSearchFundsArgs = z.looseObject({
    stage: z.string().describe(
        "Funding stage, e.g. 'seed', 'pre_seed', 'series_a'. Common " +
            "spellings ('Pre-Seed') are normalized server-side.",
    ).optional(),
    country: z.string().describe(
        "Fund HQ country, spelled out in full (e.g. 'Germany'), not " +
            "an ISO code.",
    ).optional(),
    industry: z.string().describe(
        "Investment focus, e.g. 'ai_ml', 'climate_sustainability', " +
            "'b2b_saas'. Common spellings ('AI/ML') are normalized " +
            "server-side.",
    ).optional(),
    closed_since: z.string().describe(
        "Only funds whose latest published close (first, interim or " +
            "final close, or a launch) is on or after this date, ISO " +
            "'YYYY-MM-DD' (e.g. '2026-09-01'). Results then come " +
            "newest close first.",
    ).optional(),
    limit: z.number().int().describe(
        "Maximum number of funds to return. Defaults to 10 if omitted " +
            "— for every caller, including on credits (changed " +
            "2026-10-24; it used to return every match within the " +
            "day's allowance). Free/keyless max 10/call, Starter max " +
            "50/call, Pro max 250/call (page with 'offset'), and " +
            "agent-credits callers are additionally capped at 150 " +
            "funds per key per UTC day in total — but a brand-new " +
            "agent key with no completed payment yet is held to the " +
            "10/call keyless ceiling until it pays once. A value " +
            "above the caller's ceiling is rejected, not clamped. The " +
            "response's `matched` and `truncated` say whether more " +
            "exist.",
    ).optional(),
    offset: z.number().int().nonnegative().describe(
        "Number of matches to skip, for paging a truncated result " +
            "(use `next_offset` from the previous response). Agent " +
            "credits (after a completed payment) and Pro plans only " +
            "— rejected outright on the free tier and on an agent key " +
            "that has never completed a real payment.",
    ).optional(),
    max_credits: z.number().int().min(1).max(25).describe(
        "Added in v1.9.0 (2026-10-28). Caps what this one call may " +
            "spend: clamps `limit` DOWN to whatever this many credits " +
            "affords, never up. Integer 1-25; values above 25 are " +
            "silently clamped to 25 server-side, and 0, a negative " +
            "number, or a non-integer are rejected before anything " +
            "runs (`error_reason: 'invalid_args'`, nothing charged, " +
            "live-verified). Only meaningful for agent-credits " +
            "callers — ignored for Starter/Pro subscribers, who pay a " +
            "flat fee regardless.",
    ).optional(),
});
