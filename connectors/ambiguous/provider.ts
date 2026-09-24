import { defineProvider, presets, UsageModelKind } from "@shared/core";

export default defineProvider({
    name: "ambiguous",
    meta: {
        displayName: "Ambiguous",
        summary: "A collaborative workspace for people and AI agents.",
        description:
            "Search workspace content and create, read, and update documents " +
            "and tasks using your connected Ambiguous identity. Create a new " +
            "workspace or connect an existing one through the host's connection " +
            "setup. Each connection has its own credential and permissions.",
        homepageUrl: "https://ambiguous.ai",
        docsUrl: "https://app.ambiguous.ai/api/openapi.json",
        categories: ["workspace"],
        notes: [
            "Requires a customer-scoped connection. The hosted service must " +
            "bind the credential resolver to its authenticated customer; never " +
            "configure a shared Ambiguous account for all customers.",
            "This connector covers routine workspace operations with no " +
            "vendor cost. Paid AI generation is not exposed.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://app.ambiguous.ai",
        headers: { "API-Version": "1" },
    },
    input: {
        toRequest: ({ data }) => ({
            ...data.input,
            ...(data.input.queryParams
                ? {
                    queryParams: Object.fromEntries(
                        Object.entries(data.input.queryParams).filter((
                            [, value],
                        ) => value !== null),
                    ),
                }
                : {}),
        }),
    },
    usage: { model: { kind: UsageModelKind.FREE } },
});
