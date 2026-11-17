import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWebExtractBody } from "./schema/inputs.ts";

/**
 * Mindcase `web/extract`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Web Extract",
        summary: "Pull structured JSON out of any web page: name the fields " +
            "you want, or send a JSON Schema, and get one row per URL " +
            "with the values. Pages are always fetched...",
        description:
            "Pull structured JSON out of any web page: name the fields " +
            "you want, or send a JSON Schema, and get one row per URL " +
            "with the values. Pages are always fetched live. Failed " +
            "extractions and schema mismatches are not charged. Returns " +
            "one row per page with url, extractStatus, data, fieldsFound, " +
            "statusCode, fetchedAt, engine, errorType, errorMessage. Call " +
            "it by field names (fields) or json schema (schema). For the " +
            "full page as Markdown use mindcase#web/scrape; for many " +
            "pages of a site use mindcase#web/crawl. $0.01 per page; " +
            "empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/web/extract",
        categories: ["web-extraction"],
    },
    endpoint: "/web/extract",
    request: { method: "POST", path: "/v1/data/web/extract/run" },
    input: {
        schema: {
            body: zWebExtractBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.fields?.length ?? 0;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
