import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zPersonEnrichBody } from "./schema/inputs.ts";

/** POST /person/enrich — Person Base (NO PII) access, $0.013 per matched call. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person Base (NO PII)",
        summary: "Enrich a person using Person Base (NO PII) credentials.",
        description:
            "Resolve person identifiers to matching profiles with Person Base (NO PII) access. " +
            "PII fields are restricted by the supplied key. " +
            "Fields and access depend on the vendor contract, not client-side redaction. " +
            "Optional limit (1-10); multiple_results requires enterprise permission. " +
            "Returns matches and total; unmatched records return 404. " +
            "This endpoint does not perform search or natural-language discovery.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/person-enrichment",
        categories: ["people-enrichment"],
    },
    // Variants share a native route but require distinct Monid identities.
    endpoint: "/person/enrich/base-no-pii",
    request: { method: "POST", path: "/person/enrich" },
    auth: {
        credentials: z.object({ personBaseNoPiiApiKey: z.string().min(1) }),
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                "API-Key": data.params.personBaseNoPiiApiKey,
            },
        }),
    },
    input: { schema: { body: zPersonEnrichBody } },
    usage: {
        // Binary provider evidence excludes empty 200s; PER_CALL would bill them.
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "successful matched calls",
            description:
                "One billable outcome per successful matched call, regardless of match count; no match is free.",
            consumes: { credit: "default", amount: 0.013 },
        },
        // Reserve one call, independent of the requested match limit.
        estimate: () => ({ counts: { RESULT: 1 } }),
    },
});
