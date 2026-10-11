import { z } from "zod";
import { conversationFields } from "../../../schema/common.ts";

// Mirror of web_search tools/list (2026-10-11), no authored defaults.
export const zSearchBody = z.strictObject({
    objective: z.string().describe(
        "Focused natural-language search objective.",
    ),
    search_queries: z.array(z.string()).describe(
        "Related keyword queries; at least one, preferably 2–3.",
    ),
    ...conversationFields,
});
