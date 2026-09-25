import { z } from "zod";

/** POST /enrich/profile request body (docs "Request Body"). The vendor
 *  requires at least one `enrich_*` flag set to true; that cross-field rule
 *  lives at the binding. */
export const zEnrichProfileBody = z.object({
    profile_identifier: z.string().min(1).describe(
        "The person to enrich: a profile id from /search/people " +
            "(`prof_...`, recommended), a profile URL " +
            "(`https://www.linkedin.com/in/john-doe` or " +
            "`linkedin.com/in/john-doe`), its public slug (`john-doe`), or " +
            "an X handle or URL (`@janedoe`, `x.com/janedoe`).",
    ),
    enrich_profile: z.boolean().optional().describe(
        "Full profile: experience, education, skills, certifications, " +
            "languages (1.5 credits).",
    ),
    enrich_work_email: z.boolean().optional().describe(
        "Professional email address (1 credit, only when found).",
    ),
    enrich_personal_email: z.boolean().optional().describe(
        "Personal email address (3 credits, only when found).",
    ),
    enrich_phone: z.boolean().optional().describe(
        "Phone number (10 credits, only when found).",
    ),
    enrich_github: z.boolean().optional().describe(
        "GitHub profile: repositories, contributions, pinned repos. Needs " +
            "a GitHub link on the profile; also returns the full profile.",
    ),
});
