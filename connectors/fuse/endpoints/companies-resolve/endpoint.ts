import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCompany } from "../../schema/company.ts";

/** `POST /data/companies/resolve` — a company's domain, LinkedIn page and
 *  logo from its name, domain or LinkedIn URL, free. SYNC. A company nothing
 *  matches is a `200 not_found`, never a guess. */
export default defineEndpoint({
    meta: {
        displayName: "Resolve Company",
        summary:
            "Find a company's website domain, LinkedIn page and logo from its name, domain or LinkedIn URL, free.",
        description: "Find a company's website domain, LinkedIn company " +
            "page and logo from its name, website domain or LinkedIn URL. " +
            "Free: nothing is charged. Send at least one of `name` (e.g. " +
            "Stripe), `domain` (e.g. stripe.com; a full URL is reduced to " +
            "its domain) or `linkedinUrl` (e.g. linkedin.com/company/" +
            "stripe). When several are sent, only the most precise is looked " +
            "up: `linkedinUrl`, then `domain`, then `name`. A name resolves " +
            "to the best-known company of that name, so send a domain or " +
            "LinkedIn page for common names. The answer carries `status` " +
            "(`found` or `not_found`) and `company` (`name`, `domain`, " +
            "`linkedinUrl` and `logoUrl`, each null when unknown; `company` " +
            "itself is null when nothing matches). A company nothing matches " +
            "is `not_found`, never a guess. Next: pass the `domain` to " +
            "`fuse#companies/search` as `filters.domains` for the full " +
            "company record, or to `fuse#prospects/search` as " +
            "`filters.job_company_website` for the people who work there.",
        categories: ["company-enrichment"],
        notes: [
            "429 RATE_LIMITED also answers when Fuse's company data provider " +
            "is busy: retry shortly.",
        ],
    },
    request: { method: "POST", path: "/data/companies/resolve" },
    input: { schema: { body: zCompany } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
