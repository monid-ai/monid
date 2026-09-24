import { z } from "zod";
import { defineEndpoint } from "@shared/core";
import { signupInput } from "../../../schema/signup.ts";

export default defineEndpoint({
    meta: {
        displayName: "Create Ambiguous workspace",
        summary:
            "Create a workspace and agent, and email the accountable human a claim link.",
        description:
            "Creates a new provisional workspace. Use connections/connect for an existing workspace. The credential is captured privately by the Relay; the returned credentialRef is your owned connection ID. Check human.claim_token_sent for email delivery. Creation is not automatically retried.",
        annotations: { readOnly: false, openWorld: true },
    },
    endpoint: "/connections/create",
    request: { method: "POST", path: "/api/auth/signup-agent" },
    auth: {
        resource: null,
        credentials: z.object({}),
        inject: ({ data }) => data.request,
        capture: { fields: { apiKey: "api_key" } },
    },
    input: { schema: { body: signupInput } },
    resources: {
        provisions: [{
            id: "ambiguous/connection",
            seed: ({ data, utils }) => ({
                resource: "ambiguous/connection",
                externalId: utils.json.str(data.output, "$.credentialRef"),
                data: {
                    workspaceId: utils.json.str(data.output, "$.workspace.id"),
                    workspaceName: utils.json.str(
                        data.output,
                        "$.workspace.name",
                    ),
                    displayName: utils.json.str(
                        data.output,
                        "$.agent.display_name",
                    ),
                    principalId: utils.json.str(data.output, "$.agent.id"),
                },
            }),
        }],
    },
});
