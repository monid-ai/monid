import { z } from "zod";
import { zScrapeBody, zSite } from "../../../schema/common.ts";

export const zBody = zScrapeBody.omit({ url: true }).extend({
    site: zSite,
    content: z.string().regex(/^\d+$/).describe("Amazon category node ID."),
});
