import { defineProvider, type Json, presets } from "@shared/core";

/**
 * The ONE user-facing projection, wired into the success AND the error slot
 * (identical source interns to one fnTable entry): deep-remove the two keys
 * VOYGR's call objects carry that no workspace needs. `customer_id` names
 * the partner account every workspace shares, and `recording_url` is a path
 * this connector has no route for (`has_recording` and `recording_status`
 * still say whether audio exists). `voygr#me` replaces it with an allowlist.
 */
const stripInternalKeys = (
    { data, utils }: {
        data: { output: Json };
        utils: { json: { omit(value: Json, keys: string[]): Json } };
    },
): Json => utils.json.omit(data.output, ["customer_id", "recording_url"]);

/**
 * VOYGR (api.voygr.tech): validate and enrich place data, and place phone
 * calls with PlaceCall. X-API-Key auth on one origin.
 *
 * TENANCY. Monid calls VOYGR with ONE partner key for every user. VOYGR
 * keeps users apart with partner sub-accounts named by the `X-Sub-Account`
 * header: request rates, concurrent calls and calls per day are limited
 * per sub-account, and usage is reported per sub-account. Credits are not
 * per sub-account: they all draw on the one partner balance. Each Monid
 * workspace owns exactly one sub-account (the free `voygr/sub-account`
 * resource, created by the shared `ensure` in schema/sub-account.ts), and
 * EVERY request goes through the relay below.
 *
 * FAIL CLOSED. The relay is the provider-level `lifecycle.start`, so it
 * falls through to every endpoint. It reads the workspace's sub-account
 * itself and, when there is none, answers 503 without touching VOYGR: a
 * request without `X-Sub-Account` would run as the partner itself,
 * outside any workspace's limits and usage reports. VOYGR's own answers,
 * refusals included, relay unchanged; the engine settles non-2xx at zero.
 */
export default defineProvider({
    name: "voygr",
    meta: {
        displayName: "VOYGR",
        summary:
            "Validate and enrich places, and place AI phone calls to businesses.",
        description:
            "VOYGR checks whether a place exists and whether it is open, " +
            "from evidence about it. It enriches places with attributes " +
            "such as opening hours, phone, website and social profiles, " +
            "plus custom research fields. PlaceCall makes real outbound " +
            "phone calls with an AI voice agent: you send a task, such as " +
            "asking when a kitchen closes or booking a table, and read " +
            "back the structured outcome and transcript.",
        homepageUrl: "https://voygr.tech",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["maps", "agentic-phone"],
        notes: [
            "Each Monid workspace runs on its own VOYGR sub-account, with " +
            "its own limits on request rate, calls at once and calls per " +
            "day, and its own usage report. Other workspaces cannot see " +
            "its calls, suggestions or jobs.",
            "Phone calls are for transactional tasks a user asked for: no " +
            "telemarketing, solicitation or bulk dialling. Calls go to US " +
            "numbers outside Indiana, Louisiana, Minnesota, Montana and " +
            "Nebraska.",
            "The connector needs a VOYGR API key with sub-accounts " +
            "enabled. With an ordinary key, VOYGR refuses to create the " +
            "workspace's sub-account (403 `MISSING_ENTITLEMENT`), so " +
            "every run fails before it starts.",
        ],
    },
    auth: { inject: presets.auth.header("X-API-Key") },
    request: { baseUrl: "https://api.voygr.tech" },
    output: { fromResponse: stripInternalKeys, fromError: stripInternalKeys },
    usage: {
        credits: {
            default: { label: "VOYGR credits ($0.01 each at list price)" },
        },
    },
    lifecycle: {
        start: async ({ utils }) => {
            const owned = await utils.resources.owned({
                resource: "voygr/sub-account",
            });
            if (owned.length === 0) {
                return {
                    kind: "COMPLETED",
                    httpStatus: 503,
                    output: {
                        code: "SUB_ACCOUNT_UNAVAILABLE",
                        message: "This workspace has no VOYGR sub-account, " +
                            "so the request was not sent. Retry shortly.",
                    } as Json,
                };
            }
            const res = await utils.request({
                headers: { "X-Sub-Account": owned[0].externalId },
            });
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
});
