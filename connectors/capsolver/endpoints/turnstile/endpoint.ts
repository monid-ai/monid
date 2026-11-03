import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zTurnstileOutput } from "../../schema/common.ts";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Solve Cloudflare Turnstile",
        summary: "Create and complete a proxyless Turnstile token task.",
        description: "Submit a proxyless Cloudflare Turnstile challenge " +
            "and poll CapSolver until its token is ready.",
        docsUrl:
            "https://docs.capsolver.com/en/guide/captcha/cloudflare_turnstile/",
        categories: ["captcha-solving"],
    },
    endpoint: "/solve/turnstile",
    request: { method: "POST", path: "/createTask" },
    input: {
        schema: { body: zBody },
        toRequest: ({ data, utils }) => {
            const body = data.input.body ?? {};
            const action = utils.json.optionalGet(body, "$.action");
            const cdata = utils.json.optionalGet(body, "$.cdata");
            // Monid exposes flat inputs; CapSolver expects metadata fields.
            const task = utils.json.merge(
                utils.json.omit(body, ["action", "cdata"]),
                {
                    type: "AntiTurnstileTaskProxyLess",
                    ...(typeof action === "string" || typeof cdata === "string"
                        ? {
                            metadata: {
                                ...(typeof action === "string"
                                    ? { action }
                                    : {}),
                                ...(typeof cdata === "string" ? { cdata } : {}),
                            },
                        }
                        : {}),
                },
            );
            return { ...data.input, body: { task } };
        },
    },
    output: { schema: zTurnstileOutput },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "completed Turnstile task",
            consumes: { credit: "default", amount: 0.0012 },
        },
    },
});
