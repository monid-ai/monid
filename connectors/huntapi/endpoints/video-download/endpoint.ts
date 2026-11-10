import { defineEndpoint } from "@shared/core";
import { zHuntapiVideoDownloadQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/video/download — Start downloading a public video; returns a job id.
 *
 * Billing: 1 HuntAPI credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "HuntAPI Video Download",
        summary: "Start downloading a public video; returns a job id.",
        description:
            "Start downloading a public video in a chosen quality and format. " +
            "The call returns a `job_id` at once; read `huntapi#v1/jobs/{id}` " +
            "until the job completes to get the link to the file. Videos " +
            "longer than one hour are capped at 720p.",
        docsUrl: "https://docs.huntapi.com",
        categories: ["youtube", "tiktok", "instagram"],
        notes: ["1 HuntAPI credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/video/download" },
    input: { schema: { queryParams: zHuntapiVideoDownloadQueryParams } },
});
