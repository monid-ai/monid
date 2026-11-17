import { z } from "zod";
import { zCompanyDomain } from "../../../schema/common.ts";

/** POST /v2/enrich/companies body (the deprecated, ignored `fullProfile`
 *  flag is left out). */
export const zEnrichCompanyBody = z.object({
    domain: zCompanyDomain,
}).strict();
