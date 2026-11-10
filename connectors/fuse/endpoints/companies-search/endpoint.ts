import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zSearchCompaniesBody } from "./schema/inputs.ts";

const [zFiltersArm, zQueryArm] = zSearchCompaniesBody.options;

/** Fuse's documented page size, stated at the binding so the compiled doc
 *  shows it. A default inside a union arm is shown and never filled, so the
 *  estimate reads the same number as its fallback, and Fuse applies it on
 *  the wire. */
const fuseDefaults = { size: zFiltersArm.shape.size.unwrap().default(25) };

/**
 * `POST /companies/search` — find companies by a sentence or by filters.
 *
 * SYNC and paged: `nextCursor` passes through untouched, and the caller
 * sends it back as `cursor` with the returned `filters` to this same
 * endpoint.
 *
 * BILLED PER ROW RETURNED. Fuse debits 1 credit per company returned and
 * the answer carries no receipt, so the evidence counts `companies`; the
 * estimate is the page size.
 *
 * Every row carries `isSaved`, which says whether the company sits in one
 * of the Fuse workspace's own lists. It never describes the caller, so
 * `fromResponse` drops it.
 */
export default defineEndpoint({
    meta: {
        displayName: "Search Companies",
        summary:
            "Find companies by a plain-English description or by industry, location, headcount, funding and technology filters.",
        description: "Find companies by a plain-English sentence or by " +
            "filters (industry, headquarters location, headcount, revenue, " +
            "funding stage, technologies): name, domains, LinkedIn page, " +
            "firmographics and logo for each match. Send exactly one of " +
            '`query`, e.g. "Series B fintech companies in New York with 50 ' +
            'to 200 employees", or `filters` in the vocabulary ' +
            "`fuse#companies/filter-options` lists. The answer echoes the " +
            "resolved `filters`, `total` (the true match count, on the first " +
            "page only) and `nextCursor`: send it back as `cursor` with the " +
            "returned `filters` for the next page; it is null on the last " +
            "page. Rows are the company record in snake_case, about 80 " +
            "fields that vary by company: names, domains, LinkedIn metadata, " +
            "industries, NAICS codes, headcount and revenue estimates, " +
            "funding, technologies and headquarters location. Count for free " +
            "first with `fuse#data/companies/count`; find the people who " +
            "work there with `fuse#prospects/search`. Charged per company " +
            "returned.",
        categories: ["company-enrichment"],
        notes: [
            "Page with the returned `filters`, not the `query`: resending a " +
            "`query` converts it again, which is slower and can build a " +
            "different search.",
            "`filters.headquartersCity` names are geocoded one by one and " +
            "OR-ed together; a name that geocodes to nothing is dropped, and " +
            "only when none resolves is the search refused (422 " +
            "CITY_FILTER_UNRESOLVED).",
        ],
    },
    request: { method: "POST", path: "/companies/search" },
    input: {
        schema: {
            body: z.union([
                zFiltersArm.extend(fuseDefaults),
                zQueryArm.extend(fuseDefaults),
            ]),
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 1 },
            label: "company",
            description: "a company returned on the page",
        },
        estimate: ({ data }) => ({
            counts: { RESULT: data.input.body.size ?? 25 },
        }),
        evidence: ({ data, utils }) => ({
            counts: { RESULT: utils.json.len(data.output, "$.companies") },
        }),
    },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["isSaved"]),
    },
});
