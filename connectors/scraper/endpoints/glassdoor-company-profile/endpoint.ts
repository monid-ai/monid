import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zGlassdoorCompanyProfileBody } from "./schema/inputs.ts";

/** `POST /glassdoor/company-profile`: flat 2 credits per call ⇒ leaf
 *  PER_CALL. */
export default defineEndpoint({
    meta: {
        displayName: "Glassdoor Company Profile",
        summary: "Get a Glassdoor employer profile: ratings, size, " +
            "headquarters, CEO, industry.",
        description:
            "Get an employer's Glassdoor profile. By default it returns the name, " +
            "overall and category ratings (culture, work-life balance, " +
            "compensation, career opportunities, senior management, CEO approval, " +
            "recommend to a friend), review, salary, interview, benefit, and open " +
            "job counts, headquarters, size, website, CEO, and primary industry. " +
            "`fields` adds revenue, founding year, company type, overview and " +
            "mission, office locations, awards, parent and subsidiary companies, " +
            'demographic ratings, photos, and more (`["*"]` for all). Identify ' +
            "the employer with `employerUrl` or `employerId` (at least one; when " +
            "both are given they must name the same employer). For the review " +
            "texts use `scraper#glassdoor/company-reviews`; for pay use " +
            "`scraper#glassdoor/company-salaries`; for open roles use " +
            "`scraper#glassdoor/company-jobs`.",
        docsUrl: "https://scraper.run/docs/glassdoor/company",
        categories: ["company-enrichment", "company-reviews"],
        notes: [
            "2 Scraper credits per call.",
            "When both `employerUrl` and `employerId` are given they must" +
            " name the same employer, or the call fails with 400 and no " +
            "credits.",
        ],
    },
    request: { method: "POST", path: "/glassdoor/company-profile" },
    input: { schema: { body: zGlassdoorCompanyProfileBody } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "company profile calls",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
