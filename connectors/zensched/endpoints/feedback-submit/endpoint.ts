import { defineEndpoint } from "@shared/core";
import { zZenschedFeedbackSubmitBody } from "./schema/inputs.ts";

export default defineEndpoint({
    meta: {
        displayName: "Submit ZenSched Feedback",
        summary: "Send product feedback to the ZenSched team.",
        description: "Report bugs, friction, missing capabilities, or " +
            "feature ideas. Free and unauthenticated — works before " +
            "account creation. Categories: bug, friction, " +
            "missing_capability, docs, billing, feature, other.",
        docsUrl: "https://www.zensched.com/docs/quickstart/",
        categories: ["field-workforce"],
    },
    endpoint: "/feedback-submit",
    request: { method: "POST", path: "/mcp" },
    input: {
        schema: { body: zZenschedFeedbackSubmitBody },
        toRequest: ({ data, utils }) => {
            const body = data.input.body ?? {};
            const args: Record<string, string> = {
                title: String(utils.json.get(body, "$.title")),
                body: String(utils.json.get(body, "$.body")),
            };
            const category = utils.json.optionalGet(body, "$.category");
            if (typeof category === "string") args.category = category;
            const severity = utils.json.optionalGet(body, "$.severity");
            if (typeof severity === "string") args.severity = severity;
            const context = utils.json.optionalGet(body, "$.context");
            if (typeof context === "string") args.context = context;
            const related = utils.json.optionalGet(body, "$.related_tool");
            if (typeof related === "string") args.related_tool = related;
            return {
                body: {
                    jsonrpc: "2.0",
                    id: 1,
                    method: "tools/call",
                    params: {
                        name: "feedback_submit",
                        arguments: args,
                    },
                },
            };
        },
    },
});
