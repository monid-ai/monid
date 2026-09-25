import { defineEndpoint } from "@shared/core";
import { zJobQrnPathParams } from "../../schema/qrn.ts";

/** GET /jobs/{qrn} — get job */
export default defineEndpoint({
    meta: {
        displayName: "Get Job",
        summary: "One job by QRN: status, cost, timestamps, device.",
        description: "Get one quantum job by its QRN: status " +
            "(INITIALIZING, QUEUED, VALIDATING, RUNNING, CANCELLING, " +
            "CANCELLED, COMPLETED, FAILED, UNKNOWN, HOLD), statusMsg — the " +
            "one-line actionable reason a job failed — shots, " +
            "estimatedCost and final cost in qBraid credits, " +
            "queuePosition, timeStamps and the device it ran on. Reading a " +
            "non-terminal job refreshes its status from the quantum " +
            "provider and may store completed results and finalize the " +
            "job's credit charge or refund. Poll this after " +
            "qbraid#submit-job until the status is terminal, then read " +
            "qbraid#get-job-result. Free — the estimatedCost and cost " +
            "fields are the job's own record, never a charge for reading.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
    },
    endpoint: "/get-job",
    request: { method: "GET", path: "/jobs/{qrn}" },
    input: { schema: { pathParams: zJobQrnPathParams } },
});
