import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineProvider({
    name: "appear",
    meta: {
        displayName: "Appear",
        summary: "Measure how much of a website AI crawlers can read.",
        homepageUrl: "https://joinappear.com",
        docsUrl: "https://joinappear.com/how-ai-sees-you",
        categories: ["geo"],
    },
    auth: {
        credentials: z.looseObject({}),
        inject: ({ data }) => data.request,
    },
    request: { baseUrl: "https://joinappear.com" },
    usage: { model: { kind: UsageModelKind.FREE } },
});
