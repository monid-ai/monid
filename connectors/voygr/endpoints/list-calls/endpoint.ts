import { defineEndpoint, UsageModelKind } from "@shared/core";
import { SUB_ACCOUNT_BINDING } from "../../schema/sub-account.ts";
import { zListCallsQueryParams } from "./schema/inputs.ts";

/**
 * /list-calls: `GET /calls`. Free. The provider relay adds `X-Sub-Account`,
 * so the list holds this workspace's calls only.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Calls",
        summary: "List this workspace's phone calls.",
        description:
            "List the calls this workspace has placed with PlaceCall: " +
            "status, outcome, charge and timing for each. The list leaves " +
            "out the transcript and the questions a call is waiting on; " +
            "read one call with voygr#get-call for those.",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["agentic-phone"],
        notes: [
            "Reading calls is free.",
            "The answer leaves out `customer_id` and `recording_url`. This " +
            "connector has no recording download; `has_recording` and " +
            "`recording_status` still say whether audio exists.",
        ],
    },
    endpoint: "/list-calls",
    request: { method: "GET", path: "/calls" },
    input: { schema: { queryParams: zListCallsQueryParams } },
    resources: { uses: [SUB_ACCOUNT_BINDING] },
    usage: { model: { kind: UsageModelKind.FREE } },
});
