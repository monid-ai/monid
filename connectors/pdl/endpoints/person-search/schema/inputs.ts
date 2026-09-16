import { z } from "zod";
import {
    searchSharedFields,
    zEsQuery,
    zSqlQuery,
} from "../../../schema/common.ts";

const PERSON_DATASETS = [
    "all",
    "resume",
    "email",
    "phone",
    "mobile_phone",
    "street_address",
    "consumer_social",
    "developer",
] as const;

const personSearchShared = {
    ...searchSharedFields,
    dataset: z.enum(PERSON_DATASETS).optional().describe(
        "Dataset(s) to search; prefix a value with '-' to exclude it.",
    ),
    data_include: z.string().optional().describe(
        "Comma-separated fields to include in each returned record.",
    ),
};

/** POST /v5/person/search body — Elasticsearch `query` XOR `sql`, each a
 *  strict variant so a body carrying both fails validation (the ONE v1
 *  cross-field rule that survives compilation — design D6). */
export const zPdlPersonSearchBody = z.union([
    z.object({ query: zEsQuery, ...personSearchShared }).strict(),
    z.object({ sql: zSqlQuery, ...personSearchShared }).strict(),
]);

/** The two variants, exposed so the binding can tighten `size` on each. */
export const zPdlPersonSearchVariants = zPdlPersonSearchBody.options;
