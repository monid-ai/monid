import {
    defineProvider,
    type LifecycleStartFn,
    UsageModelKind,
} from "@shared/core";
import { z } from "zod";

// All IO uses the existing transport, including its request timeout. The
// endpoint's toRequest builds the tool envelope; this hook owns the session.
const start: LifecycleStartFn = async ({ data, utils }) => {
    const headers: Record<string, string> = {
        "Accept": "application/json, text/event-stream",
        "User-Agent":
            "monid/parallel-search-mcp (https://github.com/monid-ai/monid)",
    };
    let session;
    try {
        for (const stage of ["initialize", "tools/call"]) {
            const id = stage === "initialize" ? 1 : 2;
            const res = await utils.http({
                method: "POST",
                url: data.request.url,
                headers,
                body: stage === "initialize"
                    ? {
                        jsonrpc: "2.0",
                        id: 1,
                        method: "initialize",
                        params: {
                            protocolVersion: "2025-03-26",
                            capabilities: {},
                            clientInfo: { name: "monid", version: "1.0.0" },
                        },
                    }
                    : data.input.body,
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            if (stage === "initialize") {
                session = res.headers["mcp-session-id"];
                if (session) headers["Mcp-Session-Id"] = session;
                headers["MCP-Protocol-Version"] = "2025-03-26";
            }
            // The transport buffers the response. Parallel normally returns
            // JSON; finite SSE POST replies may contain progress notifications
            // before the matching response. Join multiline data per SSE rules.
            let reply;
            try {
                const messages = typeof res.body === "string"
                    ? res.body.replace(/\r\n/g, "\n").split("\n\n")
                        .map((event) =>
                            event.split("\n")
                                .filter((line) => line.startsWith("data:"))
                                .map((line) => line.slice(5).replace(/^ /, ""))
                                .join("\n")
                        )
                        .filter((payload) => payload !== "")
                        .map((payload) => JSON.parse(payload))
                    : [res.body];
                reply = messages.find((message) =>
                    utils.json.optionalGet(message, "$.jsonrpc") === "2.0" &&
                    utils.json.optionalGet(message, "$.id") === id
                );
            } catch {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    output: { message: "Malformed MCP response" },
                };
            }
            if (reply === undefined) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    output: { message: "Missing matching MCP reply" },
                };
            }
            const error = utils.json.optionalGet(reply, "$.error");
            if (error !== undefined) {
                return { kind: "COMPLETED", httpStatus: 502, output: error };
            }
            const result = utils.json.optionalGet(reply, "$.result");
            if (
                result === null || typeof result !== "object" ||
                Array.isArray(result)
            ) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    output: { message: "Missing MCP result" },
                };
            }
            if (stage === "initialize") {
                if (
                    utils.json.optionalGet(result, "$.protocolVersion") !==
                        "2025-03-26"
                ) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: 502,
                        output: { message: "Unsupported MCP protocol version" },
                    };
                }
                const ready = await utils.http({
                    method: "POST",
                    url: data.request.url,
                    headers,
                    body: {
                        jsonrpc: "2.0",
                        method: "notifications/initialized",
                    },
                });
                if (ready.status < 200 || ready.status >= 300) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: ready.status,
                        output: ready.body,
                    };
                }
            } else {
                if (utils.json.optionalGet(result, "$.isError") === true) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: 502,
                        output: result,
                    };
                }
                const structured = utils.json.optionalGet(
                    result,
                    "$.structuredContent",
                );
                if (
                    structured === null || typeof structured !== "object" ||
                    Array.isArray(structured)
                ) {
                    return {
                        kind: "COMPLETED",
                        httpStatus: 502,
                        output: {
                            message: "Missing MCP structured content",
                            raw: result,
                        },
                    };
                }
                return {
                    kind: "COMPLETED",
                    httpStatus: 200,
                    output: structured,
                };
            }
        }
        throw new Error("MCP tool call did not complete");
    } finally {
        if (session) {
            // MCP session termination is optional server-side. Cleanup errors
            // must not replace a useful result or the original failure.
            try {
                await utils.http({
                    method: "DELETE",
                    url: data.request.url,
                    headers,
                });
            } catch { /* best-effort */ }
        }
    }
};

export default defineProvider({
    name: "parallel",
    meta: {
        displayName: "Parallel",
        summary:
            "Free web search and page extraction through Parallel Search MCP.",
        description:
            "Anonymous web search in Fast mode and focused page excerpts " +
            "through Parallel Search MCP. No Parallel account or API key required.",
        homepageUrl: "https://parallel.ai",
        docsUrl: "https://docs.parallel.ai/integrations/mcp/search-mcp",
        categories: ["web-search"],
        notes: [
            "The anonymous free tier is rate limited and intended for exploration and light use.",
            "Reuse session_id across related search and fetch calls in a conversation. This is separate from the per-run MCP transport session.",
        ],
    },
    // The contract requires an injector. An empty shape requests no secrets;
    // the identity injector keeps every owned request anonymous. The loose
    // shape tolerates the local resolver's legacy apiKey fallback, ignoring
    // any saved key instead of requiring or forwarding it.
    auth: {
        credentials: z.looseObject({}),
        inject: ({ data }) => data.request,
    },
    request: { baseUrl: "https://search.parallel.ai" },
    timeouts: { requestMs: 30_000, runMs: 120_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: { start },
});
