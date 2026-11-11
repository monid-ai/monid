import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zDomainSearchQueryParams } from "./schema/inputs.ts";

/** GET /domain-search — one page of the addresses Tomba has for a company. */
export default defineEndpoint({
    meta: {
        displayName: "Find Domain Emails",
        summary:
            "List the email addresses Tomba has for a company domain, with names, titles, and verification status.",
        description: "Return the company behind a domain (name, location, " +
            "industry, size, revenue, social links, email pattern) and one " +
            "page of the email addresses Tomba has for it — each with first " +
            "and last name, job title, department, seniority, country, " +
            "LinkedIn, a 0-100 confidence score, verification status, and " +
            "the public pages it was found on. Filter by department, " +
            "country, and personal/generic type; paginate with page and " +
            "limit (meta.total is the total). Optionally add each person's " +
            "phone numbers with enrich_mobile. Suited for building outreach " +
            "lists and mapping a company's team. To size a domain first, " +
            "use /email-count; to verify an address, /email-verifier.",
        docsUrl: "https://docs.tomba.io/api/finder#domain-search",
        categories: ["people-enrichment"],
        notes: [
            "The cost follows the REQUESTED limit, not the number of " +
            "addresses returned: 1 search credit per 10 requested, rounded " +
            "up — charged only when at least one address comes back.",
            "A domain with no known addresses, or a webmail / disposable " +
            "domain such as gmail.com, returns 200 with an empty " +
            "`data.emails` and costs nothing.",
        ],
    },
    request: { method: "GET", path: "/domain-search" },
    input: {
        schema: {
            // `limit` REQUIRED at the binding (design D25): it is the
            // estimate's whole basis (vendor default 10), so the caller
            // states it. "domain or company" is the vendor's rule, bound
            // as a union (clay D13).
            queryParams: z.union([
                zDomainSearchQueryParams.required({
                    domain: true,
                    limit: true,
                }),
                zDomainSearchQueryParams.required({
                    company: true,
                    limit: true,
                }),
            ]).describe(
                "Provide domain or company, and the page size in limit.",
            ),
        },
    },
    usage: {
        /** Two lines, one pool (design D6): 1 search credit per started
         *  block of 10 REQUESTED addresses, plus 5 per returned address
         *  carrying phone data. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                results: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "requested addresses",
                    description: "addresses requested with limit, billed " +
                        "per started block of ten when any come back",
                    every: 10,
                    consumes: { credit: "search", amount: 1 },
                },
                phones: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "addresses with phone data",
                    description: "returned addresses carrying phone numbers " +
                        "(enrich_mobile=true)",
                    consumes: { credit: "search", amount: 5 },
                },
            },
        },
        /** The worst case: the full requested page, every address with
         *  phone data when enrich_mobile is set. */
        estimate: ({ data }) => {
            const q = data.input.queryParams;
            return {
                counts: {
                    results: q.limit,
                    phones: q.enrich_mobile === true ? q.limit : 0,
                },
            };
        },
        /** Charged only when `data.emails[]` is non-empty; the basis is
         *  the requested limit, the phone line the addresses whose
         *  `phone_data` is non-empty. */
        evidence: ({ data, utils }) => {
            const emails = utils.json.optionalGet(data.output, "$.data.emails");
            if (!Array.isArray(emails) || emails.length === 0) {
                return { counts: { results: 0, phones: 0 } };
            }
            const limit = data.input.queryParams?.limit;
            const phones = emails.filter((entry) =>
                entry !== null && typeof entry === "object" &&
                !Array.isArray(entry) && Array.isArray(entry.phone_data) &&
                entry.phone_data.length > 0
            ).length;
            return {
                counts: {
                    results: typeof limit === "number" ? limit : emails.length,
                    phones,
                },
            };
        },
    },
});
