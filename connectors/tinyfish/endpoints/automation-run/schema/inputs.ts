import { z } from "zod";
import { zProfileId, zProxyCountry } from "../../../schema/profiles.ts";

/**
 * `/automation/run` body — the hosted catalog's contract (monid-services
 * `endpoints/automation-run.ts`), which flattens the vendor's
 * `agent_config` and replaces `use_profile`/`profile_id` with an owned
 * `profileId`. The start fn maps it onto `POST /v1/automation/run-async`.
 *
 * NOT exposed (account-level shared state on the one vendor account):
 * `use_vault`, `credential_item_ids`, `set_as_default`, `webhook_url`,
 * `capture_config`, `agent_config.mode`. `.strict()` rejects them before
 * any upstream call.
 */
export const zAutomationRunBody = z.object({
    // The Agent API rejects a bare domain with INVALID_INPUT (verified live
    // 2026-09-23 in monid-services) — require the scheme up front.
    url: z.url({ protocol: /^https?$/ }).describe(
        "Target website URL to automate — an absolute URL including the " +
            "scheme (a bare domain like 'example.com' is rejected). " +
            "Example: https://scrapeme.live/shop.",
    ),
    goal: z.string().min(1).describe(
        "Natural-language description of what to accomplish on the " +
            "website. Be specific about the data to extract or the actions " +
            "to take. Example: 'Extract every product name and price on " +
            "page 1, return JSON'.",
    ),
    max_steps: z.number().int().min(1).max(500).optional().describe(
        "Step limit — the primary cost control: the run is billed per AI " +
            "step, so capping steps bounds cost (the agent may take about " +
            "one final wrap-up step past the cap). The run stops at the cap " +
            "and returns partial results. Default 150.",
    ),
    max_duration_seconds: z.number().int().min(5).max(1800).optional()
        .describe(
            "Soft wall-clock budget in seconds — the agent honours it " +
                "voluntarily and returns partial results when it runs out " +
                "(elapsed time can overshoot about 2x). Use max_steps to " +
                "bound cost. Example: 300.",
        ),
    profileId: zProfileId.optional().describe(
        "Attach a browser profile YOU OWN (saved login state — create one " +
            "via /browser-profiles/provision, log in via " +
            "/browser-profiles/setup-session, save it, then pass its id " +
            "here). The run starts with the saved cookies and storage.",
    ),
    browser_profile: z.enum(["lite", "stealth"]).optional().describe(
        "Browser build: 'lite' (standard, fast — default) or 'stealth' " +
            "(anti-detection — for sites showing CAPTCHAs or 'Access " +
            "Denied').",
    ),
    proxy_config: z.object({
        enabled: z.boolean().describe("Enable a proxy for this run."),
        country_code: zProxyCountry.optional().describe(
            "Proxy country. Example: US.",
        ),
    }).strict().optional().describe(
        "Route the browser through a proxy — pair with browser_profile " +
            "'stealth' for protected sites.",
    ),
    output_schema: z.record(z.string(), z.unknown()).optional().describe(
        "Optional JSON-schema subset for the result shape (type, " +
            "properties, required). Adherence is best-effort — always " +
            "validate the returned result.",
    ),
}).strict();
