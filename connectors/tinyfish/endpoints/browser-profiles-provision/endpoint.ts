import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";
import { zProxyCountry } from "../../schema/profiles.ts";

/**
 * `/browser-profiles/provision` — create a Browser Context Profile
 * (`POST /v1/profiles`) and seed the workspace-owned
 * `tinyfish/browser-profile` resource every later profile operation is
 * gated on. Free. `set_as_default` is NEVER sent: the account default is
 * what a bare `use_profile: true` resolves to — a cross-workspace leak.
 */
export const zProfileProvisionBody = z.object({
    name: z.string().min(1).max(100).describe(
        "Human-facing profile name. Example: 'Salesforce Production'.",
    ),
    proxyCountryCode: zProxyCountry.optional().describe(
        "Pin the profile's runs to a proxy country. Example: US.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Create Browser Profile",
        summary: "Create a browser profile — saved login state the AI " +
            "agent can reuse. Free.",
        description: "Create a browser profile: named, persistent login " +
            "state for /automation/run. Flow: (1) create it here, (2) open " +
            "a setup browser via /browser-profiles/setup-session and log in " +
            "over its cdp_url with Playwright or any CDP client, (3) save " +
            "it via /browser-profiles/setup-save, (4) pass 'profileId' to " +
            "/automation/run — the agent starts with your saved session. " +
            "Free to create and hold. Optionally pin a 'proxyCountryCode'. " +
            "Delete it via /browser-profiles/release.",
        docsUrl: "https://docs.tinyfish.ai/agent-api/browser-context-profiles",
        categories: ["agents"],
    },
    endpoint: "/browser-profiles/provision",
    request: { method: "POST", path: "/v1/profiles" },
    input: {
        schema: { body: zProfileProvisionBody },
        toRequest: ({ data }) => {
            const body = data.input.body as Record<string, Json>;
            return {
                ...data.input,
                body: {
                    name: body.name,
                    ...(body.proxyCountryCode !== undefined
                        ? { proxy_country_code: body.proxyCountryCode }
                        : {}),
                },
            };
        },
    },
    resources: {
        provisions: [{
            id: "tinyfish/browser-profile",
            /** On the RAW settle body. A 2xx with no readable id is never
             *  "nothing provisioned" for a create — THROW
             *  (PROVISION_CONSTRUCT; the host alarms). */
            seed: ({ data, utils }) => {
                const $ = utils.json;
                const id = $.optionalStr(data.output, "$.id");
                if (id === undefined) {
                    throw new Error(
                        "tinyfish returned success but no readable profile id",
                    );
                }
                const requested = data.input.body ?? {};
                const name = $.optionalStr(data.output, "$.name") ??
                    $.optionalStr(requested, "$.name") ?? id;
                const proxy =
                    $.optionalStr(data.output, "$.proxy_country_code") ??
                        $.optionalStr(requested, "$.proxyCountryCode");
                return {
                    resource: "tinyfish/browser-profile",
                    externalId: id,
                    identifier: name,
                    data: {
                        name,
                        ...(proxy !== undefined
                            ? { proxyCountryCode: proxy }
                            : {}),
                    },
                };
            },
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    output: {
        /** Allowlist: the vendor's `fingerprint_seed` (device-identity
         *  material) never leaves. */
        fromResponse: ({ data, utils }) => {
            const $ = utils.json;
            return {
                profileId: $.optionalStr(data.output, "$.id") ?? null,
                name: $.optionalStr(data.output, "$.name") ?? null,
                proxyCountryCode:
                    $.optionalStr(data.output, "$.proxy_country_code") ??
                        null,
                createdAt: $.optionalStr(data.output, "$.created_at") ?? null,
            };
        },
    },
});
