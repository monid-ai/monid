import { defineProvider, presets, UsageModelKind } from "@shared/core";

/**
 * MailDignity (maildignity.com) — email tone auditor and outbound quality gate.
 * Evaluates draft emails against dignity and respect standards to eliminate
 * pushy, presumptuous, manipulative, or artificial language before sending.
 *
 * REST API against `https://maildignity.com/api/public/v1` with
 * `Authorization: Bearer <key>`.
 *
 * Billing: 1 check credit per audit call.
 */
export default defineProvider({
    name: "maildignity",
    meta: {
        displayName: "MailDignity",
        summary: "Email tone auditor and quality gate for outreach and communication.",
        description: "MailDignity analyzes outgoing email drafts to catch " +
            "pushy, presumptuous, manipulative, or artificial language before " +
            "messages reach recipients. Provides actionable rewrites while " +
            "preserving the sender's core intent.",
        homepageUrl: "https://maildignity.com",
        docsUrl: "https://maildignity.com/docs",
        categories: ["agents"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://maildignity.com/api/public/v1" },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        credits: { default: { label: "MailDignity checks" } },
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "check",
            consumes: { credit: "default", amount: 1 },
        },
    },
    output: {
        fromError: ({ data, utils }) => {
            const error = utils.json.optionalGet(data.output, "$.error");
            const message = utils.json.optionalGet(data.output, "$.message");
            const text = [error, message].find((v) =>
                typeof v === "string" && v !== ""
            );
            return {
                message: typeof text === "string" ? text : "MailDignity error",
                raw: data.output,
            };
        },
    },
});
