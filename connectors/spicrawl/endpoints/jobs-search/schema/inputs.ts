import { z } from "zod";

/**
 * `POST /v1/jobs/search` request body — Spicrawl's JobSearchRequest mirrored
 * from the OpenAPI (optionality only, no `.default()`, D25).
 *
 * `find_contacts` is deliberately omitted and the body is `.strict()`, so it
 * cannot be passed through: it looks up named people at companies (privacy).
 * The vendor's `limit` description still mentions `find_contacts`; kept as
 * mirrored text.
 */

export const zJobSearchBody = z.object({
    title: z.string().max(200).describe(
        "Words to match in the job title. Web-search syntax: `backend " +
            'engineer` matches both words, `"staff engineer"` a phrase, ' +
            '`engineer -senior` excludes a word, `ml or "machine learning"` ' +
            "matches either. Optional: a blank title is treated as absent. " +
            "Without a title, the request must carry at least one filter " +
            "(`posted_within`, `region`, `country`, `workplace`, " +
            "`visa_sponsorship: true`, `platforms`, `seniority`, " +
            "`employment_type`, `skills`, `language` or `salary_min`), or it is " +
            "a `400` with `ERR::REQUEST::MISSING_PARAMETER`.",
    ).meta({ examples: ["backend engineer -senior"] }).optional(),
    posted_within: z.string().regex(
        /^([1-9]|[1-6][0-9]|7[0-2])h$|^([1-9]|[12][0-9]|30)d$/,
    ).describe(
        "Only postings first seen within this window, as hours (`1h` to " +
            "`72h`) or days (`1d` to `30d`). Omitted means any age. Results are " +
            "only as fresh as the crawl: boards are re-read about every 6 " +
            "hours, so a posting from the last hour may not be indexed yet.",
    ).meta({ examples: ["6h", "24h", "7d"] }).optional(),
    region: z.string().max(100).describe(
        "A country name or code, or a city. Matched case-insensitively " +
            "against the posting's location text and its country.",
    ).meta({ examples: ["Berlin"] }).optional(),
    workplace: z.array(z.enum(["remote", "hybrid", "onsite"])).optional(),
    visa_sponsorship: z.boolean().describe(
        "`true` returns only postings known to sponsor. Most postings are " +
            "`unknown`, so this narrows results a lot.",
    ).optional(),
    platforms: z.array(
        z.enum([
            "greenhouse",
            "lever",
            "ashby",
            "yc",
            "wellfound",
            "techtree",
            "reddit",
            "workable",
            "smartrecruiters",
            "recruitee",
            "breezy",
            "pinpoint",
            "personio",
            "workday",
        ]),
    ).describe(
        "Omitted or empty means all platforms.",
    ).optional(),
    limit: z.number().int().min(1).max(50).describe(
        "With find_contacts set to true, the maximum is 10 and the default " +
            "is 10. A larger value is a `400`.",
    ).optional(),
    cursor: z.string().describe(
        "The `next_cursor` from the previous page, passed back verbatim.",
    ).optional(),
    seniority: z.array(
        z.enum(["intern", "entry", "mid", "senior", "lead", "executive"]),
    ).max(6).describe(
        "Any of the listed levels. Read from the job title only, and most " +
            "titles carry no level, so most postings are `unknown` and this " +
            "filter narrows results a lot.",
    ).optional(),
    employment_type: z.array(
        z.enum([
            "full_time",
            "part_time",
            "contract",
            "internship",
            "temporary",
        ]),
    ).max(5).describe(
        "Any of the listed types. Taken from the platform's field where it " +
            "has one (English, German, Dutch, French and Spanish values are " +
            "understood), otherwise from an unambiguous title tag such as an " +
            "internship word or `(Contract)`.",
    ).optional(),
    skills: z.array(z.string().min(1).max(40)).max(10).describe(
        "Every skill listed must match. An empty array is the same as " +
            "omitting the field. Aliases are accepted (`golang` is `go`, `k8s` " +
            "is `kubernetes`, `postgres` is `postgresql`). An unknown skill is " +
            "a `400` that names it. Matched against a fixed vocabulary in the " +
            "title and description; a posting whose description is not " +
            "available only has skills found in its title.",
    ).meta({ examples: [["go", "postgresql"]] }).optional(),
    language: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "ISO 639-1 code of the language the posting is written in, such as " +
            "`en`. Matched case-insensitively. Detected from the posting text. " +
            "An empty string is the same as omitting the field.",
    ).meta({ examples: ["en"] }).optional(),
    country: z.string().regex(/^[A-Za-z]{2}$/).describe(
        "ISO 3166-1 alpha-2 code, such as `DE`. Matched case-insensitively. " +
            "An empty string is the same as omitting the field. Matches the " +
            "platform's country field or the location text. Independent of " +
            "`region`, which is a substring match on the location.",
    ).meta({ examples: ["DE"] }).optional(),
    salary_min: z.number().gt(0).max(10000000).describe(
        "A yearly amount. Returns postings whose published yearly salary, " +
            "in `salary_currency`, reaches it. No exchange-rate conversion. " +
            "Hourly and monthly salaries are converted to a year at 2080 hours " +
            "and 12 months. Postings that publish no salary never match.",
    ).meta({ examples: [100000] }).optional(),
    salary_currency: z.string().regex(/^[A-Za-z]{3}$/).describe(
        "ISO 4217 code, upper-cased. Defaults to `USD` when `salary_min` is " +
            "set. A `400` when given without `salary_min`.",
    ).meta({ examples: ["EUR"] }).optional(),
    status: z.enum(["open", "closed", "any"]).describe(
        "`open` returns open postings only, which is the default. `closed` " +
            "returns postings that left their board and are kept for 30 days. " +
            "`any` returns both.",
    ).optional(),
    include_description: z.boolean().describe(
        "Adds `description`, the posting's plain text capped at 20,000 " +
            "characters, to each job. Responses become much larger.",
    ).optional(),
}).strict();
