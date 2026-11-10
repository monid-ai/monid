import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBreakoutsQueryParams } from "./schema/inputs.ts";

/**
 * GET /breakouts — the fastest growers in one group. $0.02 when the
 * answer carries at least one row or new launch; `rows: []` with no
 * `new_launches` (e.g. a strict `steady` filter on a small group) is free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Vela Breakout Fastest Growers",
        summary: "The fastest-growing AI apps, models, agent tools, " +
            "extensions, packages, software or hiring companies in one " +
            "group, measured.",
        description: "Rank the fastest-growing items in ONE group over a " +
            "window — e.g. the fastest-growing AI apps by tokens used, " +
            "open models by downloads, agent tools by weekly downloads, " +
            "editor or browser extensions by installs, business software " +
            "by spend-panel adoption, web technologies by websites " +
            "running them, or companies by open roles. Each row carries " +
            "the item's name, what it is, growth as a ratio and in words " +
            "(before, now, unit, window), its percentile against peers " +
            "('Faster than 99% of AI apps') and a link to its company " +
            "page when it maps to a company; the answer carries the " +
            "measurement date, the group's caveat and a chart link. By " +
            "default only items at least the group's median size are " +
            "ranked, so tiny starts do not dominate. `group` is " +
            "required: get the ids (and each group's usual window) free " +
            "from /groups. Ranks a single group only — for companies " +
            "rising on several measures at once use /rising-companies; " +
            "for everything about one named company use /company; for " +
            "AI research topics use /ideas.",
        docsUrl: "https://breakout.vela.partners/agent",
        categories: ["market-trends"],
        notes: [
            "`group` must be an id from /groups; any other value is a " +
            "free 400.",
        ],
    },
    request: { method: "GET", path: "/breakouts" },
    input: { schema: { queryParams: zBreakoutsQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "rankings with rows",
            description: "one /breakouts call that returned at least one row",
            consumes: { credit: "default", amount: 0.02 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Bills when the answer carries data: `rows`, or `new_launches`
         *  (listed beside an empty ranking). Both empty is free, as on
         *  Breakout's own rate card. */
        evidence: ({ data, utils }) => {
            const has = (path: string) => {
                const v = utils.json.optionalGet(data.output, path);
                return Array.isArray(v) && v.length > 0;
            };
            return {
                counts: {
                    RESULT: has("$.rows") || has("$.new_launches") ? 1 : 0,
                },
            };
        },
    },
});
