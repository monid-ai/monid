import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zGoogleImagesBody } from "./schema/inputs.ts";

/**
 * Mindcase `google/images`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Google Images",
        summary: "Extract Google Images details (URL, source, description, " +
            "dimensions, and thumbnail) by providing a query and image " +
            "count.",
        description:
            "Extract Google Images details (URL, source, description, " +
            "dimensions, and thumbnail) by providing a query and image " +
            "count. Returns one row per result with title, imageUrl, " +
            "sourcePageUrl, sourceDomain, imageWidth, imageHeight, " +
            "orientation, megapixels, imageType, thumbnailUrl, " +
            "imageDimensions, thumbnailWidth, thumbnailHeight. $0.001 per " +
            "result; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/google/images",
        categories: ["image-search"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/google/images",
    request: { method: "POST", path: "/v1/data/google/images/run" },
    input: {
        schema: {
            body: zGoogleImagesBody.extend({
                maxResults: zGoogleImagesBody.shape.maxResults.unwrap().min(1)
                    .describe(
                        "Number of images to return. Required, at least 1.",
                    ),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.001 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
