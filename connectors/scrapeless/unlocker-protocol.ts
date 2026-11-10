import type {
    HttpResult,
    LifecycleOutcome,
    LifecycleStartFn,
} from "@shared/core";

export const unlockerStart: LifecycleStartFn = async (
    { data, utils },
): Promise<LifecycleOutcome> => {
    const res = await utils.request().catch((error): HttpResult => {
        if (
            typeof error === "object" && error !== null && "code" in error &&
            error.code !== "EXECUTION_FAILED" && error.code !== "TIMEOUT"
        ) throw error;
        return {
            status: 503,
            headers: {},
            body: {
                error:
                    "Request transport outcome unknown; do not automatically repeat a potentially charged request.",
                submission_uncertain: true,
            },
        };
    });
    const code = utils.json.optionalGet(res.body, "$.code");
    const content = utils.json.optionalGet(res.body, "$.data");
    // Structured render output can contain an error serialized inside data even
    // when both HTTP and the outer code are 200. Keep the original string intact.
    const format = utils.json.optionalGet(
        data.input.body ?? null,
        "$.input.jsRender.response.type",
    );
    let structuredError = false;
    let structuredShapeError = false;
    if (
        (format === "content" || format === "network" || format === "png" ||
            format === "jpeg") &&
        typeof content === "string"
    ) {
        try {
            const parsed = JSON.parse(content);
            structuredError = parsed !== null && typeof parsed === "object" &&
                !Array.isArray(parsed) &&
                typeof parsed.statusCode === "number" &&
                parsed.statusCode >= 400 && parsed.statusCode <= 599 &&
                (typeof parsed.message === "string" ||
                    typeof parsed.error === "string");
            if (format === "content") {
                structuredShapeError = parsed === null ||
                    typeof parsed !== "object" || Array.isArray(parsed);
            } else if (format === "network") {
                structuredShapeError = !Array.isArray(parsed);
            }
        } catch {
            // content/network promise serialized JSON, not arbitrary HTML/text.
            // Image base64 is not JSON and is left intact.
            structuredShapeError = format === "content" || format === "network";
        }
    }
    const ok = res.status === 200 && code === 200 &&
        typeof content === "string" && !structuredError &&
        !structuredShapeError;
    return {
        kind: "COMPLETED",
        httpStatus: ok
            ? 200
            : res.status >= 200 && res.status < 300
            ? 502
            : res.status,
        ...(!ok && res.status >= 200 && res.status < 300
            ? { providerHttpStatus: res.status }
            : {}),
        output: {
            provider_response: res.body,
            provider_http_status: res.status,
            ...(!ok && res.status >= 200 && res.status < 300
                ? {
                    connector_error: structuredError
                        ? "Unlocker structured render output contains an error envelope; native data retained."
                        : structuredShapeError
                        ? "Unlocker content/network did not return its promised JSON object/array; native data retained."
                        : "Unlocker business code/content did not indicate success.",
                }
                : {}),
        },
    };
};
