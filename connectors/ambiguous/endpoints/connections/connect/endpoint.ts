import { z } from "zod";
import { defineEndpoint } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "Connect existing Ambiguous workspace",
        summary:
            "Redeem a one-time setup code from Ambiguous Settings → Connect your AI.",
        description:
            "Connects the identity selected in Ambiguous. A consumed or expired code fails without creating another workspace. The Relay captures the returned key privately. Use the returned credentialRef as monid_connection, then call auth_whoami to confirm the current identity and workspace.",
        annotations: { readOnly: false },
    },
    endpoint: "/connections/connect",
    request: { method: "POST", path: "/api/auth/key-handoff/exchange" },
    auth: {
        resource: null,
        credentials: z.object({}),
        inject: ({ data }) => data.request,
        capture: { fields: { apiKey: "token" } },
    },
    input: {
        sensitive: ["$.body.code"],
        schema: {
            body: z.object({
                code: z.string().regex(/^ahc_[A-Za-z0-9_-]{43}$/),
            }).strict(),
        },
    },
    resources: {
        provisions: [{
            id: "ambiguous/connection",
            seed: ({ data, utils }) => ({
                resource: "ambiguous/connection",
                externalId: utils.json.str(data.output, "$.credentialRef"),
                data: {
                    displayName: typeof utils.json.optionalGet(
                            data.output,
                            "$.display_name",
                        ) === "string"
                        ? utils.json.str(data.output, "$.display_name")
                        : "Ambiguous connection",
                },
            }),
        }],
    },
});
