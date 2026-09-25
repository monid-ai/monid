import { z } from "zod";

const FEEDBACK_CATEGORIES = [
    "bug",
    "friction",
    "missing_capability",
    "docs",
    "billing",
    "feature",
    "other",
] as const;

const FEEDBACK_SEVERITIES = ["low", "medium", "high", "blocker"] as const;

export const zZenschedFeedbackSubmitBody = z.object({
    title: z.string().min(1).max(200).describe(
        "Short summary of the feedback.",
    ),
    body: z.string().min(1).max(8000).describe(
        "What went wrong, what you expected, or what would help.",
    ),
    category: z.enum(FEEDBACK_CATEGORIES).optional().describe(
        "Feedback category: bug, friction, missing_capability, docs, " +
            "billing, feature, or other. Defaults to other.",
    ),
    severity: z.enum(FEEDBACK_SEVERITIES).optional().describe(
        "Impact level: low, medium, high, or blocker. Defaults to medium.",
    ),
    context: z.string().max(4000).optional().describe(
        "Optional error text, tool output, or session context.",
    ),
    related_tool: z.string().max(64).optional().describe(
        "Optional MCP tool name this feedback relates to.",
    ),
}).strict();
