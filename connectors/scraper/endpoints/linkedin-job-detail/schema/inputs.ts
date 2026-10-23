import { z } from "zod";
import { linkedinNumericIdPattern } from "../../../schema/linkedin.ts";

/**
 * `POST /linkedin/job-detail` request body: the vendor mirror (D25). The
 * target is the vendor's own one-of (`jobId` or `jobUrl`: both or neither
 * returns 400), mirrored as a union of strict objects.
 */
export const zLinkedinJobDetailBody = z.union([
    z.object({
        jobId: z.string().regex(linkedinNumericIdPattern).describe(
            'Numeric LinkedIn job id, 1-32 digits, e.g. "4447655287" (the ' +
                "`jobId` of a `scraper#linkedin/jobs` result, or the trailing " +
                "digits of a /jobs/view/ URL).",
        ),
    }).strict(),
    z.object({
        jobUrl: z.string().min(1).describe(
            "Public LinkedIn job URL: HTTPS, host linkedin.com or " +
                "www.linkedin.com, path /jobs/view/<slug>-<id> or " +
                "/jobs/view/<id>, with a numeric job id at the end. Any " +
                "other URL returns 400 `invalid_job_url`.",
        ),
    }).strict(),
]).describe("The job to read: exactly one of jobId or jobUrl.");
