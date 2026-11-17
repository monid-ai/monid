import { z } from "zod";
import { defineEndpoint, type Json, UsageModelKind } from "@shared/core";

export const zCreateProfileBody = z.object({
    name: z.string().min(1).max(100).describe(
        "A name for the profile, usually the brand or person whose " +
            "accounts it will hold (e.g. 'Acme Corp').",
    ),
    timezone: z.string().optional().describe(
        "IANA timezone scheduled posts on this profile use when they name " +
            "none (e.g. 'Europe/Madrid'). Defaults to UTC.",
    ),
}).strict();

export default defineEndpoint({
    meta: {
        displayName: "Create Profile",
        summary:
            "Create a profile to connect social accounts into; free, and the first step before publishing.",
        description:
            "Create a Zernio profile owned by your workspace. A profile " +
            "holds the social accounts of one brand or person: next, call " +
            "/connect-account with its profileId to get a link the " +
            "account owner opens to connect X, Instagram, TikTok, " +
            "LinkedIn and the rest. Create one profile per brand; reuse " +
            "it for every post (find existing ones with /list-profiles).",
        docsUrl: "https://docs.zernio.com",
        categories: ["social-publishing"],
    },
    endpoint: "/create-profile",
    request: { method: "POST", path: "/api/v1/profiles" },
    input: { schema: { body: zCreateProfileBody } },
    resources: {
        provisions: [{
            id: "zernio/profile",
            seed: ({ data, utils }) => {
                const $ = utils.json;
                const id = $.optionalStr(data.output, "$.profileId");
                if (id === undefined) {
                    throw new Error(
                        "zernio returned success but no readable profile id",
                    );
                }
                const name = $.optionalStr(data.output, "$.name") ?? id;
                const timezone = $.optionalStr(data.output, "$.timezone");
                return {
                    resource: "zernio/profile",
                    externalId: id,
                    identifier: name,
                    data: {
                        name,
                        ...(timezone !== undefined ? { timezone } : {}),
                    },
                };
            },
        }],
    },
    usage: { model: { kind: UsageModelKind.FREE } },
    lifecycle: {
        /**
         * Profile names are unique across the whole pooled account, so two
         * workspaces both asking for "Acme" would 409 each other: the
         * upstream name carries the run id, and the caller's name is what
         * the output and the stored resource show.
         */
        start: async ({ data, utils }) => {
            const $ = utils.json;
            const body = data.input.body!;
            const res = await utils.http({
                method: "POST",
                path: "/api/v1/profiles",
                headers: { "Idempotency-Key": data.run.runId + ":profile" },
                body: {
                    name: body.name + " [" + data.run.runId + "]",
                    externalId: data.run.runId,
                    ...(body.timezone !== undefined
                        ? { timezone: body.timezone }
                        : {}),
                },
            });
            if (res.status < 200 || res.status >= 300) {
                return {
                    kind: "COMPLETED",
                    httpStatus: res.status,
                    output: res.body,
                };
            }
            const profileId = $.optionalStr(res.body, "$.profile._id");
            const timezone = $.optionalStr(res.body, "$.profile.timezone") ??
                body.timezone;
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: {
                    ...(profileId !== undefined ? { profileId } : {}),
                    name: body.name,
                    ...(timezone !== undefined ? { timezone } : {}),
                    next: "Call /connect-account with this profileId to " +
                        "connect a social account.",
                } as Json,
            };
        },
    },
});
