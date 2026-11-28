import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zVerifyEmailBody } from "./schema/inputs.ts";

/**
 * `POST /emails/verify` — whether an address can receive mail.
 *
 * ONE REQUEST, through a single-shot `lifecycle.start` so it can carry a
 * run-stable `Idempotency-Key`. A check takes a few seconds and ends within
 * about 25; one that gets no verdict in time answers an empty `500`,
 * charging nothing.
 *
 * BILLED PER VERDICT: outbound.dev charges $0.01 for `valid`, `invalid` and
 * `risky`, and nothing for `unknown`, so the evidence counts the verdict.
 */
export default defineEndpoint({
    meta: {
        displayName: "Verify Email",
        summary:
            "Check whether an email address can receive mail before you send to it.",
        description: "Check whether an email address can receive mail, " +
            "without writing to it. The answer carries `email` and " +
            "`status`: `valid`; `invalid` (spam traps and do-not-mail " +
            "addresses included); `risky` (the domain accepts every " +
            "address, so this one cannot be confirmed); or `unknown`. An " +
            "`unknown` verdict is free. A check takes a few seconds. Reach " +
            "for it before a first send to an address from anywhere else; " +
            "an email `outbound-dev#people/enrich/email` finds already " +
            "carries its own check.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/enrichment/verify-an-email-address",
        categories: ["people-enrichment"],
        notes: [
            "A check that gets no verdict in time answers an empty 500 and " +
            "charges nothing: retry.",
        ],
    },
    request: { method: "POST", path: "/emails/verify" },
    input: { schema: { body: zVerifyEmailBody } },
    /** ONE REQUEST, under a run-stable `Idempotency-Key` (design D34):
     *  outbound.dev answers a repeat of it with the first answer instead of
     *  running, and charging, the call again. */
    lifecycle: {
        start: async ({ data, utils }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":call",
                },
            });
            if (
                res.status === 409 &&
                utils.json.optionalGet(res.body, "$.error.code") ===
                    "idempotency_in_progress"
            ) {
                // An earlier attempt of this same call is still being
                // answered and may yet charge. Fail this attempt, so a
                // retry under the same key meets that answer instead of the
                // run settling at zero beside it.
                throw new Error(
                    "outbound.dev is still answering this run's earlier call",
                );
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.01 },
            label: "verdict",
            description: "a valid, invalid or risky verdict (unknown is free)",
        },
        estimate: () => ({ counts: { RESULT: 1 } }),
        evidence: ({ data, utils }) => {
            const status = utils.json.optionalGet(data.output, "$.status");
            return {
                counts: {
                    RESULT: status === "valid" || status === "invalid" ||
                            status === "risky"
                        ? 1
                        : 0,
                },
            };
        },
    },
});
