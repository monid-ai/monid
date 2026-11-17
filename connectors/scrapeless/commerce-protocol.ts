import { z } from "zod";
import type {
    HttpResult,
    LifecyclePollFn,
    LifecycleStartFn,
    TypedLifecycleOutcome,
} from "@shared/core";
type CommerceOutcome = TypedLifecycleOutcome<{ consecutive_errors: number }>;
type CommerceStartFn = (
    ctx: Parameters<LifecycleStartFn>[0],
) => Promise<CommerceOutcome>;
type CommercePollFn = (
    ctx: Parameters<LifecyclePollFn>[0],
) => Promise<CommerceOutcome>;
export const zCommerceState = z.strictObject({
    consecutive_errors: z.number().int().nonnegative(),
});
export const commerceStart: CommerceStartFn = async ({ data, utils }) => {
    const res = await utils.request().catch((error): HttpResult => {
        if (
            typeof error === "object" && error !== null && "code" in error &&
            error.code !== "EXECUTION_FAILED" && error.code !== "TIMEOUT"
        ) throw error;
        return {
            status: 503,
            headers: {},
            body: {
                submission_uncertain: true,
                error:
                    "Submission outcome unknown; do not automatically resubmit.",
            },
        };
    });
    const raw = res.body;
    const status = utils.json.optionalGet(raw, "$.status");
    const task = utils.json.optionalGet(raw, "$.taskId");
    const failed = utils.json.optionalGet(raw, "$.success") === false ||
        status === "failed" || status === "error" ||
        (typeof utils.json.optionalGet(raw, "$.code") === "number" &&
            utils.json.optionalGet(raw, "$.code") !== 200 &&
            utils.json.optionalGet(raw, "$.code") !== 0);
    const output = {
        provider_response: raw,
        provider_http_status: res.status,
        ...(typeof task === "string" ? { task_id: task } : {}),
    };
    if (failed || res.status < 200 || res.status >= 300) {
        return {
            kind: "COMPLETED",
            httpStatus: failed && res.status < 300 ? 502 : res.status,
            output,
        };
    }
    if (
        res.status === 201 || res.status === 202 || status === "pending" ||
        status === "running"
    ) {
        const id = typeof task === "string" ? task : undefined;
        if (typeof id !== "string" || !/^[A-Za-z0-9_-]+$/.test(id)) {
            return {
                kind: "COMPLETED",
                httpStatus: 502,
                output: {
                    ...output,
                    connector_error:
                        "Missing task identifier; do not resubmit.",
                },
            };
        }
        return {
            kind: "RUNNING",
            state: { externalRunId: id, data: { consecutive_errors: 0 } },
        };
    }
    // Seller fields are anchored to the recorded 2026-10-23 native result.
    const actor = utils.json.optionalGet(data.input.body ?? null, "$.actor");
    const type = utils.json.optionalGet(
        data.input.body ?? null,
        "$.input.type",
    );
    const candidate = utils.json.optionalGet(raw, "$.result") ??
        utils.json.optionalGet(raw, "$.data") ?? raw;
    const fields = actor === "scraper.tiktok.user.detail"
        ? ["unique_id", "sec_uid"]
        : actor === "scraper.tiktok.user.work"
        ? ["items"]
        : actor === "scraper.tiktok.shop.page"
        ? ["product_id", "price"]
        : type === "product"
        ? ["asin", "title"]
        : type === "keywords"
        ? ["organic", "keyword"]
        : type === "rufus"
        ? ["products", "user_query"]
        : type === "seller"
        ? ["seller_id", "seller_name"]
        : [];
    const known = fields.some((field) =>
        utils.json.optionalGet(candidate, "$." + field) !== undefined &&
        utils.json.optionalGet(candidate, "$." + field) !== null
    );
    return {
        kind: "COMPLETED",
        httpStatus: res.status === 200 && known ? 200 : 502,
        output: known ? output : {
            ...output,
            connector_error:
                "Unverified terminal payload; inspect native response before release.",
        },
    };
};
export const commercePoll: CommercePollFn = async ({ data, utils }) => {
    const id = data.lifecycle.state.externalRunId;
    if (typeof id !== "string" || !/^[A-Za-z0-9_-]+$/.test(id)) {
        throw new Error("Missing task ID");
    }
    const origin = data.request.url.split("/").slice(0, 3).join("/");
    const res = await utils.http({
        method: "GET",
        url: origin + "/api/v1/scraper/result/" + encodeURIComponent(id),
    }).catch((): HttpResult => ({
        status: 503,
        headers: {},
        body: { error: "Status transport failed; original task retained." },
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
    const raw = res.body;
    const status = utils.json.optionalGet(raw, "$.status");
    const task = utils.json.optionalGet(raw, "$.taskId");
    const failed = utils.json.optionalGet(raw, "$.success") === false ||
        status === "failed" || status === "error" ||
        (typeof utils.json.optionalGet(raw, "$.code") === "number" &&
            utils.json.optionalGet(raw, "$.code") !== 200 &&
            utils.json.optionalGet(raw, "$.code") !== 0);
    const output = {
        provider_response: raw,
        provider_http_status: res.status,
        task_id: id,
    };
    if (task !== undefined && task !== id) {
        return {
            kind: "COMPLETED",
            httpStatus: 502,
            output: {
                ...output,
                connector_error:
                    "Status response taskId does not match the original task; no follow-up request sent.",
            },
        };
    }
    if (failed || res.status < 200 || res.status >= 300) {
        return {
            kind: "COMPLETED",
            httpStatus: failed && res.status < 300 ? 502 : res.status,
            output,
        };
    }
    if (
        res.status === 201 || res.status === 202 || status === "pending" ||
        status === "running"
    ) {
        return {
            kind: "RUNNING",
            state: { externalRunId: id, data: { consecutive_errors: 0 } },
        };
    }
    // Seller fields are anchored to the recorded 2026-10-23 native result.
    const actor = utils.json.optionalGet(data.input.body ?? null, "$.actor");
    const type = utils.json.optionalGet(
        data.input.body ?? null,
        "$.input.type",
    );
    const candidate = utils.json.optionalGet(raw, "$.result") ??
        utils.json.optionalGet(raw, "$.data") ?? raw;
    const fields = actor === "scraper.tiktok.user.detail"
        ? ["unique_id", "sec_uid"]
        : actor === "scraper.tiktok.user.work"
        ? ["items"]
        : actor === "scraper.tiktok.shop.page"
        ? ["product_id", "price"]
        : type === "product"
        ? ["asin", "title"]
        : type === "keywords"
        ? ["organic", "keyword"]
        : type === "rufus"
        ? ["products", "user_query"]
        : type === "seller"
        ? ["seller_id", "seller_name"]
        : [];
    const known = fields.some((field) =>
        utils.json.optionalGet(candidate, "$." + field) !== undefined &&
        utils.json.optionalGet(candidate, "$." + field) !== null
    );
    return {
        kind: "COMPLETED",
        httpStatus: res.status === 200 && known ? 200 : 502,
        output: known ? output : {
            ...output,
            connector_error:
                "Unverified terminal payload; inspect native response before release.",
        },
    };
};
