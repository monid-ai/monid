import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { DEFAULT_PER_PAGE } from "../../schema/common.ts";
import { zSearchPeoplePromptBody } from "./schema/inputs.ts";

/** POST /v2/search/people/prompt: a plain-language prompt read into
 *  People Search filters, then the search. 1 base credit per search that
 *  runs plus 1 per delivered profile. */
export default defineEndpoint({
    meta: {
        displayName: "Search People by Prompt",
        summary: "Describe the people to find in plain language; full " +
            "profiles back, with the filters that were applied.",
        description: "Describe the people to find in plain language, " +
            "e.g. 'heads of growth at Series B fintechs in London', and " +
            "get full professional profiles back. The prompt is turned " +
            "into People Search filters, the search runs, and the page " +
            "comes back with the filters applied " +
            "(`data.interpretation.filters`) and `warnings` for anything " +
            "that could not be mapped. Same result shape and cursor " +
            "pagination as `reversecontact#v2/search/people`; reuse the " +
            "returned filters there to refine or count them for free. " +
            "1 credit per search plus 1 per profile delivered.",
        docsUrl:
            "https://docs.reversecontact.com/endpoints/search-people-prompt",
        categories: ["people-enrichment"],
        notes: [
            "The base credit is billed whenever the search runs, even on " +
            "an empty page.",
            "A prompt that yields no usable filter answers 422 " +
            "`NO_FILTERS_INTERPRETED`, free, with `details.alternative`.",
            "Next pages: send the same prompt with `nextCursor`; the " +
            "interpretation is reused, not re-read.",
        ],
    },
    request: { method: "POST", path: "/v2/search/people/prompt" },
    input: {
        schema: {
            body: zSearchPeoplePromptBody.extend({
                perPage: zSearchPeoplePromptBody.shape.perPage.unwrap()
                    .default(DEFAULT_PER_PAGE),
            }),
        },
    },
    timeouts: { requestMs: 55_000, runMs: 60_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "search and profiles delivered",
            description: "Reverse Contact credits as the receipt reports " +
                "them: 1 per search plus 1 per profile delivered",
        },
        /** The ceiling: the base credit and a full page. */
        estimate: ({ data }) => ({
            counts: { CREDIT: data.input.body.perPage + 1 },
        }),
    },
});
