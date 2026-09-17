import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zActIdPathParams } from "../../schema/common.ts";
import { zSectionChangesQueryParams } from "./schema/inputs.ts";

/**
 * `GET /us/statutes/section/{act_id}/changes`: what has moved, and when.
 *
 * Flat 1 credit a page, which is what makes it usable as a poll: `sinceId`
 * turns it into a forward cursor a nightly job can walk.
 */
export default defineEndpoint({
    meta: {
        displayName: "Get Section Change History",
        summary: "What changed on a section, and when we observed it.",
        description: "The observed change history of one section: each " +
            "entry saying whether text was added, amended or removed, when " +
            "we saw it, and the window our observation covers. Cheap " +
            "enough to poll: pass the last `id` you processed as " +
            "`sinceId` and you get only what is new, which is the forward " +
            "cursor for keeping a local copy in step. Walk the other way " +
            "with `beforeId` to read a section's history backwards. Note " +
            "that these are dates we OBSERVED the change, which is not the " +
            "same as the date the legislature made it.",
        docsUrl:
            "https://www.vaquill.ai/docs/api-reference/us-statutes/get-this-sections-change-history",
        categories: ["legal-research"],
        notes: [
            "An empty `changes` list means no change observed within the " +
            "window the response reports as `observedFrom`, not that " +
            "the section has never been amended.",
        ],
    },
    request: { method: "GET", path: "/us/statutes/section/{act_id}/changes" },
    input: {
        schema: {
            pathParams: zActIdPathParams,
            queryParams: zSectionChangesQueryParams,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            consumes: { credit: "default", amount: 1 },
        },
    },
});
