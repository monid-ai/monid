import { z } from "zod";
import { zCompanyId, zCompanyUrl, zPersonId, zPersonUrl } from "./common.ts";

/**
 * The identifier body shared by a profile's fetch and its availability
 * check (the vendor's `UrlOrIdPersonBody` and `UrlOrIdCompanyBody`, the
 * same body on `POST /v2/fetch/{persons,companies}` and on their `/check`):
 * `url`, `id`, or both, `id` winning. Each endpoint's inputs.ts states the
 * one-of rule over it, as a union of required arms.
 */
export const zPersonRef = z.object({
    url: zPersonUrl.optional(),
    id: zPersonId.optional(),
}).strict();

/** How a person body states its one-of rule. */
export const PERSON_REF_HINT = "Identify the person by `url` or by `id` " +
    "(`id` wins when both are given).";

export const zCompanyRef = z.object({
    url: zCompanyUrl.optional(),
    id: zCompanyId.optional(),
}).strict();

/** How a company body states its one-of rule. */
export const COMPANY_REF_HINT = "Identify the company by `url` or by `id` " +
    "(`id` wins when both are given).";
