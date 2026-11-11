import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";

/** Served from the ownership window: Zernio's `GET /profiles` would list
 *  every tenant of the pooled account. */
export default defineEndpoint({
    meta: {
        displayName: "List Your Profiles",
        summary: "List the Zernio profiles your workspace created.",
        description:
            "List YOUR profiles (id, name, timezone). Use a profileId with " +
            "/connect-account, /list-accounts and /create-post. Create one " +
            "with /create-profile if the list is empty.",
        docsUrl: "https://docs.zernio.com",
        categories: ["social-publishing"],
    },
    endpoint: "/list-profiles",
    request: { method: "GET", path: "/api/v1/profiles" },
    resources: { reads: [{ id: "zernio/profile" }] },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        start: async ({ utils }) => {
            const $ = utils.json;
            const rows = await utils.resources.owned({
                resource: "zernio/profile",
            });
            const items = rows.map((row) => ({
                profileId: row.externalId,
                name: $.optionalStr(row.data, "$.name") ?? row.externalId,
                ...($.optionalStr(row.data, "$.timezone") !== undefined
                    ? { timezone: $.get(row.data, "$.timezone") }
                    : {}),
            }));
            return {
                kind: "COMPLETED",
                httpStatus: 200,
                output: items as Json,
            };
        },
    },
});
