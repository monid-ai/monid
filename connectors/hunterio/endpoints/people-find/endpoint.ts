import { defineEndpoint, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zPeopleFindQueryParams } from "./schema/inputs.ts";

/** GET /people/find — a person profile from an email or LinkedIn handle. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Person",
        summary:
            "Look up a person's profile from their email address or LinkedIn handle.",
        description: "Resolve an email address (or LinkedIn handle) into " +
            "a person profile. Returns full/given/family name, location " +
            "with city/state/country and lat/lng, timezone, employment " +
            "(company domain, name, title, role, seniority), and social " +
            "handles (LinkedIn, Twitter, GitHub, Facebook), plus activity " +
            "dates, in the Clearbit-compatible camelCase shape. An " +
            "unknown address answers 404 and costs nothing. Suited for " +
            "identifying inbound leads, completing CRM records, and " +
            "qualifying who is behind an address. For the employer's " +
            "profile in the same call, pass the email to /combined/find.",
        docsUrl: "https://hunter.io/api-documentation/v2#email-enrichment",
        categories: ["people-enrichment"],
        notes: ["A miss (404) costs nothing."],
    },
    request: { method: "GET", path: "/people/find" },
    input: {
        schema: {
            queryParams: z.union([
                zPeopleFindQueryParams.required({ email: true }),
                zPeopleFindQueryParams.required({ linkedin_handle: true }),
            ]).describe(
                "Provide at least one of email or linkedin_handle " +
                    "(linkedin_handle wins when both are given).",
            ),
        },
    },
    usage: {
        /** 0.2 credit per hit — v1's 2026-08-20 ledger drill (design D3);
         *  a 404 miss is error-as-data, zero usage. */
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "profiles",
            consumes: { credit: "default", amount: 0.2 },
        },
    },
});
