import { defineEndpoint } from "@shared/core";

export default defineEndpoint({
    meta: {
        displayName: "Hanging Context Latest Stories",
        summary: "The stories from the latest 12-hour edition.",
        description: "The current edition: every story published in the " +
            "last 12 hours, plus those from the last 24 hours, each with " +
            "headline, summary (dek), topic, publication time, source " +
            "count, cited Manifest ids, and links to its JSON and Markdown " +
            "copies. Also lists the topics (newsrooms) and feed URLs. " +
            "Takes no parameters. Use Hanging Context Topic for one " +
            "subject's recent stories, or Hanging Context Ask for a " +
            "specific question.",
        docsUrl: "https://hangingcontext.com/developers/",
    },
    /** PUBLIC identity: a stable name instead of the file path. */
    endpoint: "/latest",
    request: { method: "GET", path: "/editions/latest.json" },
});
