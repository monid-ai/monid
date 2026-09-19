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

export const zZenschedFeedbackSubmitBody = z.object({
    category: z.enum(FEEDBACK_CATEGORIES).describe(
        "Feedback category: bug, friction, missing_capability, docs, " +
            "billing, feature, or other.",
    ),
    text: z.string().min(1).max(8000).describe(
        "What went wrong, what you expected, or what would help.",
    ),
    context: z.string().max(8000).optional().describe(
        "Optional error text, tool output, or session context.",
    ),
    related_tool: z.string().max(200).optional().describe(
        "Optional MCP tool name this feedback relates to.",
    ),
}).strict();
