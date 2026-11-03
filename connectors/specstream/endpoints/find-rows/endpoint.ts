import { defineEndpoint } from "@shared/core";
import { zFindRowsPathParams, zFindRowsQueryParams } from "./schema/inputs.ts";

/**
 * `GET /v1/finds/{id}/rows`: read the rows of a find, a page at a time.
 *
 * The run endpoint hands back its first page of rows together with
 * `next_cursor`. A cursor is only meaningful to SpecStream, so the reader is
 * its own endpoint: the caller pages with the `find_id` from the run result.
 * The firecrawl `#crawl/{id}` pairing, for the same reason.
 */
export default defineEndpoint({
    meta: {
        displayName: "SpecStream Read Rows",
        summary:
            "Read the rows of a find, with the source page behind every value.",
        description:
            "Read the matching rows of a find by its `find_id`, up to 100 a " +
            "page; pass `next_cursor` back as `cursor` for the next page. " +
            "Each cell carries its `provenance`: the `source_url` of the " +
            "page the value was read from and `observed_at`, when it was " +
            "read. `possible` lists candidates that might fit but are not " +
            "confirmed matches; they are never billed. Free: reading the " +
            "rows of a find never spends, and results the account owns are " +
            "never charged twice.",
        docsUrl: "https://specstream.ai/docs/api",
        categories: ["web-search"],
        notes: [
            "While a find is still running this returns the matches so far; " +
            "replace your list on every read.",
        ],
    },
    /** PUBLIC identity (design D22): declared, identical to the vendor path. */
    endpoint: "/v1/finds/{id}/rows",
    request: { method: "GET", path: "/v1/finds/{id}/rows" },
    input: {
        schema: {
            pathParams: zFindRowsPathParams,
            queryParams: zFindRowsQueryParams,
        },
    },
});
