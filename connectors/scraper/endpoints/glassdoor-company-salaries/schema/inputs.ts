import { z } from "zod";
import {
    glassdoorEmployerMustMatch,
    zGlassdoorEmployerBody,
} from "../../../schema/glassdoor.ts";

/** `POST /glassdoor/company-salaries` request body, the vendor mirror. */
export const zGlassdoorCompanySalariesBody = zGlassdoorEmployerBody({
    maxSalaries: z.number().int().min(1).max(250).describe(
        "Maximum salary entries (job titles) to return (1-250, and not " +
            "above your plan's limit). Vendor default 20.",
    ).optional(),
    jobTitle: z.string().describe(
        'Job title keyword to filter salaries, e.g. "Senior Software ' +
            'Engineer". Vendor default "" (all titles).',
    ).optional(),
    fields: z.array(z.enum([
        "*",
        "jobTitle",
        "employer",
        "basePayStatistics",
        "totalPayStatistics",
        "payPeriod",
        "currency",
        "totalAdditionalPayStatistics",
    ])).describe(
        "Fields to include per salary. Omit for the defaults (jobTitle, " +
            "employer, basePayStatistics, totalPayStatistics, payPeriod). " +
            'Use ["*"] for every field.',
    ).optional(),
}, glassdoorEmployerMustMatch);
