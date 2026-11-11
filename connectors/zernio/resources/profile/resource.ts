import { z } from "zod";
import { defineResource, resourceUsage } from "@shared/core";
import { zProfileId } from "../../schema/common.ts";

/**
 * zernio/profile — the container a workspace's social accounts connect
 * into. Free to hold (Zernio meters publishing, not profiles), so the rate
 * card is the $0 monthly clock.
 *
 * RELEASE disconnects the profile's accounts before deleting it: Zernio
 * refuses to delete a profile with active accounts (400), and a released
 * profile must not keep posting rights to someone's social accounts.
 */
export default defineResource({
    slug: "profile",
    meta: {
        displayName: "Profile",
        summary: "A Zernio profile holding the social accounts you connect.",
        description:
            "A profile owned by this workspace. Social accounts connected " +
            "through /connect-account land in it, and posts publish " +
            "through them. Free to hold; releasing it disconnects its " +
            "accounts and deletes it.",
        docsUrl: "https://docs.zernio.com",
    },
    data: z.strictObject({
        name: z.string(),
        timezone: z.string().optional(),
    }),
    inputs: {
        create: z.object({
            name: z.string().min(1).max(100),
            timezone: z.string().optional(),
        }),
        release: z.object({ profileId: zProfileId }),
    },
    usage: resourceUsage.free(),
    lifecycle: {
        verify: async ({ data, utils }) => {
            const res = await utils.http({
                method: "GET",
                path: "/api/v1/profiles/" + data.resource.externalId,
            });
            if (res.status === 404) {
                return { active: false, inactiveReason: "http_404" };
            }
            if (res.status < 200 || res.status >= 300) {
                throw new Error(
                    "zernio profile verify failed with HTTP " + res.status,
                );
            }
            return { active: true };
        },
        release: async ({ data, utils }) => {
            const $ = utils.json;
            const profileId = data.resource.externalId;
            const listed = await utils.http({
                method: "GET",
                path: "/api/v1/accounts",
                queryParams: { profileId },
            });
            if (listed.status === 404) return { released: true };
            if (listed.status < 200 || listed.status >= 300) {
                throw new Error(
                    "zernio account list failed with HTTP " + listed.status +
                        " on profile release",
                );
            }
            const accounts = $.optionalGet(listed.body, "$.accounts");
            const ids = (Array.isArray(accounts) ? accounts : [])
                .map((account) => $.optionalStr(account, "$._id"))
                .filter((id) => id !== undefined);
            for (const id of ids) {
                const disconnected = await utils.http({
                    method: "DELETE",
                    path: "/api/v1/accounts/" + id,
                });
                if (
                    !(disconnected.status >= 200 &&
                        disconnected.status < 300) &&
                    disconnected.status !== 404
                ) {
                    throw new Error(
                        "zernio account disconnect failed with HTTP " +
                            disconnected.status + " on profile release",
                    );
                }
            }
            const deleted = await utils.http({
                method: "DELETE",
                path: "/api/v1/profiles/" + profileId,
            });
            if (
                !(deleted.status >= 200 && deleted.status < 300) &&
                deleted.status !== 404
            ) {
                throw new Error(
                    "zernio profile delete failed with HTTP " +
                        deleted.status,
                );
            }
            return { released: true };
        },
    },
});
