import { z } from "zod";

/**
 * Fields `/fetch`, `/scrape` and `/map` share, mirrored from Clawifi's
 * pydantic request models (`clawifi/core/models.py`, the committed OpenAPI
 * snapshot `tests/fixtures/contracts/openapi-v1.json`, Clawifi 1.7.5).
 * Optionality only (D25); single-field bounds are the vendor's own
 * validators.
 */

export const zClawifiTargetUrl = z.url({ protocol: /^https?$/ }).describe(
    "Public http(s) URL. Localhost, private, link-local and cloud " +
        "metadata addresses are refused with 422.",
);

export const zClawifiBrowserProfile = z.enum(["lite", "stealth"]).describe(
    "Browser profile to use when the request needs a browser: 'stealth' " +
        "or 'lite'. Omit to let Clawifi choose.",
);

export const zClawifiWaitUntil = z.enum([
    "commit",
    "domcontentloaded",
    "load",
    "networkidle",
]).describe(
    "Browser navigation event to wait for (vendor default " +
        "'domcontentloaded' plus a settle of up to 1.5 s for the network " +
        "to go quiet).",
);

export const zClawifiTimeoutSeconds = z.number().int().min(1).describe(
    "Per-request timeout in seconds for the target fetch.",
);

export const zClawifiWaitForSelector = z.string().describe(
    "CSS selector to wait for in the browser. When a plain HTTP page does " +
        "not contain it, the fetch moves to the browser (3 credits).",
);

export const zClawifiTargetSelector = z.string().describe(
    "CSS selector: page text comes from the matching elements only. Raw " +
        "HTML, metadata and embedded page data still use the whole page.",
);

export const zClawifiExcludeTags = z.array(z.string()).max(20).describe(
    "Up to 20 CSS selectors removed from the page before extraction.",
);

export const zClawifiQuery = z.string().max(500).describe(
    "A question about the page, up to 500 characters. The returned " +
        "markdown becomes only the passages that answer it, in document " +
        "order, and `query_selection` lists each passage's rank, score, " +
        "start/end character offsets, section heading and PDF page. A " +
        "query that matches nothing returns the page unchanged with " +
        "`matched: false`. Adds no credits.",
);

export const zClawifiTopK = z.number().int().min(1).max(20).describe(
    "How many passages to keep for `query` (1-20, vendor default 5).",
);

export const zClawifiSkipArchive = z.boolean().describe(
    "Do not fall back to the Wayback Machine copy when the live page " +
        "answers 404/410 or refuses the download (vendor default false).",
);
