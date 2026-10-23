import { z } from "zod";

/** The vendor's three accepted forms, with its own anchors: a slug URL
 *  (jobs/ or freelance-jobs/apply/) with no query, the short URL, or the
 *  short URL with a `frkscc` tracking token. No whitespace is trimmed. */
const upworkJobUrlPattern =
    /^https:\/\/www\.upwork\.com\/(?:(?:jobs\/[^/?#]+|freelance-jobs\/apply\/[^/?#]+)_~02\d{18,30}\/?|jobs\/~02\d{18,30}\/?(?:\?frkscc=[A-Za-z0-9_-]{1,200})?)$/;

/**
 * `POST /upwork/job-detail` request body: the vendor mirror. The
 * identifier is the vendor's own one-of (`jobId` or `jobUrl`, its
 * `superRefine` rejects both and neither), mirrored as a union.
 */
export const zUpworkJobDetailBody = z.union([
    z.object({
        jobId: z.string().regex(/^~02\d{18,30}$/).describe(
            "Stable Upwork job ID: `~02` followed by 18 to 30 digits, e.g. " +
                '"~021234567890123456789". It is the `id` of a job from ' +
                "`scraper#upwork/jobs`.",
        ),
    }).strict(),
    z.object({
        jobUrl: z.string().max(2048).regex(upworkJobUrlPattern).describe(
            "Exact public Upwork job URL, at most 2048 characters, https, " +
                "host www.upwork.com, no fragment, no userinfo or port. " +
                "Accepted forms: " +
                "https://www.upwork.com/jobs/<slug>_~02<digits>/, " +
                "https://www.upwork.com/freelance-jobs/apply/<slug>_~02<digits>/, " +
                "https://www.upwork.com/jobs/~02<digits>/, or the short form " +
                "with a `?frkscc=<token>` tracking parameter. The slug form " +
                "takes no query string. The ID has `~02` and 18 to 30 digits.",
        ),
    }).strict(),
]).describe("The job to fetch: exactly one of `jobId` or `jobUrl`.");
