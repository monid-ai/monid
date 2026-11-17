import { z } from "zod";
import { zAmazonUrl, zAsin, zZipContext } from "../../../schema/common.ts";

export const zReviewContext = zZipContext.extend({
    bizKey: z.literal("review").optional(),
    asin: zAsin,
    pageCount: z.number().int().min(1).max(10).optional(),
    filterByStar: z.enum([
        "all_stars",
        "one_star",
        "two_star",
        "three_star",
        "four_star",
        "five_star",
        "positive",
        "critical",
    ]).optional(),
    sortBy: z.enum(["recent", "helpful"]).optional(),
});
export const zBody = z.strictObject({
    url: zAmazonUrl.describe(
        "Marketplace origin, for example https://www.amazon.com or https://www.amazon.fr.",
    ),
    site: z.enum([
        "amz_us",
        "amz_de",
        "amz_uk",
        "amz_jp",
        "amz_fr",
        "amz_it",
        "amz_es",
        "amz_br",
        "amz_au",
        "amz_mx",
        "amz_in",
        "amz_eg",
        "amz_ae",
        "amz_ca",
    ]).optional(),
    bizContext: zReviewContext,
    format: z.literal("json").optional(),
    formatType: z.literal("all_formats").optional(),
    parserName: z.literal("amzReviewV2").optional(),
    mediaType: z.enum(["all_contents", "media_reviews_only"]).optional(),
});
