import { defineEndpoint } from "@shared/core";
import { z } from "zod";
import {
    finderModel,
    singleFinderEstimate,
    singleFinderEvidence,
} from "../../schema/finder.ts";
import { zEmailFinderQueryParams } from "./schema/inputs.ts";

/** GET /email-finder — a person's professional address from name + company. */
export default defineEndpoint({
    meta: {
        displayName: "Find Person's Email",
        summary:
            "Find a person's professional email address from their name and company.",
        description: "Resolve a person (first and last name, or full name) " +
            "at a company (domain or name) into their professional email " +
            "address. Tomba returns a stored address when it has one; " +
            "otherwise it generates candidates and checks them against the " +
            "company's mail servers. Returns the address with a 0-100 " +
            "score, job title, department, country, LinkedIn, the company's " +
            "email pattern, the verification status, and the public pages " +
            "it was found on; optionally the person's phone numbers with " +
            "enrich_mobile. A miss returns data.email null and costs " +
            "nothing. Suited for contact discovery and completing a known " +
            "person into a reachable address. To list every address at the " +
            "company, use /domain-search.",
        docsUrl: "https://docs.tomba.io/api/finder#email-finder",
        categories: ["people-enrichment"],
        notes: [
            "Charged 1 search credit (6 with phone data) only when an " +
            "address is returned with a verification status other than " +
            "`unknown`.",
            "A webmail or disposable domain such as gmail.com fails with " +
            "400 `unknown_record`.",
        ],
    },
    request: { method: "GET", path: "/email-finder" },
    input: {
        schema: {
            // the vendor's two rules — a company identifier AND a person
            // name — as one union (clay D13)
            queryParams: z.union([
                zEmailFinderQueryParams.required({
                    domain: true,
                    first_name: true,
                    last_name: true,
                }),
                zEmailFinderQueryParams.required({
                    domain: true,
                    full_name: true,
                }),
                zEmailFinderQueryParams.required({
                    company: true,
                    first_name: true,
                    last_name: true,
                }),
                zEmailFinderQueryParams.required({
                    company: true,
                    full_name: true,
                }),
            ]).describe(
                "Identify the company (domain or company) and the person " +
                    "(first_name + last_name, or full_name).",
            ),
        },
    },
    usage: {
        model: finderModel,
        estimate: singleFinderEstimate,
        evidence: singleFinderEvidence,
    },
});
