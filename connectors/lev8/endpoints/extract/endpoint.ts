import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLev8ExtractBody } from "./schema/inputs.ts";

/**
 * POST /v1/extract — social / GitHub lists, or a list off a web page.
 *
 * Two prices behind one route (design D6): social and GitHub lists bill 1
 * credit per FIVE returned items, rounded up (`every: 5` — Lev8 settles
 * `(len(data) + 4) / 5`); `web2list` bills a flat 80 on success. Both bill 0
 * on `success: false`. The estimate mirrors Lev8's own reservation: the
 * `limit` ceiling for lists, one page for web2list.
 */
export default defineEndpoint({
    meta: {
        displayName: "Lev8 Extract",
        summary:
            "Extract X, Instagram, TikTok or GitHub follower lists, or a list from a web page.",
        description: "Pull a list synchronously. Social: followers or " +
            "following of an X, Instagram or TikTok account. GitHub: a " +
            "user's followers or following, or a repository's stargazers " +
            "or contributors. Web: `web2list` reads one public web page " +
            "and returns the list it contains (rankings, directories, " +
            "speaker or portfolio pages) as structured rows, following " +
            "your `instruction` for which fields to keep. Social and " +
            "GitHub lists return up to `limit` items (default 100, max " +
            "10,000). To find people or companies matching a description " +
            "instead of a known account or page, use Lev8 Entity Search.",
        docsUrl: "https://docs.lev8.com/api-reference/extract/run",
        categories: [
            "web-extraction",
            "twitter",
            "instagram",
            "tiktok",
        ],
        notes: [
            "Social and GitHub lists cost 1 credit per 5 returned items, " +
            "rounded up. `web2list` costs 80 credits per successful page. " +
            "`success: false` costs nothing, and `data` then carries the " +
            "failure reason as a string.",
            "`web2list` bills 80 whenever it succeeds, including when the " +
            "page yields no rows (`data: []`).",
            "`web2list` requires `instruction` and a public http(s) URL as " +
            "`target`; it ignores `limit`.",
        ],
    },
    request: { method: "POST", path: "/v1/extract" },
    input: {
        schema: {
            // Lev8's documented default, at the binding (D25): the list
            // estimate reads it.
            body: zLev8ExtractBody.extend({
                limit: zLev8ExtractBody.shape.limit.unwrap().default(100),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                list_items: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    every: 5,
                    label: "list items",
                    description: "social or GitHub items returned, 1 " +
                        "credit per 5, rounded up",
                    consumes: { credit: "default", amount: 1 },
                },
                web2list: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.PAGE,
                    label: "web pages extracted",
                    description: "successful web2list extractions",
                    consumes: { credit: "default", amount: 80 },
                },
            },
        },
        estimate: ({ data }) =>
            data.input.body.type === "web2list"
                ? { counts: { web2list: 1 } }
                : { counts: { list_items: data.input.body.limit } },
        evidence: ({ data, utils }) => {
            const web = data.input.body.type === "web2list";
            const key = web ? "web2list" : "list_items";
            if (utils.json.optionalGet(data.output, "$.success") !== true) {
                return { counts: { [key]: 0 } };
            }
            if (web) return { counts: { web2list: 1 } };
            const rows = utils.json.optionalGet(data.output, "$.data");
            return {
                counts: { list_items: Array.isArray(rows) ? rows.length : 0 },
            };
        },
    },
});
