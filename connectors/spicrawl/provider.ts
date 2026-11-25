import { defineProvider, presets } from "@shared/core";

/**
 * Spicrawl — web data for agents. JSON over HTTPS at
 * `https://api.spicrawl.com/v1`, `Authorization: Bearer <key>`.
 *
 * ONE credit pool, `default` ("Spicrawl credits"). Every billable endpoint is
 * a single metered line: `PER_UNIT` on `Unit.CREDIT` at one credit per unit,
 * so the endpoint's estimate states its credit count and the evidence reads
 * the count the vendor reports. Failures and unbilled target statuses cost 0.
 *
 * Prices (https://docs.spicrawl.com/credits, 2026-11-25): scrape 1 credit
 * plain, 3 with `js_render`, 8 full-browser, +5 for a captcha solve; job
 * search flat 2 (https://docs.spicrawl.com/guides/job-search#pricing); brand
 * about 3 (https://docs.spicrawl.com/guides/brand).
 *
 * `usage.consolidate` is the vendor's own meter: `$.credits` (scrape, brand)
 * or `$.credits_used` (jobs/search), both absorbed out of the payload. An
 * absent field leaves the claim empty, so the derived fold stands (never
 * `?? 0`).
 */
export default defineProvider({
    name: "spicrawl",
    meta: {
        displayName: "Spicrawl",
        summary: "Scrape pages as clean markdown, pull brand assets, and " +
            "search a live index of job postings.",
        description: "Spicrawl gives agents three things: clean, LLM-ready " +
            "page content from any URL (with browser rendering, captcha " +
            "solving and bot-challenge escalation when a plain fetch is " +
            "blocked); a brand kit for a site (logos, colors, fonts, images, " +
            "videos, social links and hero copy from one rendered page load); " +
            "and a continuously updated index of open job postings from the " +
            "major applicant-tracking systems and job boards, searchable by " +
            "title, place, seniority, skills and salary.",
        homepageUrl: "https://spicrawl.com",
        docsUrl: "https://docs.spicrawl.com",
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://api.spicrawl.com/v1" },
    /** The fast default: `jobs-search` is an index read. Scrape and brand
     *  render pages and override this with their own budget. */
    timeouts: { requestMs: 30_000, runMs: 30_000 },
    usage: {
        /** THE credit system: one pool. Spicrawl prices in its own credits;
         *  the dollar conversion stays with the broker card. */
        credits: { default: { label: "Spicrawl credits" } },
        /** The vendor's OWN claim: scrape and brand report `credits`, the
         *  jobs index reports `credits_used`. Both are plucked out of the
         *  payload in one motion; the first present one wins. */
        consolidate: ({ data, utils }) => {
            const credits = utils.json.pluck(data.output, "$.credits");
            const used = utils.json.pluck(credits.rest, "$.credits_used");
            const claimed = credits.value ?? used.value;
            return {
                credits: {
                    ...(typeof claimed === "number"
                        ? { default: claimed }
                        : {}),
                },
                output: used.rest,
            };
        },
    },
    output: {
        /** Spicrawl errors are RFC 7807 `application/problem+json`: `code`
         *  (`ERR::FAMILY::NAME`, the stable key), `title` (fixed summary) and
         *  `detail` (this occurrence, for humans). Surface `detail` as the
         *  message, falling back to `title`. Vendor non-2xx is DATA, and the
         *  engine bills it 0. */
        fromError: ({ data, utils }) => {
            const detail = utils.json.optionalGet(data.output, "$.detail");
            const title = utils.json.optionalGet(data.output, "$.title");
            const code = utils.json.optionalGet(data.output, "$.code");
            const message = typeof detail === "string" && detail !== ""
                ? detail
                : typeof title === "string" && title !== ""
                ? title
                : "Spicrawl API error";
            return {
                message,
                ...(typeof code === "string" ? { code } : {}),
                raw: data.output,
            };
        },
    },
});
