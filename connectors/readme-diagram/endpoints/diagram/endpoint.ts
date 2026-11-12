import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zDiagramPathParams } from "./schema/inputs.ts";

/** GET /{owner}/{repo}.svg — the animated SVG diagram of a README (free). */
export default defineEndpoint({
    meta: {
        displayName: "Diagram a Repository README",
        summary: "Draw an animated SVG diagram of a public GitHub " +
            "repository's README.",
        description: "Reads the repository's README and returns an animated " +
            "SVG, 1080 by 400, with three cards: the languages, " +
            "frameworks and services the README mentions, its sections, " +
            "and its code blocks. No LLM, so the same README always gives " +
            "the same image. The output is the SVG markup as a string, " +
            "ready to save as a .svg file or embed in a README. Works on " +
            "public repositories only. Does not read private repositories " +
            "or text that is not on GitHub.",
        docsUrl: "https://github.com/flisk-sh/readme-diagram#readme",
        categories: ["image-generation"],
    },
    // The native path carries `{owner}` / `{repo}` placeholders, which an
    // endpoint identity cannot (design D1): pinned to a plain name.
    endpoint: "/diagram",
    request: { method: "GET", path: "/{owner}/{repo}.svg" },
    input: { schema: { pathParams: zDiagramPathParams } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
