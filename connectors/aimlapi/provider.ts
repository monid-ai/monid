import { defineProvider } from "@shared/core";

/**
 * AI/ML API (aimlapi.com) — one OpenAI-compatible gateway over ~930
 * published models: 365 chat models (OpenAI, Anthropic, Google, Alibaba,
 * DeepSeek, …), 125 image models, plus embeddings/audio/video families,
 * behind Bearer auth on `https://api.aimlapi.com/v1`.
 *
 * Rate card (verified live 2026-10-15): the gateway reports its OWN charge
 * on every billable response as `meta.usage: {credits_used, usd_spent}` —
 * that is the vendor claim (D27) and it is consolidated here, at provider
 * level, for every endpoint that carries it. The pool IS dollars, because
 * `usd_spent` is dollars. The credit is the gateway's native unit and sits
 * at a FIXED rate against it: 8 credits / $0.000004 on a chat call and
 * 65,000 / $0.0325 on an image call both give exactly 2,000,000 credits
 * per US dollar, i.e. $0.0000005 per credit — which is why the metered
 * endpoints can count `credits_used` and still fold to the claim exactly
 * (no `usage.mismatch.derived`).
 *
 * Vendor non-2xx is DATA: AI/ML API error bodies are
 * `{title, status, message, instance, requestId, timestamp,
 * error: {name, message, details?}}`, which `output.fromError` normalizes.
 *
 * ATTRIBUTION (partner telemetry). Every request that actually reaches the
 * gateway carries `X-AIMLAPI-Source: agent/monid`, `HTTP-Referer` (monid's
 * own repo) and `X-Title: Monid`, plus `X-AIMLAPI-Partner-ID` once a
 * partner id exists. Three properties the gate below is built for, each
 * covered by `provider.test.ts`:
 *
 *   1. It hangs off `auth.inject`, not `request.headers`. Static headers
 *      are attached by the compiler and would egress to WHATEVER host the
 *      resolved url names; `auth.inject` is the last hook before the wire
 *      and the only one handed the RESOLVED url (`data.request.url`), so
 *      the headers can follow the DESTINATION instead of the connector
 *      name. A `request.baseUrl` override on provider or endpoint
 *      therefore moves attribution with it — point it elsewhere and the
 *      headers stop being sent.
 *   2. The host test is EQUALITY on the parsed hostname, never a
 *      substring or suffix match: `api.aimlapi.com.example.net` and
 *      `notapi.aimlapi.com` must not collect our partner id. `URL` is not
 *      a whitelisted closed-term global, so the authority is cut out with
 *      string ops (scheme → authority → userinfo → port), and anything
 *      unparseable (no scheme, bracketed IPv6 literal) falls through to
 *      the bare, unattributed request.
 *   3. The partner id is MINTED BY AI/ML API, registered for monid on
 *      2026-10-15, and sent only to the gateway host by the same gate.
 *      An EMPTY literal omits the header entirely rather than sending it
 *      blank, which is what shipped before the id existed;
 *      `provider.test.ts` reads the literal back out of the compiled fn
 *      source and holds it to `^$|^part_[A-Za-z0-9]{1,64}$`, so a
 *      malformed id cannot ship.
 */
