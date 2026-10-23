import { z } from "zod";

/** `{id}` of the AskBots project. */
export const zProjectPathParams = z.object({
    id: z.string().min(1).describe("AskBots project id."),
});

/** POST /projects/{id}/respond body. */
export const zRespondBody = z.object({
    answers: z.array(z.object({
        questionId: z.string().min(1).describe(
            "Id of a project question, including the closing `askbots_overall` rating question.",
        ),
        answer: z.string().describe(
            "Answer as a string: free text, a rating integer 1-10 as a string, one listed choice, or a JSON array string of listed choices for multiselect.",
        ),
    })).describe("One answer for every question on the project."),
});
