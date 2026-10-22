import { defineEndpoint, type Json, Unit, UsageModelKind } from "@shared/core";
import { zCompanyEnrichBody } from "../../schema/company.ts";

/** POST /company/enrich as the `company/enrich/base` product: the tier is a field filter. `toRequest` adds this product's excluded TOP-LEVEL fields to the caller's `exclude_fields` (the vendor applies it after `include_fields`), so excluded contact data never leaves Data Legion; `fromResponse` then drops the excluded fields again, including the NESTED Premium subfields a top-level filter cannot name. */
export default defineEndpoint({
    meta: {
        displayName: "Data Legion Company Base",
        summary: "A company's firmographics: name, domains, industry, size, " +
            "type, founding year.",
        description:
            "Enrich a company with name, headline, description, domains, " +
            "industry, company size, company type, founding year, tickers, " +
            "and social profiles. Excludes Premium workforce metrics and " +
            "trends. Fields vary by matched record.",
        docsUrl:
            "https://www.datalegion.ai/docs/api-reference/company-enrichment",
        categories: ["company-enrichment"],
        notes: [
            "Billed 1 credit per returned record; a lookup with no match " +
            "(HTTP 404) is free.",
        ],
    },
    endpoint: "/company/enrich/base",
    request: { method: "POST", path: "/company/enrich" },
    input: {
        schema: { body: zCompanyEnrichBody },
        toRequest: ({ data }) => {
            const body = data.input.body as Record<string, Json>;
            const tierExcluded = [
                "linkedin_followers",
                "linkedin_employee_count",
                "legion_employee_count",
                "legion_average_tenure",
                "legion_new_hire_count",
                "legion_attrition_count",
                "legion_employee_growth_rate",
                "legion_turnover_rate",
                "legion_seniority_distribution",
                "legion_job_function_distribution",
                "legion_expense_category_distribution",
                "legion_tenure_distribution",
                "legion_education_distribution",
                "legion_seniority_growth_rate",
                "legion_job_function_growth_rate",
                "legion_expense_category_growth_rate",
                "legion_employee_count_by_month",
                "num_sources",
                "last_seen",
            ];
            const callerExcluded = typeof body.exclude_fields === "string"
                ? body.exclude_fields.split(",").map((field) => field.trim())
                    .filter((field) => field.length > 0)
                : [];
            const excluded = callerExcluded.concat(
                tierExcluded.filter((field) => !callerExcluded.includes(field)),
            );
            return {
                ...data.input,
                body: { ...body, exclude_fields: excluded.join(",") },
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            label: "records",
            consumes: { credit: "company", amount: 1 },
        },
    },
    output: {
        /** Paths are relative to one match; `[]` walks an array. */
        fromResponse: ({ data }) => {
            const output = JSON.parse(JSON.stringify(data.output));
            const dropped = [
                "linkedin_followers",
                "linkedin_employee_count",
                "legion_employee_count",
                "legion_average_tenure",
                "legion_new_hire_count",
                "legion_attrition_count",
                "legion_employee_growth_rate",
                "legion_turnover_rate",
                "legion_seniority_distribution",
                "legion_job_function_distribution",
                "legion_expense_category_distribution",
                "legion_tenure_distribution",
                "legion_education_distribution",
                "legion_seniority_growth_rate",
                "legion_job_function_growth_rate",
                "legion_expense_category_growth_rate",
                "legion_employee_count_by_month",
                "num_sources",
                "last_seen",
                "name.display",
                "name.raw",
                "headline.raw",
                "description.raw",
                "locations[].geo",
                "locations[].raw",
                "locations[].num_sources",
                "locations[].last_seen",
            ];
            const matches = Array.isArray(output?.matches)
                ? output.matches
                : [];
            for (const path of dropped) {
                const segments = path.split(".");
                let nodes = matches.filter((match: unknown) =>
                    match !== null && typeof match === "object"
                );
                for (const segment of segments.slice(0, -1)) {
                    const walksArray = segment.endsWith("[]");
                    const name = walksArray ? segment.slice(0, -2) : segment;
                    nodes = nodes.flatMap((node: Record<string, unknown>) => {
                        const child = node[name];
                        if (walksArray) {
                            return Array.isArray(child)
                                ? child.filter((item) =>
                                    item !== null && typeof item === "object"
                                )
                                : [];
                        }
                        return child !== null && typeof child === "object" &&
                                !Array.isArray(child)
                            ? [child]
                            : [];
                    });
                }
                const last = segments[segments.length - 1];
                const field = last.endsWith("[]") ? last.slice(0, -2) : last;
                for (const node of nodes) delete node[field];
            }
            return output;
        },
    },
});
