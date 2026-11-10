import { z } from "zod";

/**
 * /v1/jobs/{id} path params — mirrors the vendor OpenAPI
 * (https://docs.huntapi.com). Optionality only; strict, so an unknown key is rejected.
 */
export const zHuntapiJobsPathParams = z.strictObject({
    id: z.string().min(1).describe(
        "The `job_id` returned when the download started.",
    ),
});
