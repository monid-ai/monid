import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCheckPersonBody } from "./schema/inputs.ts";

/** POST /v2/fetch/persons/check: whether the cached database holds a
 *  person's profile, and how fresh and complete it is, free. A profile it
 *  does not hold is a 200 with `data.exists: false`, not a 404. */
export default defineEndpoint({
    meta: {
        displayName: "Check Person Profile",
        summary: "Check for free whether a person's profile is available, " +
            "and how fresh it is, before paying to fetch it.",
        description: "Check whether Reverse Contact holds a person's " +
            "profile, by LinkedIn profile URL or Reverse Contact id " +
            "(`prs_...`), without returning it. `data.exists` answers; " +
            "when the profile is held, `data.lastUpdate` (ISO 8601) says " +
            "when it was last refreshed, and `experienceCount`, " +
            "`skillCount` and `schoolCount` say how complete it is. Reach " +
            "for it before `reversecontact#v2/fetch/persons`, to skip " +
            "profiles that are missing, stale or too thin. A profile the " +
            "database does not hold answers 200 with `exists: false` and " +
            "`lastUpdate: null`. Free.",
        docsUrl: "https://docs.reversecontact.com/endpoints/check-person",
        categories: ["people-enrichment"],
        notes: [
            "Free, but refused with 402 `NO_CREDITS` while the account " +
            "holds fewer than 2 credits.",
        ],
    },
    request: { method: "POST", path: "/v2/fetch/persons/check" },
    input: { schema: { body: zCheckPersonBody } },
    timeouts: { requestMs: 35_000, runMs: 40_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
