import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zContactPhoneBody } from "./schema/inputs.ts";

/**
 * POST /v2/contact/phone: a person's phone numbers.
 *
 * The same asynchronous job as `contact/email` (see there): the submit
 * debits 20 credits, the lifecycle polls `GET /v2/webhooks/{webhookId}`,
 * and the poll's `data.creditsConsumed`, net of the refund a miss gets,
 * settles the run. The lifecycle, evidence and consolidate fns are
 * byte-identical to the email finder's, so they intern to one fnTable
 * entry each.
 *
 * BUDGET. Over 119 production jobs (30 days to 2026-10-21), completion
 * took 14 s at the median and 30 s at most; the email finder's 10-minute
 * `runMs` is kept.
 *
 * A workspace with phone finding turned off answers the submit with 410
 * and a bare body (`{error: "endpoint_unavailable", message,
 * alternative}`), free; the provider's `fromError` reads it.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Phone Number",
        summary: "Find a person's phone number from their LinkedIn URL, or " +
            "their name and company domain.",
        description: "Find a person's phone numbers from their LinkedIn " +
            "profile URL, or from their name (`fullName`, or `firstName` " +
            "and `lastName`) with their company domain. The lookup runs " +
            "asynchronously upstream, typically in 15 seconds and under a " +
            "minute; this endpoint waits for it and returns the finished " +
            "result: `data.result` lists the numbers found as `{value, " +
            "type}`, `value` in E.164 format and `type` such as `mobile` " +
            "(or null when unknown). Built for sales calls and for " +
            "reaching a person when email is not enough. No number found " +
            "answers 404 and costs nothing. 20 credits when a number is " +
            "found.",
        docsUrl: "https://docs.reversecontact.com/endpoints/contact-phone",
        categories: ["people-enrichment"],
        notes: [
            "A miss is a 404 with `code` `phone-not-found` or " +
            "`person-not-found`, free.",
            "When phone finding is turned off for the account, the call " +
            "answers 410 `endpoint_unavailable`, free.",
        ],
    },
    request: { method: "POST", path: "/v2/contact/phone" },
    input: { schema: { body: zContactPhoneBody } },
    timeouts: { requestMs: 35_000, runMs: 600_000, pollMs: 5_000 },
    lifecycle: {
        start: async ({ utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const webhookId = utils.json.optionalGet(
                res.body,
                "$.data.webhookId",
            );
            if (typeof webhookId !== "string" || webhookId === "") {
                throw Object.assign(
                    new Error("Reverse Contact submit returned no webhookId"),
                    { retriable: false },
                );
            }
            return { kind: "RUNNING", state: { externalRunId: webhookId } };
        },
        poll: async ({ data, utils }) => {
            const webhookId = data.lifecycle.state.externalRunId;
            if (webhookId === undefined) {
                throw Object.assign(
                    new Error("Reverse Contact poll without a webhookId"),
                    { retriable: false },
                );
            }
            const res = await utils.http({
                method: "GET",
                path: "/v2/webhooks/" + encodeURIComponent(webhookId),
            });
            // A lookup that failed, not a job that ended: read again.
            if (res.status === 408 || res.status === 429 || res.status >= 500) {
                return { kind: "RUNNING" };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.optionalGet(res.body, "$.data.status");
            if (status === "succeeded") {
                return { kind: "COMPLETED", httpStatus: 200, output: res.body };
            }
            if (status === "errored") {
                const code = utils.json.optionalGet(
                    res.body,
                    "$.data.errorCode",
                );
                const miss = code === "email-not-found" ||
                    code === "phone-not-found" ||
                    code === "person-not-found" || code === "data-not-found";
                return {
                    kind: "COMPLETED",
                    httpStatus: miss
                        ? 404
                        : code === "invalid-request"
                        ? 400
                        : 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return { kind: "RUNNING" };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "phone lookup",
            description: "Reverse Contact credits net of refunds, as the " +
                "job's receipt reports them: 20 when a number is found",
        },
        estimate: () => ({ counts: { CREDIT: 20 } }),
        /** The job's own receipt, net of refunds. */
        evidence: ({ data, utils }) => {
            const consumed = utils.json.optionalNum(
                data.output,
                "$.data.creditsConsumed",
            );
            return {
                counts: consumed === undefined ? {} : { CREDIT: consumed },
            };
        },
        /** The same receipt as the claim, lifted out with the poll's own
         *  `quotas` block (the account's balance, and a 0 for the poll). */
        consolidate: ({ data, utils }) => {
            const withoutQuotas = utils.json.pluck(data.output, "$.quotas")
                .rest;
            const { value, rest } = utils.json.pluck(
                withoutQuotas,
                "$.data.creditsConsumed",
            );
            return {
                credits: {
                    ...(typeof value === "number" && value > 0
                        ? { default: value }
                        : {}),
                },
                output: rest,
            };
        },
    },
});
