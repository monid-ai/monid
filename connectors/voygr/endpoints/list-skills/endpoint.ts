import { defineEndpoint, UsageModelKind } from "@shared/core";
import { SUB_ACCOUNT_BINDING } from "../../schema/sub-account.ts";

/**
 * /list-skills: `GET /skills`, the runnable PlaceCall skills with their
 * manifest and run URLs. Free. The provider relay adds `X-Sub-Account`.
 */
export default defineEndpoint({
    meta: {
        displayName: "List Skills",
        summary: "List the PlaceCall skills you can run.",
        description:
            "List every skill a structured phone call can run, with its " +
            "id, title and a description of what it is for and what it is " +
            "not for. voygr#skill-manifest reads one skill's slots.",
        docsUrl: "https://api.voygr.tech/docs",
        categories: ["agentic-phone"],
        notes: [
            "Listing skills is free.",
            "`manifest_url` and `run_url` are VOYGR paths. This connector " +
            "reads a manifest with voygr#skill-manifest and places calls " +
            "with voygr#place-call.",
        ],
    },
    endpoint: "/list-skills",
    request: { method: "GET", path: "/skills" },
    resources: { uses: [SUB_ACCOUNT_BINDING] },
    usage: { model: { kind: UsageModelKind.FREE } },
});
