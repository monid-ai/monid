import { defineEndpoint, UsageModelKind } from "@shared/core";

/**
 * GET /groups — the free catalog of rankable groups. Takes no
 * parameters, so the doc declares no input.
 */
export default defineEndpoint({
    meta: {
        displayName: "Vela Breakout Groups",
        summary: "Free list of every group Breakout ranks, with what " +
            "each one measures.",
        description: "Every group Vela Breakout can rank — AI apps, AI " +
            "models, AI labs, AI expert work, open models, code editor " +
            "and open-source editor extensions, workplace add-ons, " +
            "browser extensions, agent skills, agent tools, company " +
            "packages, business software, web technologies, companies " +
            "hiring and companies in the news — each with its `id`, " +
            "name, the signal it measures, what that signal means, its " +
            "unit, its caveat and its usual window in days. Free. Call " +
            "this first: the `id` values are the only accepted `group` " +
            "for /breakouts, and the caveat says what a number does NOT " +
            "mean (tokens are usage, not users; installs are not active " +
            "users). Returns no figures itself — rank a group with " +
            "/breakouts, or look up one company with /company.",
        docsUrl: "https://breakout.vela.partners/agent",
        categories: ["market-trends"],
    },
    request: { method: "GET", path: "/groups" },
    usage: { model: { kind: UsageModelKind.FREE } },
});
