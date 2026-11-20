import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompanyLiveFetchBody } from "./schema/inputs.ts";

/** POST /v1/linkedin-live-fetch/company/single — one live company fetch. */
export default defineEndpoint({
    meta: {
        displayName: "Live Fetch LinkedIn Company",
        summary: "Fetch a LinkedIn company page live: firmographics, " +
            "headcount, industry, locations.",
        description: "Fetch a company's LinkedIn page in real time from a " +
            "slug, company URL, LinkedIn organization ID, or Fiber company " +
            "ID. Returns { output: { company } } — name, description, " +
            "website and domains, industry, employee count, headquarters " +
            "and office locations, founding year, specialties, follower " +
            "count, and logo. Set getHistoricalHeadcount for employee " +
            "count over time and growth trends. Use " +
            "fiber#kitchen-sink/company first when you only have a name " +
            "or domain.",
        docsUrl: "https://api.fiber.ai/ai-docs/companyLiveEnrich.md",
        categories: ["linkedin", "company-enrichment"],
        notes: [
            "A company LinkedIn does not serve answers 404 `{message}`; " +
            "Fiber still bills that lookup on its side, but here it " +
            "settles as a provider error with zero usage.",
        ],
    },
    request: { method: "POST", path: "/linkedin-live-fetch/company/single" },
    input: { schema: { body: zCompanyLiveFetchBody } },
    usage: {
        /** `liveEnrichCompany` — 2 credits per company fetched (Fiber
         *  platform default). Estimate and evidence are
         *  compiler-synthesized (flat model). */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "company live fetch",
            consumes: { credit: "default", amount: 2 },
        },
    },
});
