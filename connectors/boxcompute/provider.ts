import { defineProvider, type Json, presets } from "@shared/core";

/**
 * BoxCompute — Linux VMs for AI agents (https://boxcompute.ai), on the
 * customer Sandbox API v2 (https://app.boxcompute.ai/api/v2/openapi.json).
 *
 * Bearer API key (`bc_live_…`). Every Monid workspace shares ONE BoxCompute
 * account, which is why VMs are a RESOURCE here (`boxcompute/vm`): each
 * endpoint that names a VM is bound to it, so a workspace reaches only the
 * VMs it created (a foreign id is the uniform 404, upstream untouched), and
 * nothing relays the account's pooled `GET /api/v2/sandboxes`.
 *
 * RATE CARD (https://boxcompute.ai/pricing/, and the `rateMicrosPerMinute`
 * BoxCompute's cost API reports per run, both checked 2026-10-26): a running
 * VM bills per second with at least one minute per start, Small $0.000834 a
 * minute ($0.05/hour) and Large $0.002502 ($0.15/hour). A stopped VM bills
 * nothing. The calls themselves are free, so no endpoint declares a credit
 * pool: a VM's running time is the `compute` line of its resource, drawn in
 * US dollars from `default` (the pool name saperly's resource uses) and
 * reconciled from the cost API.
 *
 * Paths: lifecycle fns resolve `utils.http` paths against the origin, so
 * every path here is the full `/api/v2/...` one and the base URL is the bare
 * origin.
 */

/** The pooled account's internals never reach a user: the workspace every
 *  VM lives in, the `monid/run` tag create-sandbox stamps for support
 *  tracing, and which of the account's API keys made a VM. */
const stripPoolInternals = (
    { data, utils }: {
        data: { output: Json };
        utils: { json: { omit(value: Json, keys: string[]): Json } };
    },
): Json =>
    utils.json.omit(data.output, [
        "workspaceId",
        "metadata",
        "createdByApiKeyId",
    ]);

export default defineProvider({
    name: "boxcompute",
    meta: {
        displayName: "BoxCompute",
        summary:
            "Linux VMs for AI agents: create one, run commands in it, open a preview URL, stop or delete it.",
        description:
            "BoxCompute gives an agent its own Linux VM, with outbound " +
            "internet and a /workspace disk that survives stops. Create a " +
            "VM, run commands and programs in it, list its files, open a " +
            "temporary public URL to a server it runs, stop it to stop " +
            "paying while keeping its files, and delete it. Use it to run " +
            "code, install packages, build and test projects, or keep work " +
            "between tasks. VMs are workspace-OWNED resources, billed per " +
            "second while they run.",
        homepageUrl: "https://boxcompute.ai",
        docsUrl: "https://boxcompute.ai/docs/",
        categories: ["code-execution"],
        notes: [
            "VMs are OWNED RESOURCES: an endpoint that names a sandboxId " +
            "acts only on VMs this workspace created; a foreign or unknown " +
            "id is a uniform 404.",
            "A running VM bills per second, at least one minute per start: " +
            "Small $0.05/hour, Large $0.15/hour. A stopped VM bills nothing " +
            "and keeps /workspace. BoxCompute stops a VM after 30 idle " +
            "minutes.",
            "/run-command and /list-files wake a stopped VM (about 30 s), " +
            "and it bills again from then.",
            "The VMs run in Cyberjaya, Malaysia.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: { baseUrl: "https://app.boxcompute.ai" },
    timeouts: { requestMs: 30_000, runMs: 60_000 },
    output: { fromResponse: stripPoolInternals },
});
