import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zAuthorFinderQueryParams } from "./schema/inputs.ts";

/** GET /author-finder — the email address of an article's author. */
export default defineEndpoint({
    meta: {
        displayName: "Find Article Author's Email",
        summary:
            "Find the email address of the author of an article or blog post from its URL.",
        description: "Read an article or blog post, identify its author, " +
            "and return their email address with name, job title, company, " +
            "country, LinkedIn, a 0-100 score, and the verification status, " +
            "plus the article itself (title, description, publisher, " +
            "publish date) and every author candidate with its confidence " +
            "in data.info. When no address is found the response is a 200 " +
            "with data.email null, free. Suited for journalist, blogger, " +
            "and content-partner outreach.",
        docsUrl: "https://docs.tomba.io/api/finder#author-finder",
        categories: ["people-enrichment"],
        notes: [
            "Charged 1 search credit only when an address is returned.",
        ],
    },
    request: { method: "GET", path: "/author-finder" },
    input: {
        schema: {
            queryParams: zAuthorFinderQueryParams.required({ url: true }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "addresses found",
            description: "author addresses returned (a miss counts zero)",
            consumes: { credit: "search", amount: 1 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Found = `data.email` is a non-empty string. */
        evidence: ({ data, utils }) => {
            const email = utils.json.optionalGet(data.output, "$.data.email");
            return {
                counts: {
                    RESULT: typeof email === "string" && email !== "" ? 1 : 0,
                },
            };
        },
    },
});
