import { z } from "zod";

export const zZenschedAccountCreateBody = z.object({
    org_name: z.string().min(1).max(200).describe(
        "Display name for the new organization. Returns a zsc_ API key " +
            "scoped to that org — store it and use Bearer auth on " +
            "https://mcp.zensched.com/mcp for scheduling tools.",
    ),
}).strict();
