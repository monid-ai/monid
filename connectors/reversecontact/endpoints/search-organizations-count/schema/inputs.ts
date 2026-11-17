import { z } from "zod";
import { organizationFilterFields } from "../../../schema/organization-filters.ts";

/** POST /v2/search/organizations/count body: exactly the Organization
 *  filters, without pagination. */
export const zSearchOrganizationsCountBody = z.object(
    organizationFilterFields,
).strict();
