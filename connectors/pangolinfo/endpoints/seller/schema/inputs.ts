import { z } from "zod";
import { zScrapeBody, zSite } from "../../../schema/common.ts";

export const zBody = zScrapeBody.omit({ url: true }).extend({
    site: zSite,
    content: z.string().regex(/^[A-Za-z0-9]+$/).describe("Amazon seller ID."),
    pageCount: z.number().int().min(1).max(3).optional(),
    categoryId: z.string().regex(/^\d+(?:,\d+)*$/).optional(),
});
