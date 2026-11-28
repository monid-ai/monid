import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompany } from "../../schema/company.ts";

/** `POST /companies/resolve` — a company's name, domain, LinkedIn page and
 *  logo from its name, domain or LinkedIn URL, free. SYNC. A company nothing
 *  matches is a `200 not_found`, never a guess. */
export default defineEndpoint({
    meta: {
        displayName: "Look Up a Company",
        summary:
            "Turn a company name, website domain or LinkedIn URL into its name, domain, LinkedIn page and logo.",
        description: "Turn a company name, website domain or LinkedIn URL " +
            "into one company: its name, domain, LinkedIn page and logo. " +
            "Free. Send at least one of `name`, `domain` or `linkedinUrl`. " +
            "When several are sent, only the most precise is looked up: " +
            "`linkedinUrl`, then `domain`, then `name`. A name resolves to " +
            "the best-known company of that name, so send a domain for a " +
            "common name. The answer carries `status` (`found` or " +
            "`not_found`) and `company` (`name`, `domain`, `linkedinUrl` " +
            "and `logoUrl`, each null when unknown; `company` itself is " +
            "null when nothing matches). A company nothing matches is " +
            "`not_found`, never a guess. Next: pass the `domain` to " +
            "`outbound-dev#companies/people` for the people who work there.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/companies/resolve-a-company",
        categories: ["company-enrichment"],
    },
    request: { method: "POST", path: "/companies/resolve" },
    input: { schema: { body: zCompany } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
