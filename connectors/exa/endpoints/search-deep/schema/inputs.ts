import { z } from "zod";
import { zExaSearchBody } from "../../../schema/search-body.ts";

/**
 * Exa /search restricted to the deep search types. Every other field is the
 * /search mirror unchanged — deep accepts the full parameter set — so the
 * two never drift apart.
 */
export const zExaDeepSearchBody = zExaSearchBody.extend({
    type: z.enum(["deep-lite", "deep", "deep-reasoning"]).optional(),
});
