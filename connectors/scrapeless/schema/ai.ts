import { z } from "zod";
import { zHttpUrl } from "./common.ts";

const zPrompt = z.strictObject({
    prompt: z.string().min(1).describe("Prompt sent to this engine."),
    country: z.string().min(1).describe(
        "Country/region supported by this engine; availability requires supplier verification.",
    ),
});
const zShare = z.boolean().optional().describe(
    "Whether to fetch the engine share link.",
);
const geo = { location: z.string().optional(), uule: z.string().optional() };
const zGoogleAi = zPrompt.extend({
    shopping: z.boolean().optional(),
    ...geo,
    should_fetch_share_link: zShare,
});
const zGoogleGeo = z.union([
    zGoogleAi.omit({ uule: true }),
    zGoogleAi.omit({ location: true }),
]);

export const AI_INPUTS = {
    chatgpt: zPrompt.extend({
        web_search: z.boolean().optional(),
        shopping: z.boolean().optional(),
        should_fetch_share_link: zShare,
    }),
    perplexity: zPrompt.extend({
        web_search: z.boolean().optional(),
        should_fetch_share_link: zShare,
    }),
    copilot: zPrompt.extend({
        mode: z.enum(["search", "smart", "chat", "reasoning", "study"]),
        should_fetch_share_link: zShare,
    }),
    gemini: zPrompt.extend({ shopping: z.boolean().optional() }),
    aimode: z.union([
        zGoogleGeo,
        z.strictObject({
            url: zHttpUrl.describe(
                "Complete AI Mode link; mutually exclusive with all other inputs. Known share.google/aimode redirects are expanded before the sole task submission; unresolved/foreign redirects fail without creating a task.",
            ),
        }),
    ]),
    overview: zGoogleGeo,
    grok: zPrompt.extend({
        mode: z.enum([
            "MODEL_MODE_FAST",
            "MODEL_MODE_EXPERT",
            "MODEL_MODE_AUTO",
        ]),
        should_fetch_share_link: zShare,
    }),
    alexa: zPrompt,
} as const;

export function aiBody(actor: keyof typeof AI_INPUTS) {
    const name = `scraper.${actor}`;
    return z.strictObject({
        actor: z.literal(name).default(name),
        input: AI_INPUTS[actor],
        webhook: z.strictObject({
            url: z.url({ protocol: /^https$/ }).optional(),
        }).optional()
            .describe(
                "Optional additional delivery. This connector still polls and does not host a webhook receiver.",
            ),
    });
}
