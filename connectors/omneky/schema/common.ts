import { z } from "zod";

/** Shared by both Omneky endpoints: one brand color (`ColorSwatch`). */
export const zOmnekyColorSwatch = z.object({
    hex: z.string().describe("Hex color code, e.g. #FF5733."),
    label: z.string().describe(
        "Human-readable name or role, e.g. 'Primary Orange' or 'headline'.",
    ).optional(),
});
