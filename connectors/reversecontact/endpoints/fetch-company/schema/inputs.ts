import { z } from "zod";
import { COMPANY_REF_HINT, zCompanyRef } from "../../../schema/profile-ref.ts";

/** POST /v2/fetch/companies body: `url`, `id`, or both (`id` wins). */
export const zFetchCompanyBody = z.union([
    zCompanyRef.required({ url: true }),
    zCompanyRef.required({ id: true }),
]).describe(COMPANY_REF_HINT);
