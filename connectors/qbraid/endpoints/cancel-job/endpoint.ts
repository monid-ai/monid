import { defineEndpoint } from "@shared/core";
import { zJobQrnPathParams } from "../../schema/qrn.ts";

/** POST /jobs/{qrn}/cancel — cancel job */
export default defineEndpoint({
    meta: {
        displayName: "Cancel Job",
        summary: "Cancel a pending or running job (irreversible).",
        description: "Cancel a pending or running quantum job. " +
            "Irreversible: the job cannot be resumed and pending results " +
            "are forfeited; a device may still bill for work already " +
            "performed. Only works for jobs that have not yet completed. " +
            "Answers 202 with the job's new status (usually CANCELLING) — " +
            "confirm with qbraid#get-job. A job still INITIALIZING cannot " +
            "be cancelled yet and answers 409 JOB_CANCEL_CONFLICT: wait a " +
            "few seconds and retry. Free.",
        docsUrl: "https://docs.qbraid.com/v2/api-reference",
        categories: ["quantum-computing"],
    },
    endpoint: "/cancel-job",
    request: { method: "POST", path: "/jobs/{qrn}/cancel" },
    input: { schema: { pathParams: zJobQrnPathParams } },
});
