import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { DEFAULT_PER_PAGE } from "../../schema/common.ts";
import { zLookalikeById, zLookalikeByUrl } from "./schema/inputs.ts";

/** POST /v2/search/people/lookalike: people shaped like one seed profile,
 *  1 credit per delivered profile. */
export default defineEndpoint({
    meta: {
        displayName: "Find Lookalike People",
        summary: "Find people similar to one seed profile; full profiles " +
            "back.",
        description: "Find people who look like one seed person, given " +
            "by LinkedIn profile URL or Reverse Contact id. The criteria " +
            "are read from the seed: current function and sub-function " +
            "with their tenure, seniority and location. Returns full " +
            "profiles without the seed, in the shape of " +
            "`reversecontact#v2/search/people`, with cursor pagination. " +
            "Built for 'more people like my best customer or best hire'. " +
            "To combine criteria yourself, use " +
            "`reversecontact#v2/search/people`. A seed outside the search " +
            "index answers 404 and costs nothing. 1 credit per profile " +
            "delivered.",
        docsUrl:
            "https://docs.reversecontact.com/endpoints/search-people-lookalike",
        categories: ["people-enrichment"],
        notes: [
            "Filters are not accepted (422 " +
            "`LOOKALIKE_FILTERS_NOT_SUPPORTED`).",
        ],
    },
    request: { method: "POST", path: "/v2/search/people/lookalike" },
    input: {
        schema: {
            body: z.union([
                zLookalikeByUrl.extend({
                    perPage: zLookalikeByUrl.shape.perPage.unwrap().default(
                        DEFAULT_PER_PAGE,
                    ),
                }),
                zLookalikeById.extend({
                    perPage: zLookalikeById.shape.perPage.unwrap().default(
                        DEFAULT_PER_PAGE,
                    ),
                }),
            ]).describe(
                "Give the seed as `url` or as `id`, not both.",
            ),
        },
    },
    timeouts: { requestMs: 40_000, runMs: 45_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "profiles delivered",
            description: "Reverse Contact credits as the receipt reports " +
                "them: 1 per profile delivered",
        },
        estimate: ({ data }) => ({
            counts: { CREDIT: data.input.body.perPage },
        }),
    },
});
