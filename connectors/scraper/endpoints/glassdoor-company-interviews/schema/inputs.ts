import { z } from "zod";
import {
    glassdoorEmployerMustMatch,
    zGlassdoorEmployerBody,
} from "../../../schema/glassdoor.ts";

/** `POST /glassdoor/company-interviews` request body, the vendor mirror. */
export const zGlassdoorCompanyInterviewsBody = zGlassdoorEmployerBody({
    maxInterviews: z.number().int().min(1).max(250).describe(
        "Maximum interview entries to return (1-250, and not above your " +
            "plan's limit). Vendor default 20.",
    ).optional(),
    fields: z.array(z.enum([
        "*",
        "jobTitle",
        "reviewDateTime",
        "difficulty",
        "outcome",
        "userQuestions",
        "experience",
        "id",
        "advice",
        "countHelpful",
        "employer",
        "employerResponses",
        "featured",
        "negotiationDescription",
        "processDescription",
        "source",
    ])).describe(
        "Fields to include per interview. Omit for the defaults (jobTitle, " +
            "reviewDateTime, difficulty, outcome, userQuestions, " +
            'experience). Use ["*"] for every field.',
    ).optional(),
}, glassdoorEmployerMustMatch);
