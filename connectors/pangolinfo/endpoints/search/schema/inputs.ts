import { zAmazonUrl, zScrapeBody } from "../../../schema/common.ts";

export const zBody = zScrapeBody.omit({ content: true, site: true }).extend({
    url: zAmazonUrl.regex(/^https:\/\/[^/?#]+\/s\/?\?[^#]*$/i)
        .regex(/[?&]k=[^&#\s]+/).describe(
            "Amazon search URL with k=keyword and optional page, filters and sorting.",
        ),
});
