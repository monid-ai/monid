import { defineEndpoint } from "@shared/core";
import { zZenschedGuideBody } from "./schema/inputs.ts";

/**
 * ZenSched onboarding guide — free, unauthenticated MCP tools/call.
 */
export default defineEndpoint({
    meta: {
        displayName: "ZenSched Guide",
        summary: "Read the ZenSched agent onboarding guide.",
        description: "Returns the current ZenSched workflow guide: how to " +
            "connect MCP clients, fund prepaid balance, create locations " +
            "and shifts, invite workers to the mobile app, watch GPS " +
            "check-ins, and export timesheets. Call this first in every " +
            "new session.",
        docsUrl: "https://www.zensched.com/docs/quickstart/",
        categories: ["field-workforce"],
    },
    endpoint: "/guide",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zZenschedGuideBody },
        toRequest: () => ({
            body: {
                jsonrpc: "2.0",
                id: 1,
                method: "tools/call",
                params: { name: "zensched_guide", arguments: {} },
            },
        }),
    },
});
