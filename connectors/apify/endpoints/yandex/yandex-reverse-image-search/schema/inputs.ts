import { z } from "zod";

/**
 * johnvc/yandex-reverse-image-search — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~yandex-reverse-image-search/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zYandexReverseImageSearchBody = z.object({
    image_url: z.string().describe(
        "Provide the public http(s) URL of the image to search by. Yandex fetches this URL, so it must be reachable from the internet (no localhost or private links). Example: `https://substack-post-media.s3.amazonaws.com/public/images/edbfb2cd-ebcb-4527-bec7-5315c182278f_445x445.png`.",
    ),
    crop: z.string().describe(
        "Optionally crop the image before searching, as four ';'-separated fractions between 0 and 1 in the order left;top;right;bottom. Example: `0.1;0.2;0.9;0.8` searches only the middle of the image. Leave blank to search the whole image - do NOT put the image URL here.",
    ).optional(),
    include_matching_pages: z.boolean().describe(
        "Return pages where this image (or a close match) appears online, with page title, link, and snippet. Rows with result_type 'matching_page'. On by default.",
    ).optional(),
    include_similar_images: z.boolean().describe(
        "Return visually similar images from across the web. Each row carries a thumbnail, the full-size image URL, and the site hosting it. Yandex returns no page title or snippet for this result type, so those columns stay empty. Rows with result_type 'similar_image'. On by default.",
    ).optional(),
    include_image_sizes: z.boolean().describe(
        "Return other resolutions of the same image, categorized large / medium / small. Rows with result_type 'image_size'. Off by default.",
    ).optional(),
    include_image_tags: z.boolean().describe(
        "Return suggested search terms describing what is in the image. Rows with result_type 'image_tag'. Off by default.",
    ).optional(),
    include_shopping_results: z.boolean().describe(
        "Return e-commerce products that match the image content, with prices where available. Yandex only fills this section for a minority of images, so many searches return no product rows at all. Rows with result_type 'shopping_result'. Off by default.",
    ).optional(),
    include_knowledge_graph: z.boolean().describe(
        "Return the entity card when the image contains a recognizable subject (a person, landmark, product, or brand). One row with result_type 'knowledge_graph'. Off by default.",
    ).optional(),
    yandex_domain: z.enum([
        "yandex.com",
        "yandex.ru",
        "yandex.by",
        "yandex.kz",
        "yandex.uz",
        "yandex.com.tr",
    ]).describe(
        "The regional Yandex domain to search from. Defaults to 'yandex.com'. Results can differ by region.",
    ).optional(),
    max_results: z.number().int().min(10).describe(
        "Cap the total number of result rows returned by this run. Results are sold in blocks of 10: the minimum is 10, and any other value rounds up to the next multiple of 10 (15 becomes 20). Every search bills at least one block, and each further block of up to 10 rows bills in full even when Yandex fi...",
    ).optional(),
});
