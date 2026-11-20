import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEmailToPersonBody } from "./schema/inputs.ts";

/** POST /v1/email-to-person/single — reverse email lookup. */
export default defineEndpoint({
    meta: {
        displayName: "Reverse Email Lookup",
        summary: "Find the person and LinkedIn profile behind an email " +
            "address.",
        description: "Given a work or personal email address, find the " +
            "person behind it. Returns { output: { data: [profile] } } — " +
            "LinkedIn URL, name, headline, current company and title, work " +
            "history, education, and location, best match first (usually " +
            "one). Disposable, anonymous-relay, and role-based addresses " +
            "(info@, sales@) come back with an empty `data` and a " +
            "`rejection` reason. If you also know the person's name or " +
            "company, fiber#kitchen-sink/person takes every signal and " +
            "matches better.",
        docsUrl: "https://api.fiber.ai/ai-docs/reverseEmailLookup.md",
        categories: ["people-enrichment"],
        notes: [
            "Charged only when a person is found; a miss or a rejected " +
            "address costs nothing.",
        ],
    },
    request: { method: "POST", path: "/email-to-person/single" },
    input: { schema: { body: zEmailToPersonBody } },
    usage: {
        /** `emailToLinkedinUrl` — 2 credits per hit; the miss operation
         *  (`emailToLinkedinMiss`) defaults to 0 on Fiber's card. One
         *  lookup per request whatever the number of profiles returned,
         *  so the quantity is 0 | 1. */
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "person found",
            consumes: { credit: "default", amount: 2 },
        },
        estimate: () => ({ counts: { "RESULT": 1 } }),
        evidence: ({ data, utils }) => {
            const found =
                utils.json.optionalLen(data.output, "$.output.data") ??
                    0;
            return { counts: { "RESULT": found > 0 ? 1 : 0 } };
        },
    },
});
