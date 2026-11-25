import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zScrapeBody } from "./schema/inputs.ts";

/**
 * `POST /v1/scrape` — one URL into clean, LLM-ready content.
 *
 * BILLING (one PER_UNIT line, one credit per unit). The estimate is deduced
 * from the request: a plain fetch is 1 credit; `js_render` is 3; `mode:"auto"`
 * and `solve_captcha` and `scroll_pages > 0` all select full-browser rendering, reserved at 8 (auto
 * may escalate and bills only the rung that succeeded, so 8 is a ceiling);
 * `solve_captcha` adds a 5-credit solve surcharge on top. `max_cost`, when
 * set, caps the estimate. Settle is the vendor's reported `credits`.
 *
 * `input.toRequest` forces `response_format: "json"`, so the body is always
 * the envelope that carries `credits` and `status`.
 */
export default defineEndpoint({
    meta: {
        displayName: "Spicrawl Scrape",
        summary: "Scrape one URL into clean markdown, with browser rendering " +
            "and anti-bot escalation.",
        description: "Turn any URL into clean, LLM-ready markdown. A plain " +
            "HTTP fetch is the cheap default; set `js_render` to run the " +
            "page's JavaScript first, `solve_captcha` to clear Cloudflare " +
            'Turnstile, reCAPTCHA or hCaptcha widgets, or `mode: "auto"` ' +
            "to let Spicrawl escalate from a plain fetch to a rendered page " +
            "until one works, billing only the rung that succeeded. Content " +
            "comes back as markdown in `content`; `main_content_only` strips " +
            "navigation and footers, `include_tags` and `exclude_tags` narrow " +
            "the page by CSS selector, and `extract`, `autoparse` and `links` " +
            "return structured data alongside. PDFs are parsed to text. " +
            "Billing: only target statuses 200, 404 and 410 (plus any listed " +
            "in `allowed_status_codes`) are charged. Failed requests and " +
            "other target statuses cost 0. `status` in the response is the " +
            "TARGET's HTTP status, not the API's. Use `max_cost` to cap what " +
            "a request may bill.",
        docsUrl: "https://docs.spicrawl.com",
        categories: ["web-scraping"],
    },
    request: { method: "POST", path: "/scrape" },
    input: {
        schema: { body: zScrapeBody },
        /** The JSON envelope is the only shape that carries `credits`, so the
         *  response format is pinned here, not exposed to callers. */
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, {
                response_format: "json",
            }),
        }),
    },
    timeouts: { requestMs: 120_000, runMs: 125_000 },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.CREDIT,
            consumes: { credit: "default", amount: 1 },
            label: "scrape",
        },
        /** Deduced from the request, never defaulted: the rung the flags
         *  select, plus the solve surcharge, capped by `max_cost`. */
        estimate: ({ data }) => {
            const body = data.input.body;
            const browser = body.solve_captcha === true ||
                body.mode === "auto" || (body.scroll_pages ?? 0) > 0;
            const rung = browser ? 8 : body.js_render === true ? 3 : 1;
            const surcharge = body.solve_captcha === true ? 5 : 0;
            const total = rung + surcharge;
            const ceiling = body.max_cost !== undefined && body.max_cost > 0
                ? Math.min(total, body.max_cost)
                : total;
            return { counts: { CREDIT: ceiling } };
        },
        /** The reported count, read off the raw envelope. Absent → no
         *  quantity (the fold yields 0; the vendor claim still wins). */
        evidence: ({ data, utils }) => {
            const credits = utils.json.optionalNum(data.output, "$.credits");
            return {
                counts: credits === undefined ? {} : { CREDIT: credits },
            };
        },
    },
});
