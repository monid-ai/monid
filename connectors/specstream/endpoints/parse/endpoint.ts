import { defineEndpoint } from "@shared/core";
import { zParseBody } from "./schema/inputs.ts";

/** POST /v1/parse: read a request in plain words into an editable reading. */
export default defineEndpoint({
    meta: {
        displayName: "SpecStream Read Request",
        summary: "Read a plain-words data request into an editable reading.",
        description:
            "Start here. Send the data you need in plain words and get back " +
            "how SpecStream read it: `read_back` (the reading in everyday " +
            "language, to show your person), `chips` (the parts of the " +
            "reading, each resolved, ambiguous or unsupported), " +
            "`unsupported` clauses, and `ast_hash`, the handle that " +
            "`specstream#v1/capacity/quotes` prices. Show your person " +
            "anything marked ambiguous or unsupported before you price it. " +
            "Free: reading a request never spends and never starts a find. " +
            "Next: `specstream#v1/capacity/quotes`.",
        docsUrl: "https://specstream.ai/docs/api",
        categories: ["web-search"],
        notes: [
            "`status` other than `runnable` (for example `needs_edit` or " +
            "`rejected`) means there is nothing to price yet; rephrase the " +
            "request or resolve the flagged chips.",
        ],
    },
    request: { method: "POST", path: "/v1/parse" },
    input: { schema: { body: zParseBody } },
});
