import { z } from "zod";
import { zAsin, zScrapeBody, zSite } from "../../../schema/common.ts";

export const zBody = zScrapeBody.omit({ url: true }).extend({
    site: zSite,
    content: zAsin,
});
