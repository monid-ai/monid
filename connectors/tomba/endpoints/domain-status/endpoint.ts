import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zDomainStatusQueryParams } from "./schema/inputs.ts";

/** GET /domain-status — webmail / disposable check (free). */
export default defineEndpoint({
    meta: {
        displayName: "Check Domain Status",
        summary:
            "Check whether a domain or an email's domain is webmail or disposable.",
        description: "Tell whether a domain — or the domain of an email " +
            "address — belongs to a webmail provider such as Gmail or to a " +
            "disposable email provider. The response is a flat object " +
            "(not wrapped in data) repeating the domain or email sent, with " +
            "webmail and disposable booleans. Suited for filtering sign-ups " +
            "and skipping paid lookups on personal or throwaway addresses. " +
            "Free.",
        docsUrl: "https://docs.tomba.io/api/domain#domain-status",
        categories: ["people-enrichment"],
        notes: [
            "A value that fails validation returns 200 with " +
            "`{webmail: false, disposable: true}`, not an error.",
        ],
    },
    request: { method: "GET", path: "/domain-status" },
    input: {
        schema: {
            queryParams: z.union([
                zDomainStatusQueryParams.required({ domain: true }),
                zDomainStatusQueryParams.required({ email: true }),
            ]).describe(
                "Provide domain or email (domain wins when both are given).",
            ),
        },
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
