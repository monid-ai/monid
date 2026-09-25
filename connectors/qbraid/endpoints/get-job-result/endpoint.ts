import { defineEndpoint } from "@shared/core";
import { zJobQrnPathParams } from "../../schema/qrn.ts";
import { zGetJobResultQueryParams } from "./schema/inputs.ts";

/** GET /jobs/{qrn}/result — get job result */
export default defineEndpoint({
    meta: {
        displayName: "Get Job Result",
        summary: "Measurement histogram of a completed job.",
        description: "Get the measurement results of a COMPLETED quantum " +
            "job: resultData.measurementCounts (the histogram over " +
            "bitstrings) plus the job's status, cost and timeStamps. The " +
            "raw per-shot measurements array is NOT included unless " +
            "includeMeasurements is true, and is capped at 100 rows even " +
            "then (measurementsTruncated and totalShots say what you did " +
            "not get). Errors until the job has completed and uploaded " +
            "its result artifact — check status with qbraid#get-job " +
            "first. Free.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
        notes: [
            'cost on this route is a decimal STRING (e.g. "0E-33"), ' +
            "unlike the number on qbraid#get-job.",
        ],
    },
    endpoint: "/get-job-result",
    request: { method: "GET", path: "/jobs/{qrn}/result" },
    input: {
        schema: {
            pathParams: zJobQrnPathParams,
            queryParams: zGetJobResultQueryParams,
        },
    },
});
