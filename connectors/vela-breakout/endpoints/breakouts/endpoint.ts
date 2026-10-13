import { defineEndpoint } from "@shared/core";
import { zBreakoutsQueryParams } from "./schema/inputs.ts";

/**
 * GET /breakouts — the fastest growers in one group. Inherits the
 * provider's $0.02 PER_CALL; estimate and evidence are
 * compiler-synthesized (flat model).
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
});
