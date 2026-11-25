import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zBrandBody } from "./schema/inputs.ts";

/**
 * `POST /v1/brand` — a site's brand assets from one rendered page load.
 *
 * BILLING: one PER_UNIT line on `Unit.CREDIT`. The estimate is the flat
 * ~3-credit render. `screenshot: true` bills the full-browser tier, which the
 * estimate does not deduce (no published figure per request); the vendor's
 * reported `credits` settles the true charge.
 */
export default defineEndpoint({
    meta: {
        displayName: "Spicrawl Brand",
        summary: "Read a site's logos, colors, fonts, images, videos, social " +
            "links and hero copy in one call.",
        description: "Pull a site's brand kit from one rendered page load: " +
            "logos and icons ranked by quality, the brand palette with roles, " +
            "typefaces with their weights, images, embedded " +
            "videos, social profile links, and the identity copy (name, " +
            "tagline, description, theme color, call to action). Ask for only " +
            "the sections you need with `include`. Links only: the API never " +
            "returns asset bytes and never rehosts a file, and it returns " +
            "platform or embed links for video, never direct media files. " +
            "Costs about 3 credits per call. Set `screenshot` to also get an " +
            "image of the rendered page, which bills the full-browser tier.",
        docsUrl: "https://docs.spicrawl.com",
        categories: ["web-extraction"],
    },
    request: { method: "POST", path: "/brand" },
    input: { schema: { body: zBrandBody } },
    timeouts: { requestMs: 120_000, runMs: 125_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "brand",
        },
        estimate: () => ({ counts: { CREDIT: 3 } }),
        evidence: ({ data, utils }) => {
            const credits = utils.json.optionalNum(data.output, "$.credits");
            return {
                counts: credits === undefined ? {} : { CREDIT: credits },
            };
        },
    },
});
