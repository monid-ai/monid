import { z } from "zod";

/**
 * johnvc/google-lens-api — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~google-lens-api/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zGoogleLensApiBody = z.object({
    image_url: z.string().describe(
        "A public http or https link to the image you want to look up. The image must be reachable without a login. Also accepts a data URI (data:image/png;base64,...). Provide images through exactly one of Image URL, Upload images, or Image base64.",
    ).optional(),
    // curated: fileUpload editor — item shape unpublished, left open
    image_upload: z.array(z.any()).describe(
        "Click Upload new files and pick up to 10 images from your computer, or paste links to files already stored on Apify. When set, this takes priority over Image URL.",
    ).optional(),
    // curated: stringList editor — items are base64 strings
    image_base64: z.array(z.string()).describe(
        "Raw image bytes encoded as base64, one entry per image, with or without the data:image/...;base64, prefix. Best for API, MCP, and automation callers that hold local files. The platform caps run input at 9 MB, so this door fits about 6 MB of images per run; for bigger files use Upload images. When...",
    ).optional(),
    search_type: z.enum(["visual_matches", "products", "exact_matches"])
        .describe(
            "What kind of matches to return. 'Visual matches' finds visually similar images and is the general reverse image search. 'Products' returns shoppable listings with prices. 'Exact matches' finds every page carrying this exact image, which is what you want for attribution and licensing checks.",
        ).optional(),
    query: z.string().describe(
        "Optional. Add words to narrow the results, for example 'blue' or 'leather'. Applies to visual matches and products only; the source ignores it for exact matches.",
    ).optional(),
    max_results: z.number().int().min(1).max(400).describe(
        "How many matches to return. One lookup returns roughly 59 visual matches, 19 products, or up to 400 exact matches, so set this to whichever slice you actually need.",
    ).optional(),
    country: z.string().describe(
        "Optional two letter country code such as us, gb or de. Affects which regional results and shopping listings are returned.",
    ).optional(),
    language: z.string().describe(
        "Optional two letter language code such as en, es or fr. Note that match coverage genuinely varies by language: some languages return fewer results for the same image.",
    ).optional(),
});
