import { z } from "zod";
import {
    glassdoorEmployerMustMatch,
    zGlassdoorEmployerBody,
} from "../../../schema/glassdoor.ts";

/** `POST /glassdoor/company-salaries` request body, the vendor mirror. */
export const zGlassdoorCompanySalariesBody = zGlassdoorEmployerBody({
    maxSalaries: z.number().int().min(1).max(250).optional().describe(
        "Maximum salary entries (job titles) to return (1-250, and not " +
            "above your plan's limit). Vendor default 20.",
    ),
    jobTitle: z.string().optional().describe(
        'Job title keyword to filter salaries, e.g. "Senior Software ' +
            'Engineer". Vendor default "" (all titles).',
    ),
    fields: z.array(z.enum([
        "*",
        "jobTitle",
        "employer",
        "basePayStatistics",
        "totalPayStatistics",
        "payPeriod",
        "currency",
        "totalAdditionalPayStatistics",
    ])).optional().describe(
        "Fields to include per salary. Omit for the defaults (jobTitle, " +
            "employer, basePayStatistics, totalPayStatistics, payPeriod). " +
            'Use ["*"] for every field.',
    ),
}, glassdoorEmployerMustMatch);
