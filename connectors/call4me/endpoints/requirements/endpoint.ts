import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zRequirementsPathParams } from "./schema/inputs.ts";

/**
 * `GET /api/requirements/{category}` — what a kind of call needs before
 * dialing.
 *
 * The vendor also reports, per field, whether the ACCOUNT's saved profile
 * already holds it (`from_profile`, `known`). On Monid that account is the
 * shared one, so those two keys describe nobody the caller knows: they are
 * projected away, and every field is the caller's to supply in `details`.
 */
export default defineEndpoint({
    meta: {
        displayName: "call4me Call Requirements",
        summary:
            "See the details a kind of phone call needs before call4me will dial.",
        description:
            "Read the fields a kind of call needs before dialing: for each, " +
            "its key, a label, whether it is required, and the question to " +
            "ask the user. Ask the user for every required field in one " +
            "message, then pass the answers by key in `details` to " +
            "call4me#calls. A call missing a required field is refused " +
            'with 422 "Not calling yet" and nothing is dialed. Free. ' +
            "Category slugs come from call4me#requirements.",
        docsUrl: "https://call4.me/api/openapi.json",
        categories: ["agentic-phone"],
    },
    request: { method: "GET", path: "/requirements/{category}" },
    input: { schema: { pathParams: zRequirementsPathParams } },
    timeouts: { requestMs: 15_000, runMs: 20_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["from_profile", "known"]),
    },
});
