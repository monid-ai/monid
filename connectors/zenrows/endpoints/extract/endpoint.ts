import { defineEndpoint } from "@shared/core";
import { zExtractQueryParams } from "./schema/inputs.ts";

/**
 * `GET https://api.zenrows.com/v1/?extract=auto`, one page, as fields.
 *
 * `endpoint` is pinned for the same reason `zenrows#scrape` pins its own:
 * the two share the wire path `/` and would otherwise derive the same
 * empty id (design D22).
 *
 * `extract=auto` is merged in at the binding rather than mirrored, because
 * a caller cannot pick another extraction strategy on this endpoint.
 *
 * THE FIELDS, NOT THE PAGE. `extract=auto` answers
 * `{"html": ..., "parsed": {...}}`, where `html` is the whole fetched
 * page. One capture of a product page measured 166,631 characters of
 * `html` beside 4 keys of `parsed`. `output.fromResponse` returns
 * `parsed` and drops `html`; a caller who wanted the page would have
 * called `zenrows#scrape`. A body with no `parsed` passes through whole,
 * so a vendor shape change cannot silently empty the output. The hook
 * runs after `usage.consolidate`, so presentation can never change a bill.
 *
 * No `output.schema`: Zenrows parses each prepared domain into its own
 * field set, so there is no one shape to validate. Usage, credits and the
 * meter relay are the provider's, inherited whole.
 */
export default defineEndpoint({
    meta: {
        displayName: "Zenrows Extract",
        summary: "Return the structured fields Zenrows parsed out of one page.",
        description: "Fetch a single URL through Zenrows and return the " +
            "fields Zenrows parsed out of it as JSON: a product's name, " +
            "price and availability, a listing's rows, an article's " +
            "byline, named the way the site itself names them, with no " +
            "selectors to write. Narrow the answer with " +
            "'extract_fields'. It returns those fields and not the page, " +
            "and only for a domain Zenrows has prepared: an unprepared " +
            "one answers 403 REQS007 and can be prepared on request. " +
            "REQS007 is also the answer when " +
            "the domain is prepared, but this page has nothing Extract extracts (a home or search page, for example)" +
            ". For the page's own content, and for bulk link or email " +
            "extraction, call zenrows#scrape instead.",
        docsUrl: "https://docs.zenrows.com/extract/setup",
        categories: ["web-extraction"],
        notes: [
            "Only prepared domains are served. A 403 REQS007 names the " +
            "domain and is not charged; a 422 no_data_extracted means the " +
            "page type is known but nothing came back filled, and it is " +
            "not charged either, so do not retry it.",
        ],
    },
    endpoint: "/extract",
    request: { method: "GET", path: "/" },
    input: {
        schema: { queryParams: zExtractQueryParams },
        /** The vendor default, applied at the binding: `auto` returns the
         *  site's own field names, and it is the only strategy this
         *  endpoint offers. */
        toRequest: ({ data }) => ({
            ...data.input,
            queryParams: { ...data.input.queryParams, extract: "auto" },
        }),
    },
    output: {
        fromResponse: ({ data, utils }) => {
            const inner = utils.json.optionalGet(data.output, "$.parsed");
            return inner === undefined ? data.output : inner;
        },
    },
});
