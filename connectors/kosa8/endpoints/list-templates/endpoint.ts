import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zNoQuery } from "../../schema/common.ts";

/**
 * /list-templates — the templates a sandbox can start from right now
 * (upstream `GET /v1/templates`, worker `sandboxes.js listTemplates`):
 * aggregated over the live hosts, so it reflects capacity, not a static
 * catalog. Free.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Sandbox Templates",
        summary:
            "List the sandbox templates available now, with their size and regions.",
        description:
            "List the templates /create-sandbox accepts right now: each " +
            "with its `key` (base, python, node, …), `cpus`, `mem_mb`, " +
            "`image`, the `regions` that offer it, and `warm` (VMs " +
            "booted and waiting, which is what makes a create take about " +
            "a second). `default_template` is what a create without " +
            "`template` uses. Use the size to work out what a sandbox " +
            "costs per hour before creating it.",
        docsUrl: "https://docs.kosa8.com/guides/cloud/",
        categories: ["code-execution"],
    },
    endpoint: "/list-templates",
    request: { method: "GET", path: "/v1/templates" },
    input: { schema: { queryParams: zNoQuery } },
    usage: { model: { kind: UsageModelKind.FREE } },
});
