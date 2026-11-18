import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zSanctionsCheckQueryParams } from "./schema/inputs.ts";

/** GET /sanctions/check - $0.009 per successful call; errors are free. */
export default defineEndpoint({
    meta: {
        displayName: "Glyphcall Sanctions Check",
        summary:
            "Screen a person, company or crypto address against OFAC SDN and the EU, UN and UK sanctions lists.",
        description:
            "Sanctions screening with a block, review or pass verdict: a crypto " +
            "address against the OFAC SDN list, and a person or company name " +
            "against OFAC, EU, UN and UK lists (lists=all by default) where " +
            "every word of the name must appear in a listed name or alias. " +
            "Returns the matching entries with their programs. An aid to " +
            "screening, not legal advice. Will not: screen PEPs or adverse " +
            "media.",
        docsUrl: "https://glyphcall.com/tools/sanctions-check",
        categories: ["compliance"],
        notes: [
            "$0.009 per successful call. Refused inputs and unanswered sources are free.",
            "Give address, name or both.",
        ],
    },
    request: { method: "GET", path: "/sanctions/check" },
    input: { schema: { queryParams: zSanctionsCheckQueryParams } },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "check",
            consumes: { credit: "default", amount: 0.009 },
        },
    },
});
