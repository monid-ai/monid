import { z } from "zod";
import { zCompanyIdentifier, zLocation } from "../../../schema/common.ts";

/** Body of POST /v1/kitchen-sink/company (kitchenSinkCompany). */
export const zKitchenSinkCompanyBody = z.object({
    companyIdentifier: zCompanyIdentifier.optional().describe(
        "A LinkedIn identifier for the company (slug, URL, or organization " +
            "ID). The most accurate and fastest input; with it, companyName " +
            "and companyDomain are not needed.",
    ),
    companyName: z.object({
        value: z.string().min(1).describe(
            "The company's name. All input words must match.",
        ),
    }).describe("The company's name.").optional(),
    companyDomain: z.object({
        value: z.string().min(1).describe(
            "The company's domain (e.g. 'stripe.com'). URL prefixes " +
                "(https, www) are stripped; subdomains and paths are kept " +
                "(e.g. 'my-company.netlify.app').",
        ),
    }).describe("The company's domain.").optional(),
    companyLocation: zLocation.optional().describe(
        "Headquarters location — disambiguates companies with similar names " +
            "or domains.",
    ),
    numCompanies: z.number().int().min(1).max(10).describe(
        "Maximum number of companies to return, best match first (1-10). " +
            "Each company returned is charged. Fiber default 1.",
    ).optional(),
});
