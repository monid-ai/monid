import { defineProvider } from "@shared/core";

/**
 * CapSolver — asynchronous CAPTCHA token tasks for authorized browser
 * automation, testing, and public-web data workflows.
 *
 * CapSolver authenticates in the JSON body rather than a header. The custom
 * injector adds clientKey to both createTask and same-origin getTaskResult
 * calls while keeping the secret outside lifecycle code. The shared fixture
 * recorder redacts clientKey from recorded bodies before saving them.
 */
export default defineProvider({
    name: "capsolver",
    meta: {
        displayName: "CapSolver",
        summary:
            "Solve reCAPTCHA and Cloudflare Turnstile token challenges for authorized automation.",
        description: "CAPTCHA handling for browser automation, QA, RPA, " +
            "and public-web data workflows. Submit a supported challenge, " +
            "poll the task to completion, and receive the provider's token " +
            "response. This first connector scope covers proxyless " +
            "reCAPTCHA v2, reCAPTCHA v3, and Cloudflare Turnstile tasks.",
        homepageUrl: "https://www.capsolver.com",
        docsUrl: "https://docs.capsolver.com/en/guide/getting-started/",
        categories: ["captcha-solving"],
        notes: [
            "Use only on sites and workflows you are authorized to automate.",
            "Tasks are retained for five minutes and may be queried at most 120 times.",
        ],
    },
    auth: {
        inject: ({ data, utils }) => ({
            ...data.request,
            body: utils.json.merge(data.request.body ?? {}, {
                clientKey: data.params.apiKey,
            }),
        }),
    },
    request: {
        baseUrl: "https://api.capsolver.com",
    },
    timeouts: { requestMs: 30_000, runMs: 300_000, pollMs: 3_000 },
    // Each lifecycle hook is compiled as an independent closed-term function.
    // Keep success validation inside both hooks; captured helpers are unsupported.
    lifecycle: {
        start: async ({ data, utils, logger }) => {
            const response = await utils.request();
            if (response.status < 200 || response.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: response.status,
                    output: response.body,
                };
            }
            // CapSolver can report a business error in an HTTP 200 response.
            const errorId = utils.json.optionalGet(response.body, "$.errorId");
            if (typeof errorId === "number" && errorId > 0) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 422,
                    providerHttpStatus: response.status,
                    output: response.body,
                };
            }
            if (errorId !== 0) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: response.status,
                    output: {
                        errorCode: "INVALID_PROVIDER_RESPONSE",
                        errorDescription:
                            "CapSolver returned an invalid errorId",
                        details: response.body,
                    },
                };
            }
            const status = utils.json.optionalGet(response.body, "$.status");
            if (status === "ready") {
                const taskType = utils.json.optionalGet(
                    data.input.body ?? {},
                    "$.task.type",
                );
                const solutionToken = utils.json.optionalGet(
                    response.body,
                    taskType === "AntiTurnstileTaskProxyLess"
                        ? "$.solution.token"
                        : "$.solution.gRecaptchaResponse",
                );
                if (
                    typeof solutionToken !== "string" ||
                    solutionToken.trim() === ""
                ) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: 502,
                        providerHttpStatus: response.status,
                        output: {
                            errorCode: "INVALID_PROVIDER_RESPONSE",
                            errorDescription:
                                "CapSolver returned ready without the expected non-empty token",
                            details: response.body,
                        },
                    };
                }
                return {
                    kind: "COMPLETED",
                    httpStatus: 200,
                    providerHttpStatus: response.status,
                    output: response.body,
                };
            }
            const taskId = utils.json.optionalGet(response.body, "$.taskId");
            if (typeof taskId !== "string" || taskId === "") {
                throw Object.assign(
                    new Error("CapSolver createTask returned no taskId"),
                    { retriable: false },
                );
            }
            logger.info("CapSolver task created", { taskId });
            return {
                kind: "RUNNING",
                state: { externalRunId: taskId },
            };
        },
        poll: async ({ data, utils, logger }) => {
            const taskId = data.lifecycle.state.externalRunId;
            if (taskId === undefined) {
                throw Object.assign(
                    new Error("CapSolver poll without externalRunId in state"),
                    { retriable: false },
                );
            }
            const response = await utils.http({
                method: "POST",
                path: "/getTaskResult",
                body: { taskId },
            });
            if (response.status < 200 || response.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: response.status,
                    output: response.body,
                };
            }
            // CapSolver can report a business error in an HTTP 200 response.
            const errorId = utils.json.optionalGet(response.body, "$.errorId");
            if (typeof errorId === "number" && errorId > 0) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 422,
                    providerHttpStatus: response.status,
                    output: response.body,
                };
            }
            if (errorId !== 0) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: response.status,
                    output: {
                        errorCode: "INVALID_PROVIDER_RESPONSE",
                        errorDescription:
                            "CapSolver returned an invalid errorId",
                        details: response.body,
                    },
                };
            }
            const status = utils.json.optionalGet(response.body, "$.status");
            if (status === "ready") {
                const taskType = utils.json.optionalGet(
                    data.input.body ?? {},
                    "$.task.type",
                );
                const solutionToken = utils.json.optionalGet(
                    response.body,
                    taskType === "AntiTurnstileTaskProxyLess"
                        ? "$.solution.token"
                        : "$.solution.gRecaptchaResponse",
                );
                if (
                    typeof solutionToken !== "string" ||
                    solutionToken.trim() === ""
                ) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: 502,
                        providerHttpStatus: response.status,
                        output: {
                            errorCode: "INVALID_PROVIDER_RESPONSE",
                            errorDescription:
                                "CapSolver returned ready without the expected non-empty token",
                            details: response.body,
                        },
                    };
                }
                return {
                    kind: "COMPLETED",
                    httpStatus: 200,
                    providerHttpStatus: response.status,
                    output: response.body,
                };
            }
            if (status === "idle" || status === "processing") {
                return { kind: "RUNNING" };
            }
            logger.warn("CapSolver task status was not recognized", {
                taskId,
                status: String(status),
            });
            return {
                kind: "COMPLETED",
                httpStatus: 502,
                providerHttpStatus: response.status,
                output: response.body,
            };
        },
    },
    output: {
        fromError: ({ data, utils }) => {
            const description = utils.json.optionalGet(
                data.output,
                "$.errorDescription",
            );
            const code = utils.json.optionalGet(data.output, "$.errorCode");
            return {
                message: typeof description === "string" && description !== ""
                    ? description
                    : "CapSolver API error",
                ...(typeof code === "string" && code !== "" ? { code } : {}),
                raw: data.output,
            };
        },
    },
    usage: {
        credits: { default: { label: "US dollars" } },
    },
});
