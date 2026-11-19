import { defineProvider, presets, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";

/**
 * Zenrows (zenrows.com), live web data. Two synchronous endpoints on ONE
 * wire surface: `GET https://api.zenrows.com/v1/` with query parameters
 * and `X-API-Key` auth. `zenrows#scrape` reads the page, `zenrows#extract`
 * sends `extract=auto` and reads the fields Zenrows parsed out of it.
 * Both pin `endpoint:` explicitly, because the shared wire path `/` would
 * otherwise derive the same empty id for the pair (design D22).
 *
 * BILLING. Zenrows meters one pool of plan CREDITS per account: 1 for a
 * plain request, 5 with JavaScript rendering, 10 with Premium Proxies, 25
 * with both. The pool is that credit, not the dollars `X-Request-Cost`
 * also reports, because the credit is what a customer holds and tops up
 * while the dollars per credit vary by plan tier. A dollar pool would
 * pin one tier into the doc and go stale on the next repricing.
 *
 * THE CLAIM ARRIVES IN A HEADER. `X-Request-Credits` is the draw, and
 * monid's pure hooks never see response headers: `usage.consolidate` gets
 * a `zEnvelopeData` with no header member, and headers live on the
 * `HttpResult` only lifecycle hooks hold. So `lifecycle.start` below
 * relays the call through `utils.request()`, parses the header once and
 * stashes it in run state; `usage.consolidate` and `usage.evidence` both
 * read it back at `$.data.creditsCharged` (the ahrefs and cloro pattern).
 * The relay replaces declarative execution for every endpoint under this
 * provider, which is right here because both are synchronous and neither
 * polls.
 *
 * THE RATE IS AN IDENTITY. `PER_UNIT` on `Unit.CREDIT` consuming 1 credit
 * per credit, so the engine's derived fold equals the vendor's claim and
 * no `usage.mismatch` fires on a run that billed what Zenrows says it
 * billed. Any other rate would restate the vendor's own arithmetic and
 * drift silently the next time Zenrows reweighs a configuration.
 *
 * A MISSING METER FALLS BACK TO 25, NEVER TO ZERO. When the header is
 * absent or unparseable the evidence falls back to 25, the top of the
 * table, and the consolidate omits the pool entry so the engine settles
 * on that derived fold. `?? 0` would turn a stripped header into a free
 * run and leave the cost with whoever brokers it. Erring high is
 * correctable; erring at zero is a silent subsidy. Non-2xx responses
 * settle at zero: a fn cannot bill an error.
 */
export default defineProvider({
    name: "zenrows",
    meta: {
        displayName: "Zenrows",
        summary:
            "Fetch any public page as Markdown, HTML or text, or as the structured fields Zenrows parsed from it.",
        description:
            "Live web data: fetch any public page as Markdown, HTML or text, pull structured fields from it as JSON, run batch jobs over many URLs, crawl a site from one start URL and drive a hosted browser for pages that need clicks, forms or pagination, with proxies, JavaScript rendering and anti-bot protection handled by Zenrows" +
            ". This connector exposes the single-page fetch: one URL in, " +
            "the page or its parsed fields out. Batch jobs over many " +
            "URLs, crawling a site from one start URL and the hosted " +
            "Browser are separate Zenrows surfaces with their own job " +
            "lifecycles and sessions, and none of them is on this " +
            "connector.",
        homepageUrl: "https://www.zenrows.com",
        docsUrl: "https://docs.zenrows.com",
        categories: ["web-scraping", "web-extraction"],
        notes: [
            "Billed in Zenrows credits: 1 for a plain request, 5 with " +
            "JavaScript rendering, 10 with Premium Proxies, 25 with both. " +
            "The X-Request-Credits response header settles the bill; " +
            "without it, settlement falls back to 25, the worst case. " +
            "A request Zenrows itself rejects draws nothing; a target " +
            "site's own error reached through allowed_status_codes is " +
            "charged.",
            "A request fetches the target site live and can take up to 3 " +
            "minutes, so allow for it rather than retrying early.",
            "The plan caps concurrency and request rate separately, and " +
            "both answer 429: AUTH006 means every concurrency slot is " +
            "busy and clears when a request in flight finishes, AUTH008 " +
            "means too many requests across the period and wants " +
            "exponential backoff.",
        ],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://api.zenrows.com/v1" },
    // Zenrows documents a ceiling of 3 minutes per request and tells
    // clients to set a 180 s timeout; the run budget leaves room for the
    // response to arrive.
    timeouts: { requestMs: 180_000, runMs: 190_000 },
    lifecycle: {
        state: z.strictObject({
            creditsCharged: z.number().nonnegative().optional(),
        }),
        start: async ({ utils }) => {
            const response = await utils.request();
            const raw = response.headers["x-request-credits"];
            const parsed = raw !== undefined && /^\d+$/.test(raw.trim())
                ? Number(raw)
                : undefined;
            const creditsCharged =
                parsed !== undefined && Number.isSafeInteger(parsed)
                    ? parsed
                    : undefined;
            return {
                kind: "COMPLETED",
                httpStatus: response.status,
                output: response.body,
                ...(creditsCharged !== undefined
                    ? { state: { data: { creditsCharged } } }
                    : {}),
            };
        },
    },
    usage: {
        credits: {
            default: {
                label: "Zenrows credits",
                description:
                    "the account's plan credits; a request draws 1, 5 with " +
                    "JavaScript rendering, 10 with Premium Proxies, 25 " +
                    "with both",
            },
        },
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            label: "Zenrows credits",
            description: "credits the request drew, as X-Request-Credits " +
                "reports them",
            consumes: { credit: "default", amount: 1 },
        },
        /** The hold is what the caller's own configuration draws, as the
         *  published rate card prices it and a live probe confirmed: a
         *  plain request 1 credit, JavaScript rendering 5, Premium
         *  Proxies 10, the two together 25. `mode=auto` is the one
         *  configuration that cannot be priced ahead, because Adaptive
         *  Stealth Mode escalates per page and settles anywhere in that
         *  range, so it holds the 25-credit ceiling and the surplus is
         *  released at settle. Holding 25 for every call instead would
         *  reserve 25x what a plain scrape costs and fail admission on
         *  balances that would have covered the run. */
        estimate: ({ data }) => {
            const queryParams = data.input.queryParams ?? {};
            const jsRender = queryParams.js_render === true;
            const premiumProxy = queryParams.premium_proxy === true;
            const credits =
                queryParams.mode === "auto" || (jsRender && premiumProxy)
                    ? 25
                    : premiumProxy
                    ? 10
                    : jsRender
                    ? 5
                    : 1;
            return { counts: { CREDIT: credits } };
        },
        evidence: ({ data, utils }) => {
            const creditsCharged = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.creditsCharged",
            );
            return {
                counts: {
                    CREDIT: typeof creditsCharged === "number"
                        ? creditsCharged
                        : 25,
                },
            };
        },
        consolidate: ({ data, utils }) => {
            const creditsCharged = utils.json.optionalGet(
                data.lifecycle?.state ?? null,
                "$.data.creditsCharged",
            );
            return {
                credits: {
                    ...(typeof creditsCharged === "number"
                        ? { default: creditsCharged }
                        : {}),
                },
            };
        },
    },
    output: {
        /** Zenrows errors are RFC 7807 `application/problem+json`:
         *  `{type, title, status, detail?, instance, code}`. Some 400s
         *  carry no `detail`, so `title` is the fallback message. The raw
         *  envelope rides under `raw`: digest, never hide. */
        fromError: ({ data, utils }) => {
            const detail = utils.json.optionalGet(data.output, "$.detail");
            const title = utils.json.optionalGet(data.output, "$.title");
            const code = utils.json.optionalGet(data.output, "$.code");
            return {
                message: typeof detail === "string" && detail !== ""
                    ? detail
                    : typeof title === "string" && title !== ""
                    ? title
                    : "Zenrows API error",
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
