import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zKitchenSinkCompanyBody } from "./schema/inputs.ts";

/** POST /v1/kitchen-sink/company — resolve a company from loose inputs. */
export default defineEndpoint({
    meta: {
        displayName: "Find Company",
        summary: "Resolve a company from a name, domain, LinkedIn URL, or " +
            "location.",
        description: "Find a company from whatever you have — a LinkedIn " +
            "slug, URL, or organization ID; a name; a domain; or a " +
            "headquarters location to break ties. Returns { output: { " +
            "data: [company] } } best match first, each with name, " +
            "domains, LinkedIn URL and org ID, industry, employee count, " +
            "headquarters, description, and funding / revenue estimates " +
            "where known. Provide at least one of companyIdentifier, " +
            "companyName, or companyDomain. Use this as the entry point " +
            "when a caller only has a company name or website; pass the " +
            "returned LinkedIn slug to fiber#linkedin-live-fetch/company/" +
            "single for a live refresh.",
        docsUrl: "https://api.fiber.ai/ai-docs/kitchenSinkCompany.md",
        categories: ["company-enrichment"],
        notes: [
            "Give at least one of companyIdentifier, companyName, or " +
            "companyDomain; companyLocation alone only re-ranks and does " +
            "not identify a company.",
            "No match answers 200 with an empty `data` and a `message`, and " +
            "costs nothing.",
        ],
    },
    request: { method: "POST", path: "/kitchen-sink/company" },
    input: {
        schema: {
            // numCompanies caps the charge: Fiber's default materialized
            // at the binding (D25) so the estimate reads a number.
            body: zKitchenSinkCompanyBody.extend({
                numCompanies: zKitchenSinkCompanyBody.shape.numCompanies
                    .unwrap().default(1),
            }),
        },
    },
    usage: {
        /** `kitchenSinkCompany` — 2 credits per company returned (Fiber
         *  platform default). */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "companies found",
            consumes: { credit: "default", amount: 2 },
        },
        estimate: ({ data }) => ({
            counts: { "RESULT": data.input.body.numCompanies },
        }),
        evidence: ({ data, utils }) => ({
            counts: {
                "RESULT":
                    utils.json.optionalLen(data.output, "$.output.data") ??
                        0,
            },
        }),
    },
});
