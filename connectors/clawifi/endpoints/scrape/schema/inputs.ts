import { z } from "zod";
import {
    zClawifiBrowserProfile,
    zClawifiExcludeTags,
    zClawifiQuery,
    zClawifiSkipArchive,
    zClawifiTargetSelector,
    zClawifiTargetUrl,
    zClawifiTimeoutSeconds,
    zClawifiTopK,
    zClawifiWaitForSelector,
    zClawifiWaitUntil,
} from "../../../schema/common.ts";

/**
 * `POST /scrape` body: Clawifi's `ScrapeRequest` + `ScrapeFormatOption`
 * (`clawifi/core/models.py`; OpenAPI snapshot `openapi-v1.json`, Clawifi
 * 1.7.5). Optionality only (D25). The request model is non-strict; the
 * typed format option is `extra="forbid"` upstream, so it is strict here.
 * Its cross-field rules (`mode` other than 'default' only on markdown/html/
 * raw_html/text, `quality` only on screenshot, `schema` only on json) are
 * pydantic model validators and live in the endpoint `notes`.
 *
 * `requires_auth` and `proxy_config` are deliberately NOT EXPOSED, for the
 * reasons given on the `/fetch` mirror, and stripped by `input.toRequest`.
 */
const zScrapeFormatName = z.enum([
    "markdown",
    "html",
    "raw_html",
    "text",
    "links",
    "metadata",
    "screenshot",
    "images",
    "json",
    "state_json",
]);

const zScrapeFormatOption = z.strictObject({
    type: zScrapeFormatName.describe("The output format."),
    mode: z.enum(["default", "reader", "prune"]).describe(
        "Content selection for markdown, text, html and raw_html (vendor " +
            "default 'default'): 'prune' removes scripts and styles, " +
            "'reader' also keeps only the page's main, article or body " +
            "element.",
    ).optional(),
    max_chars: z.number().int().min(1).max(200_000).describe(
        "Cap on returned text or HTML (1-200000 characters).",
    ).optional(),
    max_items: z.number().int().min(1).max(200).describe(
        "Cap on returned links or images (1-200).",
    ).optional(),
    max_bytes: z.number().int().min(1024).max(5_000_000).describe(
        "Cap on inline image metadata handling (1024-5000000 bytes).",
    ).optional(),
    quality: z.number().int().min(30).max(100).describe(
        "Screenshot quality (30-100); screenshot format only.",
    ).optional(),
    schema: z.record(z.string(), z.unknown()).describe(
        'Field schema for the json format, e.g. {"title": {"type": ' +
            '"string"}}. Extraction is deterministic (no language ' +
            "model) and each field comes with its evidence.",
    ).optional(),
});

export const zClawifiScrapeBody = z.object({
    url: zClawifiTargetUrl,
    formats: z.array(z.union([zScrapeFormatName, zScrapeFormatOption]))
        .describe(
            "Formats to return (vendor default ['markdown']): a format name " +
                'or a typed option object such as {"type": "links", ' +
                '"max_items": 25}. A failed format is reported in ' +
                "`format_results` without removing the others.",
        ).optional(),
    source: z.enum([
        "generic_web",
        "github",
        "pypi",
        "arxiv",
        "pubmed",
        "reddit",
        "google",
        "yandex",
        "ddg",
        "twitter",
        "semantic_scholar",
        "openalex",
        "domain_intel",
        "username_search",
        "email_osint",
    ]).describe(
        "Source connector. Omit to route by the URL's host.",
    ).optional(),
    mode: z.enum(["auto", "http", "browser"]).describe(
        "Access mode (vendor default 'auto'). 'browser' forces a browser " +
            "render, which costs 3 credits instead of 1.",
    ).optional(),
    skip_archive: zClawifiSkipArchive.optional(),
    browser_profile: zClawifiBrowserProfile.optional(),
    wait_until: zClawifiWaitUntil.optional(),
    timeout_seconds: zClawifiTimeoutSeconds.optional(),
    artifact_policy: z.enum(["metadata_only"]).describe(
        "How artifacts are returned; only 'metadata_only' (references, " +
            "never raw bytes).",
    ).optional(),
    wait_for_selector: zClawifiWaitForSelector.optional(),
    target_selector: zClawifiTargetSelector.optional(),
    exclude_tags: zClawifiExcludeTags.optional(),
    query: zClawifiQuery.optional(),
    top_k: zClawifiTopK.optional(),
});
