import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zActIdPathParams } from "../../schema/common.ts";
import { zSectionBodyQueryParams } from "./schema/inputs.ts";

/**
 * `GET /us/statutes/section/{act_id}/body`: the section's full text.
 *
 * Flat 6 credits whatever the length, and the same 6 whether or not `asOf`
 * sends it through the point-in-time reconstruction. This is the same line
 * that `includeBody` adds per row on search and on the batch lookup.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get US Statute Full Text",
        summary: "Full text of one statute section, optionally as of a date.",
        description: "The operative text of a section, as published. " +
            "`format` picks the representation (plain text, the " +
            "publisher's HTML, the section without surrounding notes, or " +
            "the enacted text alone) and `structured` adds a parsed " +
            "subsection tree so a pincite can be addressed directly. " +
            "`asOf` reconstructs the text as it stood on a past date, " +
            "which is what you want when reading a contract or a filing " +
            "against the law in force at the time rather than today's. " +
            "The response carries the source URL and publisher credit " +
            "alongside the text.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/get-statute-full-text",
        categories: ["legal-research"],
        notes: [
            "Read `asOf.engine` before trusting `asOf.isBounded`, because " +
            "the flag means a different thing under each engine. Under " +
            "`stored_edition` the answer comes from published editions " +
            "served verbatim, and a date before the earliest edition, or " +
            "between two of them, is reported out of coverage rather than " +
            "interpolated from a neighbour. Under `observed_change` the " +
            "text is rebuilt from the before-side of the first change we " +
            "observed after your date, so `isBounded: true` means only " +
            "that no affecting change was observed, which is weaker than " +
            "there having been none.",
        ],
    },
    request: { method: "GET", path: "/us/statutes/section/{act_id}/body" },
    input: {
        schema: {
            pathParams: zActIdPathParams,
            queryParams: zSectionBodyQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 6 },
        },
    },
});
