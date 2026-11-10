import { z } from "zod";
import { COMPANY_REF_HINT, zCompanyRef } from "../../../schema/profile-ref.ts";

/** POST /v2/fetch/companies/check body: the body of
 *  `POST /v2/fetch/companies` (`url`, `id`, or both; `id` wins), one of
 *  them required. */
export const zCheckCompanyBody = z.union([
    zCompanyRef.required({ url: true }),
    zCompanyRef.required({ id: true }),
]).describe(COMPANY_REF_HINT);
