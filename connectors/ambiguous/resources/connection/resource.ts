import { z } from "zod";
import { defineResource, resourceUsage } from "@shared/core";

export default defineResource({
    slug: "connection",
    credential: true,
    meta: {
        displayName: "Ambiguous workspace connection",
        summary: "An owned connection acting as one Ambiguous identity.",
        description:
            "Created by signup or one-time setup-code exchange. The resource stores identity metadata and an opaque credential reference; only the Relay holds the key. Release disconnects Monid without deleting the upstream workspace.",
    },
    data: z.object({
        workspaceId: z.string().optional(),
        workspaceName: z.string().optional(),
        displayName: z.string().nullable().optional(),
        principalId: z.string().optional(),
    }).strict(),
    usage: resourceUsage.free(),
    lifecycle: {
        verify: async ({ utils }) => {
            const response = await utils.http({
                method: "GET",
                path: "/api/users/me",
            });
            if (response.status === 401) {
                return {
                    active: false,
                    inactiveReason: "Credential expired or revoked",
                };
            }
            if (response.status !== 200) {
                throw new Error("Ambiguous identity verification failed");
            }
            return { active: true };
        },
        release: async () => ({ released: true }),
        refresh: async ({ utils }) => {
            const response = await utils.http({
                method: "GET",
                path: "/api/users/me",
            });
            if (response.status === 401) return { active: false };
            if (response.status !== 200) {
                throw new Error("Ambiguous identity refresh failed");
            }
            return {
                active: true,
                patch: {
                    workspaceId: utils.json.str(
                        response.body,
                        "$.workspace_id",
                    ),
                    workspaceName: utils.json.str(
                        response.body,
                        "$.workspace_name",
                    ),
                    displayName: utils.json.str(
                        response.body,
                        "$.display_name",
                    ),
                    principalId: utils.json.str(response.body, "$.id"),
                },
            };
        },
    },
    views: {
        identity: {
            label: "Current identity and workspace",
            read: async ({ utils }) => {
                const response = await utils.http({
                    method: "GET",
                    path: "/api/users/me",
                });
                if (response.status !== 200) {
                    throw new Error("Ambiguous identity read failed");
                }
                return response.body;
            },
        },
    },
});
