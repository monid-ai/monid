import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBuiltwithTechstackBody } from "./schema/inputs.ts";

/**
 * Mindcase `builtwith/techstack`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "BuiltWith Tech Stack",
        summary: "The technologies a website runs on, as detected by " +
            "BuiltWith. Pass the domains to profile.",
        description: "The technologies a website runs on, as detected by " +
            "BuiltWith. Pass the domains to profile. Returns one row per " +
            "tech stack with domain, technologies. To find every company " +
            "using one technology use mindcase#companies/by-technology; " +
            "for the full company profile use " +
            "mindcase#companies/enrichment. $0.004 per tech stack; empty " +
            "runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/builtwith/techstack",
        categories: ["company-enrichment"],
    },
    endpoint: "/builtwith/techstack",
    request: { method: "POST", path: "/v1/data/builtwith/techstack/run" },
    input: {
        schema: {
            body: zBuiltwithTechstackBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.004 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.domains.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
