import { z } from "zod";

/** `GET /skills/{skill_id}/manifest`. */
export const zSkillManifestPathParams = z.strictObject({
    skill_id: z.string().min(1).describe(
        "The skill's id, such as `concierge`. voygr#list-skills lists them. " +
            "An unknown id is a 404 that names the skills that exist.",
    ),
});
