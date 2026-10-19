import { defineProvider, UsageModelKind } from "@shared/core";
import { z } from "zod";

/**
 * Everyday MCP — anonymous, stateless household calculations maintained by
 * Shuai. The public service exposes MCP Streamable HTTP rather than one REST
 * route per operation, so the three catalog endpoints share `/mcp` and pin
 * their public identities separately.
 */
export default defineProvider({
    name: "everyday",
    meta: {
        displayName: "Everyday",
        summary: "Deterministic unit, recipe, and shopping-list calculations.",
        description: "Personally maintained by Shuai. Everyday performs " +
            "deterministic calculations from explicit caller inputs: unit " +
            "conversion, exact-fraction recipe scaling, and compatible-unit " +
            "shopping-list merging. These endpoints do not look up current " +
            "prices or weather and do not invoke Everyday's timer or " +
            "ask_for tools.",
        homepageUrl: "https://alfie.family",
        docsUrl: "https://alfie.family/agent-guide.html",
        categories: ["utility"],
        notes: [
            "Everyday does not store a history of inputs submitted to these " +
            "three calculation endpoints.",
        ],
    },
    request: {
        baseUrl: "https://everyday.alfie.family",
        headers: {
            "content-type": "application/json",
            Accept: "application/json,text/event-stream",
            "Mcp-Protocol-Version": "2026-07-28",
            "Mcp-Method": "tools/call",
        },
    },
    auth: {
        // Anonymous service: the explicit empty shape prevents the compiler's
        // default {apiKey} credentials contract from being materialized.
        credentials: z.object({}),
        inject: ({ data }) => data.request,
    },
    usage: {
        model: { kind: UsageModelKind.FREE },
    },
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    lifecycle: {
        /**
         * Streamable HTTP returns JSON-RPC and MCP application failures with
         * HTTP 200. Lift every in-band failure to a Monid provider error so
         * callers never receive an error envelope as a successful result.
         */
        start: async ({ data, utils }) => {
            const res = await utils.request();
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const jsonrpc = utils.json.optionalGet(res.body, "$.jsonrpc");
            const responseId = utils.json.optionalGet(res.body, "$.id");
            const requestId = utils.json.optionalGet(
                data.input.body ?? null,
                "$.id",
            );
            const error = utils.json.optionalGet(res.body, "$.error");
            const result = utils.json.optionalGet(res.body, "$.result");
            const isError = utils.json.optionalGet(
                res.body,
                "$.result.isError",
            );
            const structured = utils.json.optionalGet(
                res.body,
                "$.result.structuredContent",
            );
            const malformed = jsonrpc !== "2.0" || responseId !== requestId ||
                result === null || typeof result !== "object" ||
                Array.isArray(result) ||
                (isError !== undefined && typeof isError !== "boolean") ||
                structured === null || typeof structured !== "object" ||
                Array.isArray(structured);
            if (error !== undefined || isError === true || malformed) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 422,
                    providerHttpStatus: res.status,
                    output: res.body,
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.get(data.output, "$.result.structuredContent"),
    },
});
