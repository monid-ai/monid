import { defineProvider, presets } from "@shared/core";

/**
 * Pressfront Trace: who started it, who spread it, what they're saying, for
 * any X or Bluesky name or any story going around. JSON over HTTPS against
 * `https://pressfront.co/api/v1` with `Authorization: Bearer <key>` (docs:
 * https://pressfront.co/developers, OpenAPI:
 * https://pressfront.co/api/v1/openapi.json).
 *
 * Five endpoints (each folder under endpoints/ registers itself):
 *   `GET  /instant/{handle}`        what the newest trace of a name from the
 *                                   last 24 h says, else a search now (about
 *                                   a minute); async on the search ($0.49)
 *   `POST /understand`              what Pressfront reads a situation in plain
 *                                   words as, starting nothing (sync, $0.05)
 *   `POST /traces`                  a fresh trace of a name, a story, or a
 *                                   situation in plain words: a durable job of
 *                                   about 4 to 7 minutes (async, $4.99)
 *   `GET  /traces/{id}`             the job's status (free, the poll)
 *   `GET  /traces/{id}/{part}`      one part of a finished trace, the case
 *                                   card included (sync, $0.05)
 *
 * Pressfront prices in US dollars per call and reports no meter in its
 * responses, so there is no consolidate: the pinned PER_CALL rates ARE the
 * bill, and a non-2xx answer (no recent trace, a failed trace, an unclear
 * situation) is zero-billed by the engine. The async lifecycles live on the
 * endpoints (a provider-level start would replace the sync endpoints'
 * execution).
 */
export default defineProvider({
    name: "pressfront",
    meta: {
        displayName: "Pressfront Trace",
        summary: "Who started it, who spread it, what they're saying, for " +
            "any X or Bluesky name or any story going around.",
        description: "Pressfront Trace reads everyone posting at or about a " +
            "name on X and Bluesky (thousands of accounts per trace) and " +
            "returns who started it, who carried it, the sides (strongly " +
            "critical, mocking, disagreeing, supportive, neutral, read by a " +
            "language model and labeled so), what the critical posts claim, " +
            "who moved together, the pace, and a link to every post. An " +
            "instant check answers from the newest trace of the last 24 " +
            "hours in about a second; a full trace runs fresh in about 4 to 7 " +
            "minutes. Every answer carries a plain-Markdown brief with " +
            "numbered sources, written for an LLM to explain. A story going " +
            "around (or the situation in your own words) traces the same " +
            "way: the earliest public post found, how it spread, who " +
            "carried it, whether it came round before, as a four-stop " +
            "answer card. It reports what people posted, never whether a " +
            "story is true. Public posts only; it never says who anyone is " +
            "in real life.",
        homepageUrl: "https://pressfront.co/claude",
        docsUrl: "https://pressfront.co/developers",
        categories: ["twitter"],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://pressfront.co/api/v1" },
    timeouts: { requestMs: 30_000, runMs: 40_000 },
    usage: {
        /** Pressfront's prices are US dollars per call (pressfront.co/claude),
         *  so the pool IS dollars. No vendor meter rides the responses. */
        credits: { default: { label: "US dollars" } },
    },
    output: {
        /** Pressfront's error envelope is `{error, message}`: a short code and
         *  one sentence a person can act on (e.g. 404 `no_recent_trace`,
         *  409 `not_ready`, 429 `rate_limited`). Non-2xx is DATA, zero-billed. */
        fromError: ({ data, utils }) => {
            const message = utils.json.optionalGet(data.output, "$.message");
            const code = utils.json.optionalGet(data.output, "$.error");
            return {
                message: typeof message === "string" && message !== ""
                    ? message
                    : "Pressfront API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
