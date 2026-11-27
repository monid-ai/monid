import { z } from "zod";
import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zFetchCompanyPagesBody } from "./schema/inputs.ts";

const zWithRefreshDefault = zFetchCompanyPagesBody.extend({
    force_refresh: zFetchCompanyPagesBody.shape.force_refresh.unwrap()
        .default(false),
});

/** POST /api/v1/pages: clean company website Markdown ($0.00 cached / $0.01 live). */
export default defineEndpoint({
    meta: {
        displayName: "Dealport Fetch Company Pages",
        summary:
            "Fetch clean company website Markdown by domain or UUID ($0.00 cached / $0.01 per live fetch).",
        description:
            "Fetch clean, SSRF-guarded Markdown across key company web pages " +
            "(`/`, `/about`, `/services`, `/capabilities`, or custom `paths`) " +
            "for 1 to 10 companies by `domains`, `company_ids`, or `targets`. " +
            "Pages served from Dealport's 30-day cache or unreachable hosts " +
            "cost $0.00; live website fetches cost $0.01 per company.",
        docsUrl: "https://dealport.com/docs",
        categories: ["web-extraction", "company-enrichment"],
        notes: [
            "Serves from the 30-day cache at $0.00 unless `force_refresh` is " +
            "true or the company has no cached snapshot; unreachable websites " +
            "settle at $0.00.",
        ],
    },
    request: { method: "POST", path: "/api/v1/pages" },
    input: {
        schema: {
            body: z.union([
                zWithRefreshDefault.required({ company_ids: true }),
                zWithRefreshDefault.required({ domains: true }),
                zWithRefreshDefault.required({ targets: true }),
            ]).describe(
                "Provide at least one target list: `domains`, `company_ids`, or `targets`.",
            ),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "live website fetches",
            description:
                "companies fetched live ($0.00 when served from the 30-day cache or unreachable)",
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const combined = [
                ...(data.input.body.company_ids ?? []),
                ...(data.input.body.domains ?? []),
                ...(data.input.body.targets ?? []),
            ];
            const unique = combined.filter(
                (item, index) => combined.indexOf(item) === index,
            ).length;
            return { counts: { RESULT: unique } };
        },
        evidence: ({ data, utils }) => {
            const costUsd = utils.json.optionalNum(data.output, "$.cost_usd");
            const cents = utils.json.optionalNum(
                data.output,
                "$.credits_charged",
            );
            if (costUsd === 0 || cents === 0) {
                return { counts: { RESULT: 0 } };
            }
            return {
                counts: {
                    RESULT: utils.json.optionalNum(
                        data.output,
                        "$.data.live_fetched_count",
                    ) ?? 0,
                },
            };
        },
    },
});
