import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zPhoneFinderQueryParams } from "./schema/inputs.ts";

/** GET /phone-finder — phone numbers from an email, a domain, or LinkedIn. */
export default defineEndpoint({
    meta: {
        displayName: "Find Phone Number",
        summary:
            "Find phone numbers for a person or company from an email, a domain, or a LinkedIn profile.",
        description: "Find phone numbers from an email address, a company " +
            "domain, or a LinkedIn profile URL — combine them and the " +
            "numbers found for each are merged without duplicates. Each " +
            "number comes with its validity, local / international / E.164 " +
            "/ RFC 3966 formats, country, line type (mobile, fixed line, " +
            "…), carrier, region, and time zones. Returns one number " +
            "(preferring a valid one), or every number found with " +
            "full=true. Nothing found is a 200 with an empty data array, " +
            "free. Suited for adding a call channel to outreach.",
        docsUrl: "https://docs.tomba.io/api/phone#phone-finder",
        categories: ["people-enrichment"],
        notes: [
            "Charged only when a valid number is returned: 5 search credits, " +
            "or 1 when the request includes domain.",
        ],
    },
    request: { method: "GET", path: "/phone-finder" },
    input: {
        schema: {
            queryParams: z.union([
                zPhoneFinderQueryParams.required({ email: true }),
                zPhoneFinderQueryParams.required({ domain: true }),
                zPhoneFinderQueryParams.required({ linkedin: true }),
            ]).describe(
                "Provide at least one of email, domain, or linkedin.",
            ),
        },
    },
    usage: {
        /** One lookup, two published prices — the input selects the line
         *  (design D6; a selection rule is a COUNTING rule, D19). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                lookup: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "phone lookups",
                    description: "lookups by email or LinkedIn that " +
                        "returned a valid number",
                    consumes: { credit: "search", amount: 5 },
                },
                domain_lookup: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "phone lookups with a domain",
                    description: "lookups including domain that returned a " +
                        "valid number",
                    consumes: { credit: "search", amount: 1 },
                },
            },
        },
        estimate: ({ data }) => {
            const withDomain =
                typeof data.input.queryParams.domain === "string";
            return {
                counts: {
                    lookup: withDomain ? 0 : 1,
                    domain_lookup: withDomain ? 1 : 0,
                },
            };
        },
        /** Charged once when ANY returned number is valid — `data` is one
         *  number, an array of them (full=true), or `[]` on a miss. */
        evidence: ({ data, utils }) => {
            const body = utils.json.optionalGet(data.output, "$.data");
            const entries = Array.isArray(body) ? body : [body];
            const valid = entries.some((entry) =>
                entry !== null && typeof entry === "object" &&
                !Array.isArray(entry) && entry.valid === true
            );
            const withDomain =
                typeof data.input.queryParams?.domain === "string";
            return {
                counts: {
                    lookup: valid && !withDomain ? 1 : 0,
                    domain_lookup: valid && withDomain ? 1 : 0,
                },
            };
        },
    },
});
