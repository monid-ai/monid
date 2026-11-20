import { z } from "zod";
import {
    zGetDetailedEducation,
    zGetDetailedWorkExperience,
} from "../../../schema/common.ts";

/** Body of POST /v1/linkedin-live-fetch/profile/single (profileLiveEnrich). */
export const zProfileLiveFetchBody = z.object({
    identifier: z.string().min(1).describe(
        "The person's LinkedIn slug (e.g. 'williamhgates'), full LinkedIn " +
            "URL (e.g. 'https://www.linkedin.com/in/williamhgates/'), Sales " +
            "Navigator URN, or LinkedIn user ID (e.g. '443105112').",
    ),
    getDetailedEducation: zGetDetailedEducation.optional(),
    getDetailedWorkExperience: zGetDetailedWorkExperience.optional(),
});
