import { z } from "zod";
import { paginationFields } from "../../../schema/common.ts";
import { organizationFilterFields } from "../../../schema/organization-filters.ts";

/** POST /v2/search/organizations body: the Organization filters plus
 *  cursor pagination, strict like the gateway's guard. */
export const zSearchOrganizationsBody = z.object({
    ...organizationFilterFields,
    ...paginationFields,
}).strict();
