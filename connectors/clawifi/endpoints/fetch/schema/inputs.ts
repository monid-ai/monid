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
 * `POST /fetch` body: Clawifi's `FetchRequest` (`clawifi/core/models.py`;
 * OpenAPI snapshot `openapi-v1.json`, Clawifi 1.7.5). Optionality only
 * (D25); vendor defaults are stated in the describes. Non-strict, like the
 * vendor model.
 *
 * Two vendor fields are deliberately NOT EXPOSED, and `input.toRequest`
 * strips them before send as defense-in-depth (the exa `stream` posture):
 *   - `requires_auth` reads the runtime operator's stored source session;
 *     a hosted account key never uses those, so the call can only fail.
 *   - `proxy_config` routes the fetch through a caller-supplied proxy,
 *     usually with credentials in it; a reseller connector should not carry
 *     third-party proxy credentials.
 */
export const zClawifiFetchBody = z.object({
    url: zClawifiTargetUrl,
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
        "Source connector. Omit to route by the URL's host (GitHub, PyPI, " +
            "arXiv, Reddit, PubMed and a few others have their own " +
            "connector; any other host uses 'generic_web').",
    ).optional(),
    force_browser: z.boolean().describe(
        "Render the page in a browser instead of a plain HTTP fetch " +
            "(vendor default false). A browser fetch costs 3 credits " +
            "instead of 1.",
    ).optional(),
    return_raw_html: z.boolean().describe(
        "Also return the page's raw HTML in `data.raw_html` (vendor " +
            "default false).",
    ).optional(),
    skip_archive: zClawifiSkipArchive.optional(),
    browser_profile: zClawifiBrowserProfile.optional(),
    screenshot: z.boolean().describe(
        "Capture a screenshot. Omitted means automatic: a browser fetch " +
            "captures one, a plain HTTP fetch does not; false disables it. " +
            "The screenshot is returned as an artifact reference, not image " +
            "bytes.",
    ).optional(),
    wait_until: zClawifiWaitUntil.optional(),
    timeout_seconds: zClawifiTimeoutSeconds.optional(),
    max_pages: z.number().int().min(1).max(500).describe(
        "For a PDF: how many pages to read (1-500, vendor default 50).",
    ).optional(),
    wait_for_selector: zClawifiWaitForSelector.optional(),
    target_selector: zClawifiTargetSelector.optional(),
    exclude_tags: zClawifiExcludeTags.optional(),
    query: zClawifiQuery.optional(),
    top_k: zClawifiTopK.optional(),
});
