import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zHuntapiJobsPathParams } from "./schema/inputs.ts";

/**
 * GET /v1/jobs/{id} — Read the status and result of a download job.
 *
 * Billing: Free.
 */
export default defineEndpoint({
    meta: {
        displayName: "HuntAPI Job Status",
        summary: "Read the status and result of a download job.",
        description:
            "Read a download job started by `huntapi#v1/video/download` or " +
            "`huntapi#v1/audio/download`: its `status`, `progress` and, once " +
            "it has completed, the `result` with the link to the file. Free.",
        docsUrl: "https://docs.huntapi.com",
        categories: ["youtube", "tiktok", "instagram"],
        notes: ["Free."],
    },
    request: { method: "GET", path: "/v1/jobs/{id}" },
    input: { schema: { pathParams: zHuntapiJobsPathParams } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
