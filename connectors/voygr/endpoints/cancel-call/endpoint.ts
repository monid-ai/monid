import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCallPathParams } from "../../schema/call-id.ts";
import { SUB_ACCOUNT_BINDING } from "../../schema/sub-account.ts";

/**
 * /cancel-call: `POST /calls/{call_id}/cancel`. Free: the request itself
 * bills nothing. The provider relay adds `X-Sub-Account`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Cancel Call",
        summary: "Cancel a call that has not finished.",
        description:
            "Cancel a queued or running call. `cancelled: true` means " +
            "VOYGR stopped the call. A call that is unknown, from another " +
            "workspace or already finished answers 200 with " +
            "`cancelled: false`, so a retry is safe.",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["agentic-phone"],
        notes: [
            "Cancelling is free before anyone answers and within 30 " +
            "seconds of pickup. A cancel 30 seconds or more after pickup " +
            "is charged 10 credits.",
        ],
    },
    endpoint: "/cancel-call",
    request: { method: "POST", path: "/calls/{call_id}/cancel" },
    input: { schema: { pathParams: zCallPathParams } },
    resources: { uses: [SUB_ACCOUNT_BINDING] },
    usage: { model: { kind: UsageModelKind.FREE } },
});
