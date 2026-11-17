import type {
    HttpResult,
    LifecyclePollFn,
    LifecycleStartFn,
    TypedLifecycleOutcome,
} from "@shared/core";

type RetryOutcome = TypedLifecycleOutcome<{ consecutive_errors: number }>;
type RetryStartFn = (
    ctx: Parameters<LifecycleStartFn>[0],
) => Promise<RetryOutcome>;
type RetryPollFn = (
    ctx: Parameters<LifecyclePollFn>[0],
) => Promise<RetryOutcome>;

/** These function bodies are closed terms; only engine-provided capabilities perform IO. */
export const scraperStart: RetryStartFn = async (
    { data, utils },
): Promise<RetryOutcome> => {
    const ai = data.request.url.includes("/api/v2/");
    const supplied = data.input.body;
    let body = supplied;
    const share = utils.json.optionalGet(supplied ?? null, "$.input.url");
    if (
        ai &&
        utils.json.optionalGet(supplied ?? null, "$.actor") ===
            "scraper.aimode" &&
        typeof share === "string" &&
        /^https:\/\/share\.google\/aimode\/[A-Za-z0-9_-]+(?:[?#].*)?$/.test(
            share,
        )
    ) {
        let link = share;
        let resolved = false;
        let observedStatus = 0;
        for (let hop = 0; hop < 3; hop++) {
            // Google is a foreign origin: the transport withholds the API key.
            // Stop at the FIRST full AI Mode link; a later legacy-page redirect
            // can remove udm=50. Preserve every share parameter, not just q.
            const response = await utils.http({
                method: "GET",
                url: link,
                requestMs: 15000,
            }).catch((): HttpResult => ({
                status: 503,
                headers: {},
                body: null,
            }));
            observedStatus = response.status;
            const location = response.headers["location"];
            if (
                ![301, 302, 303, 307, 308].includes(response.status) ||
                typeof location !== "string"
            ) break;
            if (
                location.startsWith("https://www.google.com/search?") &&
                /[?&]udm=50(?:&|$)/.test(location)
            ) {
                if (
                    typeof supplied === "object" && supplied !== null &&
                    !Array.isArray(supplied)
                ) {
                    body = { ...supplied, input: { url: location } };
                    resolved = true;
                }
                break;
            }
            if (
                !/^https:\/\/share\.google\/aimode\/[A-Za-z0-9_-]+(?:[?#].*)?$/
                    .test(location) &&
                !location.startsWith("https://www.google.com/share.google?")
            ) break;
            link = location;
        }
        if (!resolved) {
            return {
                kind: "COMPLETED",
                httpStatus: 502,
                output: {
                    provider_http_status: observedStatus,
                    provider_response: {
                        error:
                            "Google share redirect did not yield an allowed full AI Mode URL; no scraper task submitted.",
                        stage: "share_link_resolution",
                        submission_uncertain: false,
                    },
                },
            };
        }
    }
    const res = await utils.request(body === undefined ? {} : { body }).catch(
        (error): HttpResult => {
            if (
                typeof error === "object" && error !== null &&
                "code" in error &&
                error.code !== "EXECUTION_FAILED" && error.code !== "TIMEOUT"
            ) throw error;
            return {
                status: 503,
                headers: {},
                body: {
                    error:
                        "Submission transport outcome unknown; do not automatically resubmit.",
                    submission_uncertain: true,
                },
            };
        },
    );
    const taskId = utils.json.optionalGet(
        res.body,
        ai ? "$.task_id" : "$.taskId",
    );
    const id = typeof taskId === "string" && /^[A-Za-z0-9_-]+$/.test(taskId)
        ? taskId
        : undefined;

    const status = utils.json.optionalGet(res.body, "$.status");
    const failed = status === "failed" || status === "error" ||
        utils.json.optionalGet(res.body, "$.success") === false ||
        (utils.json.optionalGet(res.body, "$.error") !== undefined &&
            utils.json.optionalGet(res.body, "$.error") !== null &&
            utils.json.optionalGet(res.body, "$.error") !== "");
    const output = {
        provider_response: res.body,
        provider_http_status: res.status,
        ...(id ? { task_id: id } : {}),
    };
    if (res.status < 200 || res.status >= 300 || failed) {
        return {
            kind: "COMPLETED",
            httpStatus: failed && res.status >= 200 && res.status < 300
                ? 502
                : res.status,
            ...(failed && res.status >= 200 && res.status < 300
                ? { providerHttpStatus: res.status }
                : {}),
            output,
        };
    }
    if (
        res.status === 201 || res.status === 202 || status === "pending" ||
        status === "running"
    ) {
        if (!id) {
            return {
                kind: "COMPLETED",
                httpStatus: 502,
                providerHttpStatus: res.status,
                output: {
                    ...output,
                    connector_error:
                        "Task accepted without a usable task identifier; do not blindly resubmit.",
                },
            };
        }
        return {
            kind: "RUNNING",
            state: { externalRunId: id, data: { consecutive_errors: 0 } },
        };
    }
    const result = utils.json.optionalGet(res.body, "$.task_result");
    const actor = utils.json.optionalGet(data.input.body ?? null, "$.actor");
    const answerField = actor === "scraper.grok"
        ? "$.full_response"
        : actor === "scraper.alexa"
        ? "$.md_text"
        : actor === "scraper.overview"
        ? "$.content"
        : "$.result_text";
    const aiAnswer = result !== undefined
        ? utils.json.optionalGet(result, answerField)
        : undefined;
    const googleResult = typeof res.body === "object" && res.body !== null &&
        !Array.isArray(res.body) &&
        [
            "result",
            "data",
            "organic_results",
            "organic_result",
            "news_results",
            "best_flights",
            "other_flights",
            "images_results",
            "inline_images",
            "local_results",
            "video_results",
            "shopping_results",
            "immersive_products",
            "search_metadata",
            "search_information",
            "knowledge_graph",
        ]
            .some((key) =>
                res.body !== null && typeof res.body === "object" &&
                !Array.isArray(res.body) && res.body[key] !== undefined &&
                res.body[key] !== null
            );
    if (
        res.status !== 200 ||
        (ai
            ? status !== "success" || typeof aiAnswer !== "string" ||
                (aiAnswer.trim() === "" && actor !== "scraper.overview")
            : !googleResult)
    ) {
        return {
            kind: "COMPLETED",
            httpStatus: 502,
            providerHttpStatus: res.status,
            output: {
                ...output,
                connector_error:
                    "Unrecognized or incomplete terminal response; original payload retained.",
            },
        };
    }
    return { kind: "COMPLETED", httpStatus: 200, output };
};

export const scraperPoll: RetryPollFn = async (
    { data, utils },
): Promise<RetryOutcome> => {
    const id = data.lifecycle.state.externalRunId;
    if (!id) {
        throw Object.assign(new Error("Missing supplier task id"), {
            retriable: false,
        });
    }
    const ai = data.request.url.includes("/api/v2/");
    const res = await utils.http({
        method: "GET",
        url: data.request.url.replace(/\/request$/, "/result/") +
            encodeURIComponent(id),
    }).catch((): HttpResult => ({
        status: 503,
        headers: {},
        body: { error: "Status transport failed; existing task retained." },
    }));
    if ([408, 429, 500, 502, 503, 504].includes(res.status)) {
        const previous = utils.json.optionalGet(
            data.lifecycle.state.data ?? null,
            "$.consecutive_errors",
        );
        const errors = (typeof previous === "number" ? previous : 0) + 1;
        if (errors <= 3) {
            const seconds = Number(res.headers["retry-after"]);
            return {
                kind: "RUNNING",
                pollAfterMs: Number.isFinite(seconds) && seconds > 0
                    ? Math.min(seconds * 1000, 60000)
                    : 10000,
                state: {
                    externalRunId: id,
                    data: { consecutive_errors: errors },
                },
            };
        }
    }

    const status = utils.json.optionalGet(res.body, "$.status");
    const failed = status === "failed" || status === "error" ||
        utils.json.optionalGet(res.body, "$.success") === false ||
        (utils.json.optionalGet(res.body, "$.error") !== undefined &&
            utils.json.optionalGet(res.body, "$.error") !== null &&
            utils.json.optionalGet(res.body, "$.error") !== "");
    const output = {
        provider_response: res.body,
        provider_http_status: res.status,
        ...(id ? { task_id: id } : {}),
    };
    if (res.status < 200 || res.status >= 300 || failed) {
        return {
            kind: "COMPLETED",
            httpStatus: failed && res.status >= 200 && res.status < 300
                ? 502
                : res.status,
            ...(failed && res.status >= 200 && res.status < 300
                ? { providerHttpStatus: res.status }
                : {}),
            output,
        };
    }
    if (
        res.status === 201 || res.status === 202 || status === "pending" ||
        status === "running"
    ) {
        if (!id) {
            return {
                kind: "COMPLETED",
                httpStatus: 502,
                providerHttpStatus: res.status,
                output: {
                    ...output,
                    connector_error:
                        "Task accepted without a usable task identifier; do not blindly resubmit.",
                },
            };
        }
        return {
            kind: "RUNNING",
            state: { externalRunId: id, data: { consecutive_errors: 0 } },
        };
    }
    const result = utils.json.optionalGet(res.body, "$.task_result");
    const actor = utils.json.optionalGet(data.input.body ?? null, "$.actor");
    const answerField = actor === "scraper.grok"
        ? "$.full_response"
        : actor === "scraper.alexa"
        ? "$.md_text"
        : actor === "scraper.overview"
        ? "$.content"
        : "$.result_text";
    const aiAnswer = result !== undefined
        ? utils.json.optionalGet(result, answerField)
        : undefined;
    const googleResult = typeof res.body === "object" && res.body !== null &&
        !Array.isArray(res.body) &&
        [
            "result",
            "data",
            "organic_results",
            "organic_result",
            "news_results",
            "best_flights",
            "other_flights",
            "images_results",
            "inline_images",
            "local_results",
            "video_results",
            "shopping_results",
            "immersive_products",
            "search_metadata",
            "search_information",
            "knowledge_graph",
        ]
            .some((key) =>
                res.body !== null && typeof res.body === "object" &&
                !Array.isArray(res.body) && res.body[key] !== undefined &&
                res.body[key] !== null
            );
    if (
        res.status !== 200 ||
        (ai
            ? status !== "success" || typeof aiAnswer !== "string" ||
                (aiAnswer.trim() === "" && actor !== "scraper.overview")
            : !googleResult)
    ) {
        return {
            kind: "COMPLETED",
            httpStatus: 502,
            providerHttpStatus: res.status,
            output: {
                ...output,
                connector_error:
                    "Unrecognized or incomplete terminal response; original payload retained.",
            },
        };
    }
    return { kind: "COMPLETED", httpStatus: 200, output };
};
