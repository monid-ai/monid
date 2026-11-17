import { defineEndpoint } from "@shared/core";
import { finderModel } from "../../schema/finder.ts";
import { zLinkedinQueryParams } from "./schema/inputs.ts";

/** GET /linkedin — the professional address behind a LinkedIn profile. */
export default defineEndpoint({
    meta: {
        displayName: "Find Email from LinkedIn",
        summary:
            "Find the professional email address of the person behind a LinkedIn profile URL.",
        description: "Resolve a LinkedIn profile URL into the person's " +
            "professional email address, with name, company and domain, " +
            "job title, department, country, a 0-100 score, the " +
            "verification status, and the public pages it was found on. " +
            "Tomba returns a stored address when it has one; otherwise it " +
            "may read the profile and search live. full=true returns every " +
            "stored address (up to two) as an array; enrich_mobile adds " +
            "phone numbers. A miss returns data.email null, free. Suited " +
            "for turning a LinkedIn prospect list into reachable contacts.",
        docsUrl: "https://docs.tomba.io/api/finder#linkedin-finder",
        categories: ["people-enrichment", "linkedin"],
        notes: [
            "Charged 1 search credit (6 with phone data) when an address " +
            "is returned; with full=true, 1 per returned address.",
            "With full=true and no stored address, the response is a " +
            "single object, as without full.",
        ],
    },
    request: { method: "GET", path: "/linkedin" },
    input: {
        schema: {
            queryParams: zLinkedinQueryParams.required({ url: true }),
        },
    },
    usage: {
        model: finderModel,
        /** full=true: up to two stored addresses, no phone data. */
        estimate: ({ data }) => {
            const q = data.input.queryParams;
            return {
                counts: q.full === true ? { lookup: 2, phones: 0 } : {
                    lookup: 1,
                    phones: q.enrich_mobile === true ? 1 : 0,
                },
            };
        },
        /** `data` is an object (one address) or, with full=true, an array;
         *  an address counts when its `email` is a non-empty string. */
        evidence: ({ data, utils }) => {
            const body = utils.json.optionalGet(data.output, "$.data");
            const entries = Array.isArray(body) ? body : [body];
            let found = 0;
            let phones = 0;
            for (const entry of entries) {
                if (
                    entry === null || typeof entry !== "object" ||
                    Array.isArray(entry)
                ) continue;
                if (typeof entry.email !== "string" || entry.email === "") {
                    continue;
                }
                found++;
                if (
                    Array.isArray(entry.phone_data) &&
                    entry.phone_data.length > 0
                ) {
                    phones++;
                }
            }
            return { counts: { lookup: found, phones } };
        },
    },
});
