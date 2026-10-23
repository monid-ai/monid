import { z } from "zod";
import {
    glassdoorEmployerMustMatch,
    zGlassdoorEmployerBody,
} from "../../../schema/glassdoor.ts";

/** `POST /glassdoor/company-jobs` request body, the vendor mirror. */
export const zGlassdoorCompanyJobsBody = zGlassdoorEmployerBody({
    maxJobs: z.number().int().min(1).max(250).optional().describe(
        "Maximum job listings to return (1-250, and not above your plan's " +
            "limit). Vendor default 20.",
    ),
    fields: z.array(z.enum(["*", "job", "header", "overview"])).optional()
        .describe(
            "Sections to include per job. Omit for the defaults (job, " +
                'header). Use ["*"] to add overview (company overview).',
        ),
}, glassdoorEmployerMustMatch);
