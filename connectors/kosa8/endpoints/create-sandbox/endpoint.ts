import { z } from "zod";
import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zRegionId, zTemplateKey } from "../../schema/common.ts";

/**
 * /create-sandbox — start a sealed microVM (upstream `POST /v1/sandboxes`,
 * worker `sandboxes.js createSandbox`), the PROVISIONS anchor of
 * `kosa8/sandbox`. A declarative relay: the engine executes the POST, the
 * seed lifts the new sandbox off the 201 `{sandbox, host_ms}` body.
 *
 * The run itself is FREE — the sandbox's running time is the RESOURCE's
 * bill, reconciled from its own counters.
 *
 * MIRROR vs BINDING (D25): the mirror lists the worker's create fields
 * that make sense for a pooled workspace; `ttl_s` is optional upstream
 * but REQUIRED here (max 28 days) so a sandbox can never outlive the
 * resource's first billing period and an abandoned one is always
 * deleted by kosa8 itself. Left out on purpose: `delete_after` (the same
 * knob spelled as a time), and Store references (`creator/name`
 * templates, `accept_price`) — paid Store items are a purchase, not a
 * sandbox.
 */
export const zCreateSandboxBody = z.object({
    template: zTemplateKey.describe(
        'Template key: "base" (Alpine Linux, the default), "python" ' +
            '(Python 3.12 on Alpine) or "node" (Node.js 22 on Alpine). ' +
            "/list-templates shows what is available now.",
    ).optional(),
    region: zRegionId.describe(
        'Region id, e.g. "eu-hel1" (Helsinki, the only region today). ' +
            "Omit for the account default.",
    ).optional(),
    sleep_after_s: z.number().int().min(0).max(604_800).describe(
        "Seconds of idleness before kosa8 puts the sandbox to sleep " +
            "(memory snapshotted to disk, only storage billed; the next " +
            "exec wakes it). 0 = never sleep. Omit for the account default.",
    ).optional(),
    ttl_s: z.number().int().min(60).max(2_419_200).describe(
        "Seconds from now until kosa8 deletes the sandbox, 60 to " +
            "2419200 (28 days). Pick the shortest that fits the task; " +
            "you can still delete it earlier with /delete-sandbox.",
    ).optional(),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Create Sandbox",
        summary:
            "Start a sealed microVM sandbox from a template; billed per second while it runs.",
        description:
            "Create a kosa8 Cloud sandbox: a fresh microVM with its own " +
            "kernel, booted from a template (base, python or node) and " +
            "kept warm upstream, so it is usually ready in about a second. " +
            "Returns the sandbox object — pass its `id` to /exec, " +
            "/get-sandbox, /sleep-sandbox, /wake-sandbox and " +
            "/delete-sandbox. `ttl_s` is required: kosa8 deletes the " +
            "sandbox when it runs out. Nothing in one sandbox is visible " +
            "to another; each starts clean from its template.",
        docsUrl: "https://docs.kosa8.com/guides/cloud.html",
        categories: ["code-execution"],
        notes: [
            "Creating a sandbox STARTS A METER: $0.048 per vCPU-hour plus " +
            "$0.0154 per GiB-hour of RAM while it runs (EU), per second, " +
            "until it sleeps or is deleted. The template sets the size; " +
            "the response reports `cpus` and `mem_mb`.",
            "Delete the sandbox with /delete-sandbox as soon as the work " +
            "is done; `ttl_s` is the backstop, not the plan.",
        ],
    },
    endpoint: "/create-sandbox",
    request: { method: "POST", path: "/v1/sandboxes" },
    input: {
        schema: {
            body: zCreateSandboxBody.required({ ttl_s: true }),
        },
    },
    resources: {
        provisions: [{
            id: "kosa8/sandbox",
            /** PURE, post-success, on the RAW 201 body (before the
             *  presentation strip). No readable id on a 2xx means the
             *  sandbox may exist upstream unowned — THROW (the host's
             *  PROVISION_CONSTRUCT alarm), never "nothing provisioned". */
            seed: ({ data, utils }) => {
                const $ = utils.json;
                const id = $.optionalStr(data.output, "$.sandbox.id");
                if (id === undefined) {
                    throw new Error(
                        "kosa8 returned success but no readable sandbox id",
                    );
                }
                return {
                    resource: "kosa8/sandbox",
                    externalId: id,
                    identifier: id,
                    data: {
                        template:
                            $.optionalStr(data.output, "$.sandbox.template") ??
                                "base",
                        region:
                            $.optionalStr(data.output, "$.sandbox.region") ??
                                null,
                        cpus: $.optionalNum(data.output, "$.sandbox.cpus") ?? 0,
                        memMb: $.optionalNum(data.output, "$.sandbox.mem_mb") ??
                            0,
                    },
                };
            },
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
