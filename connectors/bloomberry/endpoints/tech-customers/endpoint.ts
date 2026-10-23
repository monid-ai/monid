import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zTechCustomersQueryParams } from "./schema/inputs.ts";

/** GET /accounts/tech.json — every company currently using a vendor. */
export default defineEndpoint({
    meta: {
        displayName: "Bloomberry Tech Stack Customers",
        summary: "Companies currently using a given vendor or category.",
        description: "List the companies that currently use a vendor (or " +
            "any vendor in a category): each row has the company's domain, " +
            "name, industry, headcount band and HQ country, the vendor and " +
            "its category, `usage_started_at` (the date Bloomberry first " +
            "detected the usage) and the public record it was detected " +
            "from. Pick ONE of `vendor_name` or `category`, then narrow " +
            "with company filters (size, industry, country, region, " +
            "excluded domains). This is the install-base list — e.g. every " +
            "company running a competitor's product, or every company " +
            "running the tool your product integrates with. For who just " +
            "STARTED or STOPPED use /signals/tech.json; for one company's " +
            "whole stack use /enrichments/tech.json. Pages of up to 20 via " +
            "`next_token`; 2 credits per company returned.",
        docsUrl: "https://docs.bloomberry.com/reference/get_accounts-tech-json",
        categories: ["technographics", "company-enrichment"],
        notes: [
            "`vendor_name` and `category` are mutually exclusive: pass " +
            "exactly one. A request with neither or both is rejected by " +
            "Bloomberry (422).",
            "An unknown `vendor_name` comes back as HTTP 200 with an " +
            "`error` body; the connector settles it as a 422 provider " +
            "error with zero usage. Resolve exact spellings via " +
            "/vendors/all_vendors.json.",
        ],
    },
    request: { method: "GET", path: "/accounts/tech.json" },
    // `limit`: vendor default (20, the documented maximum) materialized at
    // the binding (design D25) so the estimate is deducible.
    input: {
        schema: {
            queryParams: zTechCustomersQueryParams.extend({
                limit: zTechCustomersQueryParams.shape.limit.unwrap().default(
                    20,
                ),
            }),
        },
    },
    usage: {
        /** PER COMPANY: "2 credits per tech stack customer" (published
         *  rate card). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "tech stack customers",
            consumes: { credit: "default", amount: 2 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.queryParams.limit },
        }),
        /** Settle on the `users` array actually returned. */
        evidence: ({ data, utils }) => ({
            counts: {
                "RESULT": utils.json.optionalLen(data.output, "$.users") ?? 0,
            },
        }),
    },
});
