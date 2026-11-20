import { z } from "zod";
import {
    zApplyAsExisting,
    zApplyAsNew,
    zWorklittleApplyOptions,
} from "../../../schema/apply.ts";

/** POST /v1/apply body (`job_ids`): `job_ids` (1–10, deduplicated
 *  upstream) plus the same options as apply (jobs-api
 *  `handlePublicBatchApplyWithAi`, `APPLY_BATCH_MAX = 10`, 2026-10-29). */
const jobIds = {
    job_ids: z.array(z.string().min(1)).describe(
        "The jobs to apply to (1–10): `id`s from worklittle#jobs/search. " +
            "One application per job, in order.",
    ),
};

export const zApplyBatchExistingBody = z.object({
    ...zApplyAsExisting,
    ...jobIds,
    ...zWorklittleApplyOptions,
});

export const zApplyBatchNewBody = z.object({
    ...zApplyAsNew,
    ...jobIds,
    ...zWorklittleApplyOptions,
});
