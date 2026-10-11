import { z } from "zod";
import { conversationFields } from "../../../schema/common.ts";

// Mirror of web_fetch tools/list (2026-10-11); limits live at the binding.
export const zFetchBody = z.strictObject({
    urls: z.array(z.string()).describe("HTTP/HTTPS URLs to extract, up to 20."),
    objective: z.string().nullable().describe(
        "What to extract; up to 200 characters.",
    ).optional(),
    search_queries: z.array(z.string()).nullable().describe(
        "Queries that surfaced these URLs.",
    ).optional(),
    full_content: z.boolean().describe(
        "Request full markdown as well as focused excerpts; may be large.",
    ).optional(),
    allow_live_fetch: z.boolean().describe(
        "Allow fresh live fetching (server default true). False uses cached content only.",
    ).optional(),
    ...conversationFields,
});
