import { defineProvider } from "@shared/core";
import { z } from "zod";

/**
 * README Diagram (diagram.flisk.si) — turns a GitHub README into an animated
 * SVG diagram. One synchronous GET against `https://diagram.flisk.si`.
 *
 * README Diagram is free and needs no API key, so this provider declares an
 * EMPTY credentials shape and a pass-through `auth.inject` (the request leaves
 * as built). Every endpoint is FREE: nothing is metered and no credit system
 * is declared.
 *
 * The service also has `POST /render` (raw Markdown in the body), which is NOT
 * exposed: the engine's transport always sends a JSON-stringified body, and
 * `/render` reads the body as raw Markdown.
 */
export default defineProvider({
    name: "readme-diagram",
    meta: {
        displayName: "README Diagram",
        summary: "Turn a public GitHub README into an animated SVG diagram.",
        description: "README Diagram — draws the architecture of a project " +
            "from its README, with no LLM: it reads the headings, the code " +
            "fences and the stack the README mentions (languages, " +
            "frameworks, services, sections) and lays them out as a " +
            "three-card animated SVG. The same README always gives the " +
            "same picture, so the SVG can be committed or embedded in the " +
            "README itself.",
        homepageUrl: "https://diagram.flisk.si",
        docsUrl: "https://github.com/flisk-sh/readme-diagram#readme",
        categories: ["image-generation"],
        notes: [
            "Free and keyless: no credentials are needed, and nothing is " +
            "billed.",
            "The answer is SVG markup, returned as a string (it is not " +
            "JSON). An unknown or private repository answers 404 with the " +
            "plain text `not-found`.",
            "Diagrams are cached for a day at the edge.",
        ],
    },
    auth: {
        // No secret exists. The pass-through keeps the request as built.
        inject: ({ data }) => data.request,
        credentials: z.object({}),
    },
    request: { baseUrl: "https://diagram.flisk.si" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
});
