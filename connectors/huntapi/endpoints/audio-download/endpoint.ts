import { defineEndpoint } from "@shared/core";
import { zHuntapiAudioDownloadQueryParams } from "./schema/inputs.ts";

/**
 * GET /v1/audio/download — Start extracting the audio of a public video; returns a job id.
 *
 * Billing: 1 HuntAPI credits per successful request. Errors are free.
 */
export default defineEndpoint({
    meta: {
        displayName: "HuntAPI Audio Download",
        summary:
            "Start extracting the audio of a public video; returns a job id.",
        description:
            "Start extracting the audio of a public video in a chosen format. " +
            "The call returns a `job_id` at once; read `huntapi#v1/jobs/{id}` " +
            "until the job completes to get the link to the file.",
        docsUrl: "https://docs.huntapi.com",
        categories: ["youtube", "tiktok", "instagram"],
        notes: ["1 HuntAPI credits per successful request. Errors are free."],
    },
    request: { method: "GET", path: "/v1/audio/download" },
    input: { schema: { queryParams: zHuntapiAudioDownloadQueryParams } },
});
