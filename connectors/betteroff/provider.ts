import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

export default defineProvider({
    name: "betteroff",
    meta: {
        displayName: "BetterOff",
        summary: "Read household finances and prepare user-requested changes.",
        description:
            "Expose 29 BetterOff tools: 21 reads and eight state-writing tools for proposals, action requests, cancellation, and opt-in feedback. Every call requires Core access, household-owner OAuth authorization, AI consent, and tool-specific scopes. Corrections and financial actions require approval in BetterOff; wallet actions also require signing. Cancellation and feedback take effect when called.",
        homepageUrl: "https://betteroff.finance",
        docsUrl: "https://github.com/raintree-technology/betteroff.connectors",
        categories: ["household-finance"],
        notes: [
            "Supply a valid access token obtained through BetterOff OAuth. Access tokens expire after 600 seconds; the host must acquire and refresh them for the authenticated caller. This connector never receives refresh tokens.",
            "Use authorization-code OAuth with S256 PKCE and the generic resource https://api.betteroff.finance/mcp. Request only the scopes for the user-enabled tools. Transfer scopes are unavailable on the ChatGPT resource.",
            "Never supply tokens or household identifiers as tool input. Never share a household credential between callers, including members of the same Monid workspace.",
            "All tools require BetterOff Core, including reads and feedback. Paid, complimentary, and payment-grace Core access qualify; Free and trials do not. BetterOff enforces access on each call. FREE describes zero per-call provider usage, not plan eligibility or Monid pricing.",
        ],
    },
    auth: {
        credentials: z.strictObject({ accessToken: z.string().min(1) }),
        inject: ({ data }) => ({
            ...data.request,
            headers: {
                ...data.request.headers,
                Authorization: "Bearer " + data.params.accessToken,
            },
        }),
    },
    request: {
        baseUrl: "https://api.betteroff.finance",
        headers: {
            Accept: "application/json, text/event-stream",
            "MCP-Protocol-Version": "2025-03-26",
        },
    },
    timeouts: { requestMs: 30_000, runMs: 35_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ utils }) => {
            const response = await utils.request();
            if (response.status < 200 || response.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: response.status,
                    output: response.body,
                };
            }
            const rpcError = utils.json.optionalGet(response.body, "$.error");
            const result = utils.json.optionalGet(response.body, "$.result");
            const failed = utils.json.optionalGet(result ?? null, "$.isError");
            const structured = utils.json.optionalGet(
                result ?? null,
                "$.structuredContent",
            );
            if (
                rpcError !== undefined || failed === true ||
                utils.json.optionalGet(structured ?? null, "$.ok") === false
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: response.status,
                    output: response.body,
                };
            }
            if (
                utils.json.optionalGet(response.body, "$.jsonrpc") !== "2.0" ||
                utils.json.optionalGet(response.body, "$.id") !== 1 ||
                utils.json.optionalGet(structured ?? null, "$.ok") !== true
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: response.status,
                    output: response.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: response.status,
                output: response.body,
            };
        },
    },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.get(data.output, "$.result.structuredContent"),
    },
});
