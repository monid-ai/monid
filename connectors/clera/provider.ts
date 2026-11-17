import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

/**
 * Clera (getclera.com) — the public job search behind getclera.com/search.
 * Both endpoints are keyless and free: the credential shape is empty and
 * the inject forwards the request untouched.
 */
export default defineProvider({
    name: "clera",
    meta: {
        displayName: "Clera",
        summary: "Search open startup roles on Clera's job board. Free.",
        description: "Clera introduces engineers, operators and sellers to " +
            "early-stage startups. These endpoints search the open roles on " +
            "getclera.com/search: hand-picked startup jobs, mostly pre-seed " +
            "to Series A, with salary ranges, workplace type and visa " +
            "sponsorship on each listing.",
        homepageUrl: "https://www.getclera.com",
        docsUrl: "https://www.getclera.com/search",
        categories: ["jobs"],
    },
    auth: {
        credentials: z.object({}),
        inject: ({ data }) => data.request,
    },
    request: { baseUrl: "https://www.getclera.com" },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
