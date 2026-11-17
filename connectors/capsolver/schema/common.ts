import { z } from "zod";

export const zWebsite = z.object({
    websiteURL: z.url().describe(
        "Full URL of the page that presents the CAPTCHA challenge.",
    ),
    websiteKey: z.string().min(1).describe(
        "Public site key from the CAPTCHA widget.",
    ),
}).strict();

// Output schemas describe the vendor response without dropping added fields.
// The lifecycle validates success before billing; optional fields here keep
// vendor metadata from turning a completed task into a presentation failure.
const zTaskResult = z.object({
    errorId: z.number().optional(),
    taskId: z.string().optional(),
    status: z.string().optional(),
}).passthrough();

export const zReCaptchaOutput = zTaskResult.extend({
    solution: z.object({
        gRecaptchaResponse: z.string().optional().describe("reCAPTCHA token."),
    }).passthrough().optional(),
});

export const zTurnstileOutput = zTaskResult.extend({
    solution: z.object({
        token: z.string().optional().describe("Turnstile token."),
    }).passthrough().optional(),
});
