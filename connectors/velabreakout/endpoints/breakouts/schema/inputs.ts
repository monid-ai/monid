import { z } from "zod";
import { zLimit } from "../../../schema/common.ts";

/** The `group` enum, exactly as the OpenAPI lists it (2026-10-12) and
 *  as GET /groups returns the ids. */
export const BREAKOUT_GROUPS = [
    "ai_apps",
    "ai_models",
    "ai_labs",
    "ai_work",
    "open_models",
    "editor_extensions",
    "open_editor_extensions",
    "workplace_add_ons",
    "browser_extensions",
    "agent_skills",
    "agent_tools",
    "company_packages",
    "business_software",
    "web_technologies",
    "company_hiring",
    "company_buzz",
] as const;

/**
 * GET /breakouts query params — faithful mirror of the published
 * OpenAPI (optionality only, design D25). The price is flat per call,
 * so no knob is tightened at the binding.
 */
export const zBreakoutsQueryParams = z.object({
    group: z.enum(BREAKOUT_GROUPS).describe(
        "Which group to rank (ids from /groups): ai_apps (AI tokens an " +
            "app uses), ai_models (tokens a model serves a week), " +
            "ai_labs (each lab's share of all AI tokens), ai_work (open " +
            "jobs paying experts to train and test AI models), " +
            "open_models (open model downloads), editor_extensions and " +
            "open_editor_extensions (code editor extension installs), " +
            "workplace_add_ons (workplace suite add-on installs), " +
            "browser_extensions (browser extensions, measured by " +
            "reviews), agent_skills (agent skill installs a week), " +
            "agent_tools (MCP server downloads a week), company_packages " +
            "(downloads of a company's developer packages), " +
            "business_software (adoption on a business-spend panel), " +
            "web_technologies (websites running a technology), " +
            "company_hiring (open roles on a company's careers page), " +
            "company_buzz (points on a large tech news forum).",
    ),
    window_days: z.literal([7, 30, 90, 365]).describe(
        "Growth window in days: 7, 30, 90 or 365. Omit to use the " +
            "group's usual window (see `usual_window_days` in /groups).",
    ).optional(),
    limit: zLimit.optional(),
    min_size: z.enum(["median", "p75", "none"]).describe(
        "Size floor: only items at least as big as the group's median " +
            "(the default), its 75th percentile, or none. A floor keeps " +
            "tiny starts from dominating the ranking.",
    ).optional(),
    steady: z.boolean().describe(
        "When true, keep only items that are also up over a longer " +
            "window (12 months) — use it for 'steadily', 'sustained' or " +
            "'starting to' questions, to drop one-off spikes.",
    ).optional(),
}).strict();
