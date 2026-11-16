import { z } from "zod";

/**
 * `POST /v1/extract` request body (https://specstream.ai/openapi.json,
 * 2026-11-14). The `pages` form, which reads HTML the caller sends, is not
 * mirrored: an agent here reads pages by their URL.
 */
export const zExtractBody = z.object({
    urls: z.array(z.string().min(1).max(4000)).min(1).max(20).describe(
        "The pages to read, 1 to 20 public http or https addresses. Web " +
            "pages, PDF, Word and Excel files are read. Each comes back " +
            "in the order sent.",
    ),
    format: z.enum(["markdown", "text", "html"]).describe(
        "The form of each page's main text: `markdown` (the default), " +
            "`text` or `html`.",
    ).optional(),
    include: z.array(z.enum(["html", "links", "response", "full_text"]))
        .describe(
            "Extra parts for each page: `links` (the links in the main " +
                "text), `full_text` (the whole page's text, not only its " +
                "main part), `html` (the page's HTML) and `response` " +
                "(the status and headers the site answered with).",
        ).optional(),
});
