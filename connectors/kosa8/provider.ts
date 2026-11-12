import { defineProvider, presets } from "@shared/core";

/**
 * kosa8 Cloud — sealed microVM sandboxes for AI agents
 * (https://api.kosa8.com, the Cloudflare Worker behind
 * https://docs.kosa8.com/guides/cloud.html).
 *
 * Bearer-key REST: `Authorization: Bearer k8c_live_…`. The organization is
 * resolved from the key. Monid holds ONE pooled kosa8 organization, which
 * is why every sandbox is an OWNED RESOURCE (`kosa8/sandbox`): sandbox-
 * scoped endpoints pre-gate ownership, and the org-wide list
 * (`GET /v1/sandboxes`) is never relayed.
 *
 * RATE CARD (worker `billing.js` RATES, served at `GET /v1/pricing`):
 * billed per second while a sandbox runs, $0.048 per vCPU-hour plus
 * $0.0154 per GiB-hour of RAM; a sleeping sandbox pays only for its
 * snapshot, $0.08 per GiB-month. EU (eu-hel1) is multiplier 1.0, the only
 * live region; `us-*` / `ap-*` are 1.2 when they open. The money lives on
 * the RESOURCE (`resources/sandbox`), never on the endpoint runs: create,
 * exec, sleep, wake and delete are free calls on a billed sandbox.
 */
export default defineProvider({
    name: "kosa8",
    meta: {
        displayName: "kosa8 Cloud",
        summary:
            "Sealed microVM sandboxes for AI agents — create one, run commands in it, delete it.",
        description:
            "kosa8 Cloud runs each sandbox as its own microVM with its own " +
            "kernel, so the isolation boundary between your agent's code " +
            "and everything else is hardware virtualization, not a shared " +
            "container kernel. Create a sandbox from a template (base: " +
            "Alpine Linux; python: Python 3.12; node: Node.js 22), run " +
            "commands in it and read their exit code, stdout and stderr, " +
            "put it to sleep when idle (memory snapshotted to disk, the " +
            "next command wakes it with its files intact), and delete it " +
            "when done. Sandboxes are kept warm, so a create typically " +
            "takes about a second. Billed per second of running time by " +
            "vCPU and RAM; asleep, only the snapshot's storage is billed. " +
            "Use it to execute untrusted or model-written code, install " +
            "packages, or run a build or test suite away from the host " +
            "that called it.",
        homepageUrl: "https://kosa8.com",
        docsUrl: "https://docs.kosa8.com/guides/cloud.html",
        categories: ["code-execution"],
        notes: [
            "Sandboxes are OWNED RESOURCES: every sandbox-scoped endpoint " +
            "only operates on sandboxes this workspace created through " +
            "/create-sandbox — a foreign or unknown sandbox id is a " +
            "uniform 404.",
            "Sandboxes run in the EU (eu-hel1, Helsinki) today; other " +
            "region ids are refused until a host there is live.",
            "This connector does not expose file transfer, streamed " +
            "output, checkpoints, rewind, fork, network policy, ports or " +
            "the kosa8 Store; use exec (e.g. `cat`, `tee`, heredocs) to " +
            "move small files in and out.",
            "Errors are JSON `{error, message}` with a stable code: 402 " +
            "payment_required / spending_cap_reached (the account cannot " +
            "start more work), 429 quota_exceeded (too many sandboxes " +
            "running), 503 no_capacity (retry shortly), 409 not_running.",
        ],
    },
    auth: {
        inject: presets.auth.bearer(),
        // credentials omitted → default { apiKey } ⇒ KOSA8_API_KEY,
        // the same variable the kosa8 SDKs and CLI read.
    },
    request: { baseUrl: "https://api.kosa8.com" },
    // The worker gives a host 30 s to answer a proxied call (hosts.js
    // HOST_FETCH_TIMEOUT_MS); the margin covers the worker's own hop.
    timeouts: { requestMs: 45_000, runMs: 60_000 },
    // No `usage.credits` pool: every endpoint run is FREE, and the
    // compiler only lets a provider declare a pool an ENDPOINT drains
    // (D6b). The sandbox resource's lines draw `default` in US dollars —
    // the same spelling saperly's resource uses.
    output: {
        /** `cost_usd` on a sandbox object is kosa8's wholesale figure for
         *  the pooled account, not what a Monid workspace pays — the
         *  sandbox's charge is the resource's rate card. Stripped on
         *  every success surface (the saperly cost-side-key posture). */
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["cost_usd"]),
    },
});