export default defineProvider({
    name: "aimlapi",
    meta: {
        displayName: "AI/ML API",
        summary: "One OpenAI-compatible key for ~365 chat models and ~125 " +
            "image models.",
        description: "AI/ML API is a single OpenAI-compatible gateway in " +
            "front of hundreds of models from many vendors: chat and " +
            "reasoning models (GPT, Claude, Gemini, DeepSeek, Qwen, Kimi, " +
            "Llama, Mistral, …) and image models (FLUX, Imagen, Qwen-Image, " +
            "Seedream, GPT-Image, …), all under one key, one base url and " +
            "one bill. Model ids keep their vendor prefix " +
            "(`openai/gpt-4o-mini`, `anthropic/claude-opus-5.5`), and the " +
            "live roster is readable without a key, so nothing here pins a " +
            "model list: `aimlapi#models` reports what the account can " +
            "actually call today.",
        homepageUrl: "https://aimlapi.com",
        docsUrl: "https://docs.aimlapi.com",
        categories: ["text-generation", "image-generation"],
    },
    /**
     * Bearer auth AND the attribution gate, in the one hook that sees the
     * resolved destination. Closed term: no imports, no captures, and no
     * `URL` — the hostname is cut out of `data.request.url` with string
     * operations.
     *
     * Note that attribution rides on the AUTH hook deliberately: a doc
     * with no auth block egresses BARE (D16) and never calls an inject,
     * so wiring the headers here means every authed request — which is
     * every request this connector makes — is attributed, and nothing
     * else is.
     */
    auth: {
        inject: ({ data }) => {
            const authed = {
                ...data.request.headers,
                Authorization: "Bearer " + data.params.apiKey,
            };
            // scheme://[userinfo@]host[:port]/path?query#fragment — take
            // what follows the FIRST "://", then cut the authority off at
            // the first "/", "?" or "#".
            const afterScheme = data.request.url.split("://")[1];
            const authority = (afterScheme === undefined ? "" : afterScheme)
                .split("/")[0].split("?")[0].split("#")[0];
            // userinfo is everything before the LAST "@"
            const atParts = authority.split("@");
            const hostPort = atParts[atParts.length - 1];
            // a bracketed IPv6 literal is never our DNS name; refuse to
            // guess rather than mis-parse it
            const hostname = hostPort.indexOf("[") === 0
                ? ""
                : hostPort.split(":")[0].toLowerCase();
            // EXACT host match. A suffix or substring test here would hand
            // the partner id to api.aimlapi.com.example.net.
            if (hostname !== "api.aimlapi.com") {
                return { ...data.request, headers: authed };
            }
            // ONE-LINE change when AI/ML API mints monid's partner id;
            // empty means the header is not sent at all.
            const partnerId = "part_pMK3e60XT8WaIHr827sULMKZ";
            return {
                ...data.request,
                headers: {
                    ...authed,
                    "X-AIMLAPI-Source": "agent/monid",
                    "HTTP-Referer": "https://github.com/monid-ai/monid",
                    "X-Title": "Monid",
                    ...(partnerId.length === 0
                        ? {}
                        : { "X-AIMLAPI-Partner-ID": partnerId }),
                },
            };
        },
    },
    request: { baseUrl: "https://api.aimlapi.com/v1" },
    timeouts: { requestMs: 120_000, runMs: 180_000 },
    usage: {
        /** THE credit system (design D26): the gateway prices and reports
         *  in US dollars (`meta.usage.usd_spent`), so the pool IS dollars. */
        credits: { default: { label: "US dollars" } },
        /** The vendor's OWN claim (design D27): billable responses carry
         *  `meta.usage: {credits_used, usd_spent}` — pluck that node out of
         *  the payload in one motion and claim the dollars. Absent on the
         *  free endpoints (`#models`, `#key`), where the entry is OMITTED
         *  and the derived (FREE) fold settles.
         *
         *  `pluck` is EXACT, which matters here: the chat envelope also
         *  carries a TOP-LEVEL `usage` of token counts, and that one is
         *  the caller's to read — a deep `omit(["usage"])` would strip it. */
        consolidate: ({ data, utils }) => {
            const { value, rest } = utils.json.pluck(
                data.output,
                "$.meta.usage",
            );
            const usd = value === undefined || value === null
                ? undefined
                : utils.json.optionalNum(value, "$.usd_spent");
            return {
                credits: {
                    ...(usd !== undefined && usd > 0 ? { default: usd } : {}),
                },
                output: rest,
            };
        },
    },
    output: {
        /** AI/ML API error envelopes: a top-level `message` with the same
         *  text nested at `error.message`; `error.details` carries the
         *  per-field reasons on a 400. Read the flat one, then the nested. */
        fromError: ({ data, utils }) => {
            const flat = utils.json.optionalStr(data.output, "$.message");
            const nested = utils.json.optionalStr(
                data.output,
                "$.error.message",
            );
            const text = [flat, nested].find((value) =>
                typeof value === "string" && value !== ""
            );
            return {
                message: typeof text === "string" ? text : "AI/ML API error",
                raw: data.output,
            };
        },
    },
});
