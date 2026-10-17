import { z } from "zod";

/**
 * `search_funds` tool arguments (fundmomentum.vc, re-verified live
 * 2026-10-17 against the vendor's own tool schema — see provider.ts for
 * what changed since this connector's first PR). Mirror carries
 * optionality only (D25): the vendor normalizes common spellings of
 * `stage`/`industry` server-side ("Pre-Seed" → `pre_seed`, "AI/ML" →
 * `ai_ml`), so this stays a plain string rather than a fabricated closed
 * enum — the real enum is not published. `country` is spelled out in
 * full here (not an ISO code, per the vendor's own docs). `limit`'s
 * bound is tier-dependent (keyless/free max 10, Starter 50, Pro 250,
 * agent credits unbounded up to the daily row budget) so only a floor
 * of 1 is enforced client-side at the binding in endpoint.ts; the vendor
 * rejects an over-tier value with a clear message rather than silently
 * clamping it. `z.looseObject`: vendor-forward keys ride through.
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
        "Maximum number of funds to return. Tier-dependent cap " +
            "(free/keyless default and max 10; higher on a paid key); " +
            "omit to receive every match within the caller's daily " +
            "allowance. The response's `matched` and `truncated` say " +
            "whether more exist.",
    ).optional(),
    offset: z.number().int().nonnegative().describe(
        "Number of matches to skip, for paging a truncated result " +
            "(use `next_offset` from the previous response). Agent " +
            "credits and Pro plans only; ignored on the free tier.",
    ).optional(),
});
