import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCallPathParams } from "../../schema/call-id.ts";
import { SUB_ACCOUNT_BINDING } from "../../schema/sub-account.ts";
import { zAnswerBody } from "./schema/inputs.ts";

/**
 * /answer-call: `POST /calls/{call_id}/answer`. Free. The provider relay
 * adds `X-Sub-Account`. A question that is no longer open is a 200 with
 * `delivered: false`, not an error.
 */
export default defineEndpoint({
    meta: {
        displayName: "Answer Call",
        summary: "Answer a question a running call is asking.",
        description:
            "Answer a question the agent asked mid-call. Send `answer`, " +
            "the words the agent says aloud to the person on the line, " +
            "with the `request_id` of the question from `pending_questions` " +
            "on voygr#get-call. Without a `request_id` the answer goes to " +
            "the oldest open question. If you cannot answer, send " +
            "`outcome` (`timeout` or `transport_failure`) with the " +
            "`request_id`. If no answer arrives in time, the call goes on " +
            "and wraps up.",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["agentic-phone"],
        notes: [
            "Answering is free.",
            "Send exactly one of `answer` or `outcome`. `outcome` also " +
            "needs `request_id`.",
            "A 200 with `delivered: false` and `reason: " +
            "no_pending_request` means VOYGR dropped the answer: the " +
            "question was already answered, had expired (after about 60 " +
            "seconds) or never existed. A stale retry is safe.",
            "A call from another workspace answers 404.",
        ],
    },
    endpoint: "/answer-call",
    request: { method: "POST", path: "/calls/{call_id}/answer" },
    input: {
        schema: { pathParams: zCallPathParams, body: zAnswerBody },
    },
    resources: { uses: [SUB_ACCOUNT_BINDING] },
    usage: { model: { kind: UsageModelKind.FREE } },
});
