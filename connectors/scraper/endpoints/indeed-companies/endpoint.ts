import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zIndeedCompaniesBody } from "./schema/inputs.ts";

/**
 * `POST /indeed/companies`: 1 credit per started block of 25 REQUESTED
 * profiles, minimum 1 (the vendor's own formula, also its
 * `meta.creditsUsed`). Requested, not returned: a lookup list bills for
 * every key it names, a search bills for `maxItems`. Leaf PER_UNIT with
 * `every: 25`; the engine folds `ceil(n / 25)`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Indeed Companies",
        summary: "Search Indeed company profiles or look companies up by " +
            "key: ratings, size, industry, headquarters.",
        description: "Get structured Indeed employer profiles: name, " +
            "industry, size, revenue, founding year, CEO, ratings and " +
            "employee happiness scores, headquarters and office " +
            "locations, social links, open job count, and similar " +
            "companies. Two modes. Search mode takes `keyword`, " +
            "`location`, and `country` and returns up to `maxItems` " +
            "profiles. Lookup mode takes `companyKeys` (the segment after " +
            "/cmp/ in an Indeed company URL, or the URL itself), keeps " +
            "your order, and reports one outcome per key. `fields` trims " +
            "each profile. For the employer's open roles use " +
            "`scraper#indeed/jobs`; for employee reviews and salaries use " +
            "`scraper#glassdoor/company-reviews`.",
        docsUrl: "https://scraper.run/docs/indeed/companies",
        categories: ["company-enrichment", "company-reviews"],
        notes: [
            "1 Scraper credit per started block of 25 requested profiles, " +
            "minimum 1. Billing follows the number requested (companyKeys " +
            "entries in lookup mode, `maxItems` in search mode), not the " +
            "number returned.",
        ],
    },
    request: { method: "POST", path: "/indeed/companies" },
    input: {
        schema: {
            // maxItems default 50 is the vendor's own (docs and service
            // schema); it is the estimate's basis in search mode
            body: zIndeedCompaniesBody.extend({
                maxItems: zIndeedCompaniesBody.shape.maxItems.unwrap()
                    .default(50),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "requested company profiles",
            description: "profiles requested, billed per started block of 25",
            every: 25,
            consumes: { credit: "default", amount: 1 },
        },
        /** Lookup mode bills the listed keys, search mode `maxItems`. */
        estimate: ({ data }) => {
            const keys = data.input.body.companyKeys;
            return {
                counts: {
                    RESULT: Math.max(
                        1,
                        keys !== undefined && keys.length > 0
                            ? keys.length
                            : data.input.body.maxItems,
                    ),
                },
            };
        },
        /** The vendor echoes the requested count as `data.requestedCount`;
         *  minimum one block, like the vendor. */
        evidence: ({ data, utils }) => ({
            counts: {
                RESULT: Math.max(
                    1,
                    utils.json.optionalNum(
                        data.output,
                        "$.data.requestedCount",
                    ) ?? 1,
                ),
            },
        }),
    },
});
