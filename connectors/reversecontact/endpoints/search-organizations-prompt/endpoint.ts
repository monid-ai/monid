import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { DEFAULT_PER_PAGE } from "../../schema/common.ts";
import { zSearchOrganizationsPromptBody } from "./schema/inputs.ts";

/** POST /v2/search/organizations/prompt: a plain-language prompt read into
 *  Organization Search filters, then the search. 1 base credit per search
 *  that runs plus 1 per delivered organization. */
export default defineEndpoint({
    meta: {
        displayName: "Search Organizations by Prompt",
        summary: "Describe the companies to find in plain language; full " +
            "company profiles back, with the filters that were applied.",
        description: "Describe the companies to find in plain language, " +
            "e.g. 'B2B SaaS companies in Germany with 50 to 200 " +
            "employees founded after 2015', and get full company profiles " +
            "back. The prompt is turned into Organization Search filters, " +
            "the search runs, and the page comes back with the filters " +
            "applied (`data.interpretation.filters`) and `warnings` for " +
            "anything that could not be mapped. Same result shape and " +
            "cursor pagination as " +
            "`reversecontact#v2/search/organizations`. 1 credit per " +
            "search plus 1 per organization delivered.",
        docsUrl:
            "https://docs.reversecontact.com/endpoints/search-organizations-prompt",
        categories: ["company-enrichment"],
        notes: [
            "The base credit is billed whenever the search runs, even on " +
            "an empty page.",
            "A prompt that yields no usable filter answers 422 " +
            "`NO_FILTERS_INTERPRETED`, free, with `details.alternative`.",
            "Next pages: send the same prompt with `nextCursor`.",
        ],
    },
    request: { method: "POST", path: "/v2/search/organizations/prompt" },
    input: {
        schema: {
            body: zSearchOrganizationsPromptBody.extend({
                perPage: zSearchOrganizationsPromptBody.shape.perPage
                    .unwrap().default(DEFAULT_PER_PAGE),
            }),
        },
    },
    timeouts: { requestMs: 55_000, runMs: 60_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "search and organizations delivered",
            description: "Reverse Contact credits as the receipt reports " +
                "them: 1 per search plus 1 per organization delivered",
        },
        estimate: ({ data }) => ({
            counts: { CREDIT: data.input.body.perPage + 1 },
        }),
    },
});
