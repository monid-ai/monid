import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zRisingCompaniesQueryParams } from "./schema/inputs.ts";

/**
 * GET /rising-companies — multi-signal breakouts. $0.02 when the answer
 * carries at least one company; `companies: []` is free.
 */
export default defineEndpoint({
    meta: {
        displayName: "Vela Breakout Rising Companies",
        summary: "Companies breaking out on two or more measured growth " +
            "signals at once.",
        description: "Companies growing faster than 90% of their peers " +
            "(and by at least 10%) on two or more independent measures " +
            "at once — e.g. AI model usage plus web reach, or open model " +
            "downloads plus app installs plus news points — ranked by " +
            "how much. Each row gives the company's name, web domain, " +
            "the measures it is rising on and a link to its page; the " +
            "answer states the rule and the measurement date. The " +
            "strongest breakout list Breakout has, because one noisy " +
            "signal cannot put a company on it. Lists companies and " +
            "measure names only — call /company with a domain from this " +
            "list for the figures behind each measure, or /breakouts to " +
            "rank a single group.",
        docsUrl: "https://breakout.vela.partners/agent",
        categories: ["market-trends", "company-enrichment"],
    },
    request: { method: "GET", path: "/rising-companies" },
    input: { schema: { queryParams: zRisingCompaniesQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "company lists with companies",
            description:
                "one /rising-companies call that returned at least one company",
            consumes: { credit: "default", amount: 0.02 },
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        /** Bills only when `companies` is non-empty — an empty list is free
         *  to the buyer. */
        evidence: ({ data, utils }) => {
            const companies = utils.json.optionalGet(
                data.output,
                "$.companies",
            );
            return {
                counts: {
                    RESULT: Array.isArray(companies) && companies.length > 0
                        ? 1
                        : 0,
                },
            };
        },
    },
});
