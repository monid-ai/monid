import { defineEndpoint } from "@shared/core";
import { tavilyUsageModel } from "../../provider.ts";
import { z } from "zod";
import { zTavilyResearchBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Tavily Research",
        summary:
            "Run multi-source research and return a cited report or structured output.",
        description:
            "Submit a research question and wait for a completed report " +
            "with sources. Mini handles focused questions; pro covers complex " +
            "topics; auto selects between them. Supports structured output, " +
            "citation styles, domain preferences and attached text files. " +
            "Use /search for a single retrieval request.",
        docsUrl:
            "https://docs.tavily.com/documentation/api-reference/endpoint/research",
        categories: ["web-search"],
        notes: [
            "This endpoint polls the JSON job API; stream=true is unsupported.",
            "Admission reserves the published maximum: 110 credits for mini, 250 for pro or auto. Settlement uses the completed job's receipt.",
            "Polling waits up to 30 minutes. Tavily exposes no cancellation API; stopping locally does not cancel the remote job. Hosts receive the request ID in lifecycle state and logs; known jobs can be read with /research/{request_id}.",
            "output_schema object properties need nested properties, and array properties need items. File contents must meet Tavily's type and word limits.",
        ],
    },
    request: { method: "POST", path: "/research" },
    timeouts: { requestMs: 60_000, runMs: 1_800_000, pollMs: 5_000 },
    input: {
        schema: {
            body: zTavilyResearchBody.extend({
                model: zTavilyResearchBody.shape.model.unwrap().default("auto"),
                stream: z.literal(false).describe(
                    "Must be false: Monid polls the JSON job API instead of consuming SSE.",
                ).default(false),
            }),
        },
        // Unlike the other tools, research requests usage on GET, not POST.
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.pluck(
                utils.json.pluck(data.input.body ?? {}, "$.api_key").rest,
                "$.include_usage",
            ).rest,
        }),
    },
    usage: {
        model: tavilyUsageModel,
        estimate: ({ data }) => ({
            // Published per-model maxima, checked 2026-10-26:
            // https://docs.tavily.com/documentation/api-credits
            counts: { CREDIT: data.input.body.model === "mini" ? 110 : 250 },
        }),
    },
    lifecycle: {
        start: async ({ utils, logger }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const id = utils.json.str(res.body, "$.request_id");
            if (!id) {
                throw new Error("Tavily research returned an empty request_id");
            }
            logger.info("Tavily research submitted", { requestId: id });
            return { kind: "RUNNING", state: { externalRunId: id } };
        },
        poll: async ({ data, utils }) => {
            const id = data.lifecycle.state.externalRunId;
            if (!id) {
                throw new Error("Tavily research poll requires a request_id");
            }
            const res = await utils.http({
                method: "GET",
                url: data.request.url + "/" + encodeURIComponent(id),
                headers: data.request.headers,
                queryParams: { include_usage: "true" },
            });
            // A transient status lookup is not evidence that the paid job failed.
            if ([408, 429, 500, 502, 503, 504].includes(res.status)) {
                return { kind: "RUNNING", pollAfterMs: 10_000 };
            }
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const status = utils.json.str(res.body, "$.status");
            if (status === "pending" || status === "in_progress") {
                return { kind: "RUNNING" };
            }
            if (status === "failed") {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            if (status !== "completed") {
                throw new Error("Unknown Tavily research status: " + status);
            }
            const content = utils.json.optionalGet(res.body, "$.content");
            if (
                content === undefined || content === null ||
                (typeof content !== "string" &&
                    (typeof content !== "object" || Array.isArray(content)))
            ) {
                throw new Error(
                    "Tavily research completed without report content",
                );
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
