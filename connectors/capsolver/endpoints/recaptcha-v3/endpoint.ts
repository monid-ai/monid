import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zReCaptchaOutput } from "../../schema/common.ts";
import { zBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Solve reCAPTCHA v3",
        summary: "Create and complete a proxyless reCAPTCHA v3 token task.",
        description: "Submit a proxyless reCAPTCHA v3 challenge with an " +
            "optional action, session mode, and API domain, then poll until its token is ready.",
        docsUrl: "https://docs.capsolver.com/en/guide/captcha/ReCaptchaV3/",
        categories: ["captcha-solving"],
    },
    endpoint: "/solve/recaptcha-v3",
    request: { method: "POST", path: "/createTask" },
    input: {
        schema: { body: zBody },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: {
                task: utils.json.merge(data.input.body ?? {}, {
                    type: "ReCaptchaV3TaskProxyLess",
                }),
            },
        }),
    },
    output: { schema: zReCaptchaOutput },
    usage: {
        model: {
            kind: UsageModelKind.PER_CALL,
            label: "completed reCAPTCHA v3 task",
            consumes: { credit: "default", amount: 0.001 },
        },
    },
});
