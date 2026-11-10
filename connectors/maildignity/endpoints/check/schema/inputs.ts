import { z } from "zod";

export const zMaildignityCheckBody = z.strictObject({
    email_text: z.string().min(1).describe(
        "The full text or draft of the email to audit.",
    ),
    prospect: z.strictObject({
        name: z.string().optional().describe("Prospect's full name."),
        company: z.string().optional().describe("Prospect's company."),
        role: z.string().optional().describe("Prospect's job title or role."),
    }).optional().describe(
        "Optional recipient context (name, company, role) to evaluate personalization and fit.",
    ),
    mode: z.enum(["full", "fast"]).describe(
        "Audit mode: 'full' evaluates all issues with suggested rewrites; 'fast' performs a lightweight scan.",
    ).optional(),
});
