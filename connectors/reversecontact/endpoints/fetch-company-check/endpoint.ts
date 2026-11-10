import { defineEndpoint, UsageModelKind } from "@shared/core";
import { zCheckCompanyBody } from "./schema/inputs.ts";

/** POST /v2/fetch/companies/check: whether the cached database holds a
 *  company's profile, and how fresh it is, free. A company it does not
 *  hold is a 200 with `data.exists: false`, not a 404. */
export default defineEndpoint({
    meta: {
        displayName: "Check Company Profile",
        summary: "Check for free whether a company's profile is " +
            "available, and how fresh it is, before paying to fetch it.",
        description: "Check whether Reverse Contact holds a company's " +
            "profile, by LinkedIn company URL or Reverse Contact id " +
            "(`com_...`), without returning it. `data.exists` answers; " +
            "when the company is held, `data.lastUpdate` (ISO 8601) says " +
            "when it was last refreshed and `data.specialityCount` how " +
            "many specialities it lists. Reach for it before " +
            "`reversecontact#v2/fetch/companies`, to skip companies that " +
            "are missing or stale. A company the database does not hold " +
            "answers 200 with `exists: false` and `lastUpdate: null`. Free.",
        docsUrl: "https://docs.reversecontact.com/endpoints/check-company",
        categories: ["company-enrichment"],
        notes: [
            "Free, but refused with 402 `NO_CREDITS` while the account " +
            "holds fewer than 2 credits.",
        ],
    },
    request: { method: "POST", path: "/v2/fetch/companies/check" },
    input: { schema: { body: zCheckCompanyBody } },
    timeouts: { requestMs: 35_000, runMs: 40_000 },
    usage: { model: { kind: UsageModelKind.FREE } },
});
