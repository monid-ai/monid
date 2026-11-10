import { z } from "zod";

export const conversationFields = {
    session_id: z.string().max(100).describe(
        "Stable conversation identifier. Generate once and reuse for related search/fetch calls.",
    ).optional(),
    model_name: z.string().max(100).describe(
        "Exact model identifier from trusted runtime configuration; omit if unknown.",
    ).optional(),
};
