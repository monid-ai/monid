import { z } from "zod";
import { defineResource } from "@shared/core";
import { zProfileId, zProxyCountry } from "../../schema/profiles.ts";

/**
 * tinyfish/browser-profile — a Browser Context Profile: saved login state
 * (cookies, local and session storage) the AI agent can start from.
 * Ported from monid-services `adaptors/tinyfish/resources/browser-profile.ts`.
 *
 * USAGE: free to hold — one $0 fixed line on a monthly clock (the host
 * lifecycle still needs a settle boundary).
 *
 * TENANCY: this workspace-owned row IS the isolation primitive that makes
 * the account-scoped vendor feature safe to share: every profile operation
 * and the agent run's `profileId` are ownership-gated on it.
 */
export default defineResource({
    slug: "browser-profile",
    meta: {
        displayName: "Browser Profile",
        summary: "Saved browser login state the AI agent can reuse.",
        description: "A saved browser profile (cookies and login state) that " +
            "TinyFish agent runs can start from, so your agent stays signed " +
            "in. Free to hold; delete it any time.",
        docsUrl: "https://docs.tinyfish.ai/agent-api/browser-context-profiles",
    },
    data: z.strictObject({
        name: z.string(),
        proxyCountryCode: z.string().optional(),
    }),
    inputs: {
        create: z.object({
            name: z.string().min(1).max(100),
            proxyCountryCode: zProxyCountry.optional(),
        }),
        release: z.object({ profileId: zProfileId }),
    },
    usage: {
        period: { unit: "MONTH", count: 1, anchor: "CREATION_TIME" },
        lines: { hold: { consumes: { credit: "default", amount: 0 } } },
    },
    lifecycle: {
        /** `GET /v1/profiles/{id}` — 404 ⇒ deleted upstream; any other
         *  non-2xx THROWS (never conclude from a flaky read). */
        verify: async ({ data, utils }) => {
            const res = await utils.http({
                method: "GET",
                path: "/v1/profiles/" + data.resource.externalId,
            });
            if (res.status === 404) {
                return { active: false, inactiveReason: "http_404" };
            }
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "tinyfish profile verify failed with HTTP " + res.status,
                );
            }
            return { active: true };
        },
        /** `DELETE /v1/profiles/{id}` — 2xx/404/410 conclude ("already
         *  gone" succeeds). 409 is the vendor's documented "cleanup needs
         *  a retry", so it THROWS like every other unconfirmed outcome. */
        release: async ({ data, utils }) => {
            const res = await utils.http({
                method: "DELETE",
                path: "/v1/profiles/" + data.resource.externalId,
            });
            if (
                (res.status >= 200 && res.status < 300) ||
                res.status === 404 || res.status === 410
            ) {
                return { released: true };
            }
            throw new Error(
                "tinyfish profile delete failed with HTTP " + res.status,
            );
        },
    },
    views: {
        /** The profile's LIVE saved-state summary (which domains hold
         *  cookies or storage), allowlisted: never the raw vendor id,
         *  `fingerprint_seed`, or any cookie or storage content. */
        domains: {
            label: "Saved Login State",
            read: async ({ data, utils }) => {
                const $ = utils.json;
                const res = await utils.http({
                    method: "GET",
                    path: "/v1/profiles/" + data.resource.externalId,
                });
                if (res.status < 200 || res.status >= 300) {
                    throw new Error(
                        "tinyfish profile read failed with HTTP " + res.status,
                    );
                }
                return $.pick(res.body, [
                    "$.name",
                    "$.proxy_country_code",
                    "$.domains",
                    "$.created_at",
                ]);
            },
        },
    },
});
