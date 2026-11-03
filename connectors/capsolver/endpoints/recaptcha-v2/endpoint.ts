import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zReCaptchaOutput } from "../../schema/common.ts";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Solve reCAPTCHA v2",
        summary: "Create and complete a proxyless reCAPTCHA v2 token task.",
        description: "Submit a proxyless reCAPTCHA v2 challenge and poll " +
            "CapSolver until a token is ready. Intended for authorized " +
            "browser automation, QA, RPA, and public-data workflows.",
        docsUrl: "https://docs.capsolver.com/en/guide/captcha/ReCaptchaV2/",
        categories: ["captcha-solving"],
    },
    endpoint: "/solve/recaptcha-v2",
    request: { method: "POST", path: "/createTask" },
    input: {
        schema: { body: zBody },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: {
                task: utils.json.merge(data.input.body ?? {}, {
                    type: "ReCaptchaV2TaskProxyLess",
                }),
            },
        }),
    },
    output: { schema: zReCaptchaOutput },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "completed reCAPTCHA v2 task",
            consumes: { credit: "default", amount: 0.0008 },
        },
    },
});
