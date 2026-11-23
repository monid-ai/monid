import { defineProvider, presets } from "@shared/core";
import { z } from "zod";

export default defineProvider({
    name: "elfa",
    meta: {
        displayName: "Elfa",
        summary:
            "Crypto and equity social intelligence: events, storylines, calls, mindshare, a market calendar, prediction markets and claim verification.",
        description: "Elfa reads crypto and markets X (Twitter) and " +
            "Telegram in real time and turns it into structured data for " +
            "agents. The v3 endpoints serve analyzed events (what " +
            "happened, to which asset, bullish or bearish), storylines " +
            "and arcs that group events into developing stories, the " +
            "Polymarket and Kalshi markets those stories bear on, a " +
            "calendar of scheduled launches, unlocks, listings, earnings " +
            "and macro releases, trading calls and positions with each " +
            "caller's track record, long/short positioning per asset, " +
            "mindshare rankings for crypto and equities, trending " +
            "contract addresses, ranked accounts to watch, and a " +
            "fact-check that judges a statement against posts and web " +
            "pages. The v2 endpoints serve trending tokens by mention " +
            "count, top and keyword mentions, token news posts, trending " +
            "narratives and keyword event summaries. Resolve a ticker, " +
            "name, handle or contract address to an id with " +
            "elfa#v3/entities first, then pass it as `entityIds`.",
        homepageUrl: "https://elfa.ai",
        docsUrl: "https://docs.elfa.ai",
        categories: [
            "crypto-signals",
            "twitter",
            "equities",
            "prediction-markets",
        ],
        notes: [
            "Billed in Elfa credits. Elfa reports the exact charge of every " +
            "successful call, and that figure settles the bill; the rate " +
            "card on each endpoint is the most a call can cost. v3 list " +
            "endpoints charge per returned object only once per window " +
            "for the whole Monid platform, so a repeat read often costs " +
            "less. Errors cost nothing.",
            "Timestamps (`from`, `to`, `asOf`) are unix seconds. v3 reads are cut " +
            "to the history window of the Elfa plan behind the platform " +
            "key; `servedFrom` says where a page actually started.",
        ],
    },
    auth: { inject: presets.auth.header("x-elfa-api-key") },
    request: {
        baseUrl: "https://api.elfa.ai",
        headers: { Accept: "application/json" },
    },
    timeouts: { requestMs: 60_000, runMs: 60_000 },
    input: {
        toRequest: ({ data }) => ({
            ...data.input,
            queryParams: Object.fromEntries(
                Object.entries(data.input.queryParams ?? {}).map((
                    [key, value],
                ) => [key, Array.isArray(value) ? value.join(",") : value]),
            ),
        }),
    },
    lifecycle: {
        state: z.strictObject({
            credits: z.number().nonnegative().optional(),
            objects: z.number().nonnegative().optional(),
            window: z.number().nonnegative().optional(),
        }),
        start: async ({ utils }) => {
            const response = await utils.request();
            const raw = response.headers["x-elfa-credits"];
            const credits = raw !== undefined && /^\d+$/.test(raw.trim()) &&
                    Number.isSafeInteger(Number(raw))
                ? Number(raw)
                : undefined;
            const parts = (response.headers["x-elfa-credits-detail"] ?? "")
                .split(";")
                .map((part) => part.trim().split("="));
            const objects = parts.find((part) => part[0] === "objects");
            const window = parts.find((part) => part[0] === "window");
            const hasBase = parts.some((part) =>
                part[0] === "base" && /^\d+$/.test(part[1] ?? "")
            );
            const data = {
                ...(credits !== undefined ? { credits } : {}),
                ...(hasBase && objects !== undefined &&
                        /^\d+$/.test(objects[1] ?? "")
                    ? { objects: Number(objects[1]) }
                    : {}),
                ...(hasBase
                    ? {
                        window: window !== undefined &&
                                /^\d+$/.test(window[1] ?? "")
                            ? Number(window[1])
                            : 0,
                    }
                    : {}),
            };
            return {
                kind: "COMPLETED",
                httpStatus: response.status,
                output: response.body,
                ...(Object.keys(data).length > 0 ? { state: { data } } : {}),
            };
        },
    },
    usage: {
        credits: { default: { label: "Elfa credits" } },
        consolidate: ({ data, utils }) => {
            const credits = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.credits",
            );
            return {
                credits: {
                    ...(typeof credits === "number"
                        ? { default: credits }
                        : {}),
                },
            };
        },
    },
    output: {
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.message");
            const error = utils.json.optionalGet(data.output, "$.error");
            const code = utils.json.optionalGet(data.output, "$.code");
            const details = utils.json.optionalGet(data.output, "$.details");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : typeof error === "string" && error !== ""
                    ? error
                    : "Elfa API error",
                ...(typeof code === "string" ? { code } : {}),
                ...(details !== undefined && details !== null
                    ? { details }
                    : {}),
                raw: data.output,
            };
        },
    },
});
