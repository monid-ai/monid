import { z } from "zod";

/**
 * `POST /naukri/job-detail` request body: the vendor mirror (D25). The
 * identifier is the vendor's own one-of (`jobId` or `jobUrl`), mirrored as
 * a union of strict objects. The vendor trims both values; a `jobUrl` is
 * also checked as an HTTPS `www.naukri.com` URL whose path ends in
 * `-<job ID>`, with no port or credentials (any query or fragment is
 * dropped), and that check is stated in the `describe` text.
 */
export const zNaukriJobDetailBody = z.union([
    z.object({
        jobId: z.string().regex(/^\d{12,30}$/u).describe(
            'Naukri job ID, 12 to 30 digits, e.g. "110826930912". It is ' +
                "the `id` of a job from `scraper#naukri/jobs`, and the " +
                "digits at the end of a Naukri job URL.",
        ),
    }).strict(),
    z.object({
        jobUrl: z.string().max(2048).describe(
            "Public Naukri job URL: HTTPS, host www.naukri.com, path " +
                "ending in a dash and the 12 to 30 digit job ID (max " +
                "2048 characters). Other hosts and URLs with no job ID " +
                "fail with 400.",
        ),
    }).strict(),
]).describe("The job to fetch: exactly one of jobId or jobUrl.");
