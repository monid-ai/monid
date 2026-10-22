import { z } from "zod";
import { zCompanyId, zCompanyUrl } from "../../../schema/common.ts";

/** POST /v2/fetch/companies body: `url`, `id`, or both (`id` wins). */
const zFetchCompanyFields = z.object({
    url: zCompanyUrl.optional(),
    id: zCompanyId.optional(),
}).strict();

export const zFetchCompanyBody = z.union([
    zFetchCompanyFields.required({ url: true }),
    zFetchCompanyFields.required({ id: true }),
]).describe(
    "Identify the company by `url` or by `id` (`id` wins when both are " +
        "given).",
);
