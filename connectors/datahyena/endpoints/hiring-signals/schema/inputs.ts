import { z } from "zod";
import { zCountries, zDomain, zListPaging } from "../../../schema/common.ts";

/** GET /hiring-signals query params. */
export const zHiringSignalsQueryParams = z.object({
    eventType: z.array(z.string().min(1)).min(1).optional().describe(
        "Signal types (OR): leadership_opening, founding_role, " +
            "role_family_scaling, technology_hiring, team_buildout, " +
            "hiring_surge and more.",
    ),
    function: z.array(z.string().min(1)).min(1).optional().describe(
        "Job functions (OR): engineering, data, security, product, design, " +
            "sales, marketing, customer_success, operations and more.",
    ),
    seniority: z.array(z.enum([
        "c_level",
        "vp_level",
        "head",
        "director",
        "manager",
        "senior",
        "individual",
        "entry",
        "intern",
    ])).min(1).optional().describe("Seniority (OR)."),
    technologies: z.array(z.string().min(1)).min(1).optional().describe(
        "Technologies the roles name (OR), e.g. snowflake.",
    ),
    roleFamily: z.array(z.string().min(1)).min(1).optional().describe(
        "Role families (OR), e.g. sales_development, revops.",
    ),
    activeOnly: z.boolean().optional().describe(
        "Only signals whose roles are still open.",
    ),
    countries: zCountries.optional(),
    domain: zDomain.optional(),
    companyId: z.string().min(1).optional().describe("Datahyena company id."),
    ...zListPaging,
}).strict();
