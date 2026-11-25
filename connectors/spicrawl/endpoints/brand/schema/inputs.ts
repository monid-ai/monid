import { z } from "zod";

/**
 * `POST /v1/brand` request body — Spicrawl's BrandRequest, mirrored from the
 * OpenAPI (optionality only, no `.default()`, D25). `.strict()` matches the
 * vendor, which rejects unknown fields with 400.
 *
 * Not expressible in zod's JSON Schema output: `include.uniqueItems`. The
 * vendor enforces uniqueness; a duplicate `include` entry is not rejected here.
 */

export const zBrandBody = z.object({
    url: z.url().regex(/^https?:\/\/[^\s/?#]+/i).describe(
        "Page to read. Required; must be http or https with a host. Private " +
            "and reserved addresses are refused, as on /v1/scrape.",
    ),
    include: z.array(
        z.enum([
            "identity",
            "logos",
            "icons",
            "colors",
            "fonts",
            "images",
            "videos",
            "socials",
        ]),
    ).describe(
        "Sections to return. Omitted means all of them. An unknown value is " +
            "a 400.",
    ).optional(),
    screenshot: z.boolean().describe(
        "Also return a screenshot of the rendered page, as on /v1/scrape. " +
            "Renders in full-browser mode and bills that tier.",
    ).optional(),
}).strict();
