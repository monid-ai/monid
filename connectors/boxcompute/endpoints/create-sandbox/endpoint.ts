import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zSize } from "../../schema/common.ts";
import { zCreateSandboxBody } from "./schema/inputs.ts";

/**
 * /create-sandbox — create a VM and wait for it to run (upstream:
 * `POST /api/v2/sandboxes`), the PROVISIONS anchor of `boxcompute/vm`.
 *
 * BoxCompute answers 202 `pending` at once and boots the VM in the
 * background, usually in 20–40 s. start creates it in the pooled account's
 * default (oldest) workspace with a run-stable Idempotency-Key, so an
 * activity retry gets the same VM back rather than a second one, then reads
 * it every 5 s for up to 100 s (the phase may sleep 120 s):
 *   - `running`: 201, the VM is ready.
 *   - still `pending`: 202. The VM is created and owned all the same, and
 *     /get-sandbox shows when it runs. Ending the run here instead would
 *     leave a VM nobody owns.
 *   - `expired`: BoxCompute refused it (the account's VM or storage limit).
 *     The dead slot is deleted, best effort, and the run answers 429 with
 *     nothing provisioned.
 */
export default defineEndpoint({
    meta: {
        displayName: "Create VM",
        summary:
            "Create a Linux VM you own and wait for it to run; bills per second while it runs.",
        description:
            "Create a Linux VM (small or large) owned by your workspace, " +
            "with a /workspace disk that survives stops. The call waits " +
            "for the VM to boot and returns its sandboxId, which every " +
            "other BoxCompute endpoint takes. Run commands with " +
            "/run-command, stop it with /stop-sandbox when idle, and " +
            "delete it with /delete-sandbox when done.",
        docsUrl: "https://boxcompute.ai/docs/",
        categories: ["code-execution"],
        notes: [
            "Running this STARTS BILLING: the VM bills per second while it " +
            "runs (Small $0.05/hour, Large $0.15/hour, at least one minute " +
            "per start) until it is stopped or deleted. BoxCompute stops " +
            "it after 30 idle minutes.",
            "Boot usually takes 20-40 s. If the VM is still booting after " +
            "about 100 s the call answers 202 with state 'pending': the VM " +
            "is already yours, so read /get-sandbox until it is 'running'.",
            "429 means BoxCompute refused the VM (its account's VM or " +
            "storage limit); nothing is kept and nothing is billed.",
        ],
    },
    endpoint: "/create-sandbox",
    request: { method: "POST", path: "/api/v2/sandboxes" },
    input: {
        schema: {
            // small and large only: xl and xxl depend on the account's plan
            body: zCreateSandboxBody.extend({
                size: zSize.describe(
                    "small: 0.5 vCPU, 1 GiB RAM, $0.05/hour while running " +
                        "(scripts, data work, small servers). large: 1.5 " +
                        "vCPU, 3 GiB RAM, $0.15/hour (browsers, builds, " +
                        "heavier apps).",
                ).default("small"),
            }),
        },
    },
    timeouts: { requestMs: 30_000, runMs: 180_000 },
    resources: {
        provisions: [{
            id: "boxcompute/vm",
            /** PURE, on the RAW success body (201 running or 202 pending).
             *  A 2xx without a readable id THROWS: a VM may exist that
             *  nobody owns, and the host must hear about it. */
            seed: ({ data, utils }) => {
                const $ = utils.json;
                const id = $.optionalStr(data.output, "$.sandbox.id");
                if (id === undefined) {
                    throw new Error(
                        "boxcompute returned success but no readable VM id",
                    );
                }
                const size = $.optionalStr(data.output, "$.sandbox.size");
                const name = $.optionalStr(data.output, "$.sandbox.name");
                const blockNetwork = $.optionalGet(
                    data.output,
                    "$.sandbox.blockNetwork",
                );
                return {
                    resource: "boxcompute/vm",
                    externalId: id,
                    identifier: name ?? id,
                    data: {
                        size: size === "large" ? "large" : "small",
                        ...(name !== undefined ? { name } : {}),
                        ...(typeof blockNetwork === "boolean"
                            ? { blockNetwork }
                            : {}),
                    },
                };
            },
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ data, utils }) => {
            const $ = utils.json;
            const body = data.input.body!;
            const listed = await utils.http({
                method: "GET",
                path: "/api/v2/workspaces",
            });
            if (listed.status < 200 || listed.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: listed.status,
                    output: listed.body,
                };
            }
            const rows = $.optionalGet(listed.body, "$.workspaces");
            const workspaces = (Array.isArray(rows) ? rows : [])
                .map((row) => ({
                    id: $.optionalStr(row, "$.id"),
                    createdAt: $.optionalNum(row, "$.createdAt") ?? 0,
                }))
                .filter((row) => row.id !== undefined)
                .sort((a, b) => a.createdAt - b.createdAt);
            if (workspaces.length === 0) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    output: {
                        code: "NO_WORKSPACE",
                        error: "The BoxCompute account has no workspace " +
                            "to create the VM in",
                    },
                };
            }
            const created = await utils.http({
                method: "POST",
                path: "/api/v2/sandboxes",
                headers: { "Idempotency-Key": data.run.runId + ":create" },
                body: {
                    workspaceId: workspaces[0].id!,
                    vmSandbox: true,
                    size: body.size,
                    ...(body.name !== undefined ? { name: body.name } : {}),
                    ...(body.blockNetwork !== undefined
                        ? { blockNetwork: body.blockNetwork }
                        : {}),
                    metadata: { "monid/run": data.run.runId },
                },
            });
            if (created.status < 200 || created.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: created.status,
                    output: created.body,
                };
            }
            const id = $.optionalStr(created.body, "$.sandbox.id");
            if (id === undefined) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 502,
                    providerHttpStatus: created.status,
                    output: {
                        code: "MALFORMED_SANDBOX",
                        error: "BoxCompute returned success but no " +
                            "readable VM id",
                    },
                };
            }
            let latest: Json = created.body;
            let state = $.optionalStr(latest, "$.sandbox.state");
            for (
                let waited = 0;
                state === "pending" && waited < 100_000;
                waited += 5_000
            ) {
                await utils.sleep(5_000);
                const read = await utils.http({
                    method: "GET",
                    path: "/api/v2/sandboxes/" + id,
                });
                if (read.status >= 200 && read.status < 300) {
                    latest = read.body;
                    state = $.optionalStr(latest, "$.sandbox.state");
                }
            }
            if (state === "expired") {
                try {
                    await utils.http({
                        method: "DELETE",
                        path: "/api/v2/sandboxes/" + id,
                    });
                } catch {
                    // best effort: an expired VM never runs or bills
                }
                return {
                    kind: "COMPLETED",
                    httpStatus: 429,
                    output: {
                        code: "SANDBOX_REFUSED",
                        error: "BoxCompute refused the VM: its account's " +
                            "VM or storage limit is reached. Nothing was " +
                            "kept or billed.",
                    },
                };
            }
            return {
                kind: "COMPLETED",
                httpStatus: state === "running" ? 201 : 202,
                output: latest,
            };
        },
    },
});
