import { z } from "zod";

/**
 * `send_feedback` tool arguments (fundmomentum.vc, added 2026-10-24
 * alongside `get_usage`). `category` defaults to `"other"` server-side
 * when omitted — the published set is the only four values; nothing else
 * is normalized or accepted. `tool_name`, when given, VERIFIED LIVE
 * 2026-10-25 to be a real closed enum, not a mirrored free string: an
 * unrecognized value is rejected outright ("Parameter \"tool_name\" must
 * be one of: search_funds, get_fund, get_changes, get_fund_signals,
 * get_gp_profile, match_startup, check_lp_coverage, search_lps,
 * get_usage, send_feedback, or omitted."), so this mirrors that exact
 * list rather than `z.string()` (D25 would otherwise call for a plain
 * string on an unpublished enum — this one is server-enforced and
 * confirmed, so it is reproduced as a closed enum instead).
 */
export const zFundmomentumSendFeedbackArgs = z.looseObject({
    message: z.string().min(1).max(1000).describe(
        "The feedback text, up to 1000 characters.",
    ),
    category: z.enum(["bug", "data_issue", "missing_feature", "other"])
        .describe(
            "What kind of feedback this is. Defaults to 'other' " +
                "server-side when omitted.",
        ).optional(),
    tool_name: z.enum([
        "search_funds",
        "get_fund",
        "get_changes",
        "get_fund_signals",
        "get_gp_profile",
        "match_startup",
        "check_lp_coverage",
        "search_lps",
        "get_usage",
        "send_feedback",
    ]).describe(
        "Which Fund Momentum tool this feedback is about, if any. Must " +
            "be one of Fund Momentum's own tool names exactly — an " +
            "unrecognized value is rejected, not accepted as free text.",
    ).optional(),
});
