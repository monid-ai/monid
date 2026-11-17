import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zSlackAppsBody } from "./schema/inputs.ts";

/**
 * Mindcase `slack/apps`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "Slack Apps",
        summary: "Apps from the Slack Marketplace with name, description, " +
            "developer, categories and pricing. Filter by category.",
        description:
            "Apps from the Slack Marketplace with name, description, " +
            "developer, categories and pricing. Filter by category. " +
            "Returns one row per app with appId, name, description, " +
            "developer, headquarters, categories, pricing, appUrl, " +
            "installUrl, developerWebsite, supportUrl, supportEmail, " +
            "privacyPolicyUrl, supportedLanguages, logoUrl, videoUrl, " +
            "slackApproved, builtBySlack, aiApp, agentApp, orgReady, " +
            "slashCommands, globalShortcuts, messageShortcuts. $0.014 per " +
            "app; empty runs cost nothing.",
        docsUrl: "https://docs.mindcase.co/apis/slack/apps",
        categories: ["app-stores"],
        notes: [
            "`maxResults` must be at least 1 here; the raw API reads 0 or " +
            "blank as unlimited, which cannot be priced up front.",
        ],
    },
    endpoint: "/slack/apps",
    request: { method: "POST", path: "/v1/data/slack/apps/run" },
    input: {
        schema: {
            body: zSlackAppsBody.extend({
                maxResults: zSlackAppsBody.shape.maxResults.unwrap().min(1)
                    .default(100).describe("How many apps to return in total."),
            }),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.014 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const rows = body.maxResults;
            return { counts: { RESULT: rows } };
        },
    },
});
