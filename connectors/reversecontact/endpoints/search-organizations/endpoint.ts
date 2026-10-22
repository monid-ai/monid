import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { DEFAULT_PER_PAGE } from "../../schema/common.ts";
import { zSearchOrganizationsBody } from "./schema/inputs.ts";

/** POST /v2/search/organizations: structured Organization Search, full
 *  company profiles, 1 credit per delivered organization. */
export default defineEndpoint({
    meta: {
        displayName: "Search Organizations",
        summary: "Find companies by industry, headcount, founding year " +
            "and headquarters; full company profiles back.",
        description: "Search the Reverse Contact organization database " +
            "with structured filters and get full company profiles back, " +
            "up to 100 per page. Filter on name, domain, industry, " +
            "specialities, headcount range, founding year, follower count " +
            "and headquarters location. Filters are AND-combined and list " +
            "values OR-combined. Built for building target account lists " +
            "and market maps. `data.data` holds the organizations, " +
            "`data.metadata.count` the total and " +
            "`data.metadata.nextCursor` the next page. Size a query for " +
            "free with `reversecontact#v2/search/organizations/count`; " +
            "pass the returned `id`s as `currentCompanyId` to " +
            "`reversecontact#v2/search/people` to find who works there. " +
            "1 credit per organization delivered; an empty page costs " +
            "nothing.",
        docsUrl:
            "https://docs.reversecontact.com/endpoints/search-organizations",
        categories: ["company-enrichment"],
        notes: [
            "At least one filter is required, and `maxDataAgeDate` cannot " +
            "be the only one (422).",
            "Pass `nextCursor` back unchanged with the same filters.",
            "Upstream checks that a full page (`perPage` credits) could be " +
            "paid before it runs; only delivered organizations are billed.",
        ],
    },
    request: { method: "POST", path: "/v2/search/organizations" },
    input: {
        schema: {
            body: zSearchOrganizationsBody.extend({
                perPage: zSearchOrganizationsBody.shape.perPage.unwrap()
                    .default(DEFAULT_PER_PAGE),
            }),
        },
    },
    timeouts: { requestMs: 40_000, runMs: 45_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "organizations delivered",
            description: "Reverse Contact credits as the receipt reports " +
                "them: 1 per organization delivered",
        },
        estimate: ({ data }) => ({
            counts: { CREDIT: data.input.body.perPage },
        }),
    },
});
