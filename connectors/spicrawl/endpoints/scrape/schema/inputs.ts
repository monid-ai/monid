import { z } from "zod";

/**
 * `POST /v1/scrape` request body — the curated subset of Spicrawl's
 * ScrapeRequest, mirrored field-for-field from the OpenAPI (types, enums,
 * patterns, descriptions; optionality only, no `.default()`, D25).
 *
 * `.strict()` and the omitted fields are deliberate. Monid sends every user's
 * call with ONE shared Spicrawl key, so per-account and per-network state must
 * never pass through: `session_id`, `sticky_key`, `proxy`, `proxy_verify`,
 * `premium_proxy`, `proxy_country` and `custom_headers` are not exposed.
 * `response_format` is not exposed either — `input.toRequest` pins it to
 * "json" so the body is always the envelope that carries `credits`.
 * Also not exposed: `actions`, `network_capture`, `ai_extract`, the
 * screenshot family, `engine`/`headless` (deprecated) and `stealth` /
 * `original_status` / `block_resources` / `impersonate` / `sections` /
 * `custom_headers` (not needed for the curated surface).
 */

export const zScrapeBody = z.object({
    url: z.url().max(8192).describe(
        "Target URL; required, must be http or https with a host. A private " +
            "or reserved address fails with 400 ERR::SECURITY::SSRF_BLOCKED at " +
            "0 credits.",
    ),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"])
        .describe(
            "HTTP method sent to the target (case-insensitive). There is no " +
                "request-body parameter, so non-GET methods are sent without a " +
                "body; only GET/HEAD/OPTIONS are retried on transient failure and " +
                "only GET results are cached.",
        ).optional(),
    js_render: z.boolean().describe(
        "Run the page's JavaScript before capture (3 credits on datacenter " +
            "or your own proxy; 25 on managed residential exits, coming soon). " +
            "Required by every browser-only flag unless stealth or mode=auto is " +
            "set; cannot be combined with mode=auto. If omitted, the project's " +
            "stored default applies.",
    ).optional(),
    solve_captcha: z.boolean().describe(
        "Solve the captcha widgets embedded in the page (Cloudflare " +
            "Turnstile, reCAPTCHA v2, hCaptcha) before `actions` run. Selects " +
            "full-browser rendering, as `stealth` does. Cannot be combined with " +
            "mode=auto, which returns 400 ERR::REQUEST::INCOMPATIBLE_FLAGS. " +
            "Blocking challenge pages are solved on full-browser renders " +
            "without this flag when the platform has a provider configured. A " +
            "successful solve adds 5 credits (see x-spicrawl-credits).",
    ).optional(),
    mode: z.enum(["auto"]).describe(
        "`auto` escalates through the rendering tiers (plain fetch, then " +
            "JavaScript rendering) until one returns a usable page, billing " +
            "only the rung that succeeded (0 if all fail) while reserving the " +
            "dearest rung against quota. Incompatible with js_render and " +
            "stealth. If omitted, the project's stored default applies.",
    ).optional(),
    wait: z.number().int().min(0).max(30000).describe(
        "Milliseconds to wait after load before capture. Browser-only: " +
            "needs js_render, stealth, or mode=auto, else 400 " +
            "ERR::REQUEST::INCOMPATIBLE_FLAGS.",
    ).optional(),
    wait_for: z.string().describe(
        "CSS selector to wait for before capture. Browser-only. If it never " +
            "appears the page is returned as it stood with an X-Warning " +
            "RENDER_DEGRADED; if the render times out waiting it fails 504 " +
            "ERR::UPSTREAM::TIMEOUT - raise wait_for_timeout or fix the " +
            "selector.",
    ).optional(),
    wait_for_timeout: z.number().int().min(0).max(120000).describe(
        "Milliseconds to wait for `wait_for`; 0 uses the engine default. " +
            "Requires wait_for (400 ERR::REQUEST::INCOMPATIBLE_FLAGS " +
            "otherwise).",
    ).optional(),
    scroll_pages: z.number().int().min(0).max(20).describe(
        "Scroll to the bottom up to this many times before capture, " +
            "stopping early once the page stops growing. For infinite-scroll " +
            "pages (feeds, search results, social timelines) where only the " +
            "first screen is in the page until scrolled. Shorthand for a " +
            'trailing {"scroll": {"to_bottom": true, "max_iterations": N}} step ' +
            "after actions. Routes like actions: full-browser rendering. With " +
            "neither js_render nor mode=auto it is 400 " +
            "ERR::REQUEST::INCOMPATIBLE_FLAGS. Out of range is 400 " +
            "ERR::REQUEST::INVALID_PARAMETER. Refused on /v1/batch with 400 " +
            "INVALID_PARAMETER. If scrolling stops early, the page is returned " +
            "with the warning scroll_pages: scrolling stopped early: reason.",
    ).optional(),
    autoparse: z.boolean().describe(
        "Harvest the page's own structured metadata (JSON-LD, OpenGraph, " +
            "Twitter, microdata, RDFa, meta, embedded SPA state) into `data`, " +
            "no selectors needed. Forces the JSON envelope; no extra credits; " +
            "refused on a PDF.",
    ).optional(),
    links: z.boolean().describe(
        "Return the page's absolute, de-duplicated <a href> targets under " +
            "`links`. Forces the JSON envelope; no extra credits; refused on a " +
            "PDF. If omitted, the project's stored default applies.",
    ).optional(),
    extract: z.union([
        z.looseObject({
            type: z.literal("object"),
            properties: z.record(z.string(), z.looseObject({})),
            required: z.array(z.string()).optional(),
        }),
        z.record(
            z.string(),
            z.union([
                z.string().min(1),
                z.looseObject({ selector: z.string().min(1) }),
            ]),
        ),
    ]).describe(
        "Selector extraction into `data`: a selector map, or a JSON Schema " +
            "whose properties carry `selector`. Forces the JSON envelope, " +
            "validated before fetching, no extra credits; mutually exclusive " +
            "with extract_preset. Rules that match nothing are listed in " +
            "`empty_fields`. An empty object is 400. Refused on PDF targets " +
            "(502 ERR::EXTRACT::FAILED).",
    ).optional(),
    extract_preset: z.string().describe(
        "Coming soon. Name of a server-side extraction preset. This " +
            "deployment has no preset store, so any value fails with 400 " +
            "ERR::EXTRACT::INVALID_RULES (at 0 credits, after the fetch); use " +
            "`extract` inline. Mutually exclusive with extract.",
    ).optional(),
    main_content_only: z.boolean().describe(
        "true strips nav/footer/aside to the main article; false keeps the " +
            "whole document. Omitted is on by default for markdown, text and " +
            "json, and off for html; pass false to keep the whole page. Applies " +
            "to markdown/text/cleaned output. A request or project value always " +
            "wins.",
    ).optional(),
    include_tags: z.array(z.string()).describe(
        "CSS selectors; keep only matching subtrees before extraction and " +
            "markdown conversion. Applied before exclude_tags and " +
            "main_content_only.",
    ).optional(),
    exclude_tags: z.array(z.string()).describe(
        "CSS selectors; remove matching elements, applied after " +
            "include_tags and before main_content_only.",
    ).optional(),
    parse_pdf: z.boolean().describe(
        "When the target returns a PDF and markdown/text is requested, " +
            "parse it to text. false refuses it with 502 ERR::EXTRACT::FAILED " +
            "(0 credits); response_format=html always returns the raw bytes. If " +
            "omitted, the project's stored default applies.",
    ).optional(),
    cache: z.boolean().describe(
        "Serve a stored result younger than cache_ttl (Cache-State: hit). A " +
            "hit is billed at the same price as the fetch that stored it: the " +
            "cache saves the fetch (latency and load on the target), not " +
            "credits. Only billable successes of GET-method requests without " +
            "session_id or actions are stored. Set false for time-sensitive " +
            "data; cache=false with cache_ttl>0 is 400 " +
            "ERR::REQUEST::INCOMPATIBLE_FLAGS.",
    ).optional(),
    cache_ttl: z.number().int().min(0).describe(
        "Maximum acceptable age of a cached result, in seconds. Default and " +
            "cap are deployment settings (48h by default); larger values are " +
            "clamped with X-Warning CACHE_TTL_CLAMPED. 0 disables caching for " +
            "this request.",
    ).optional(),
    max_cost: z.number().int().min(0).describe(
        "Credit ceiling; 0 means none. Checked against the dearest " +
            "reachable outcome (the top rung under mode=auto) before anything " +
            "runs, failing 400 ERR::LIMIT::MAX_COST_EXCEEDED at 0 credits. It " +
            "is also the only way a bot-challenge climb may bill above the " +
            "request's own price: a request is never billed above its own price " +
            "unless `max_cost` or `mode=auto` allows it, so without `max_cost` " +
            "a challenged request returns ERR::UPSTREAM::CHALLENGE at 0 credits " +
            "rather than climbing to a browser. Set it to the browser rung's " +
            "price to allow the climb.",
    ).optional(),
    allowed_status_codes: z.array(z.number().int().min(100).max(599)).describe(
        "Extra target statuses to treat as billable successes (200, 404 and " +
            "410 always are). Other statuses return the target's body at 0 " +
            "credits, and under mode=auto trigger escalation.",
    ).optional(),
}).strict();
