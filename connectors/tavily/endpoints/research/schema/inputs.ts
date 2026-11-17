import { z } from "zod";

// Vendor mirror, checked against the published OpenAPI on 2026-10-26.
export const zTavilyResearchBody = z.object({
    input: z.string().min(1).describe("Research question or task."),
    model: z.enum(["mini", "pro", "auto"]).describe(
        "Mini for focused tasks; pro for comprehensive research; auto selects the model.",
    ).optional(),
    stream: z.boolean().describe(
        "Use SSE streaming; Monid binds this to false and polls the JSON job API.",
    ).optional(),
    output_schema: z.object({
        properties: z.record(
            z.string(),
            z.object({
                type: z.enum([
                    "object",
                    "string",
                    "integer",
                    "number",
                    "array",
                ]).describe("Value type for this report property."),
                description: z.string().describe(
                    "What this report property should contain.",
                ),
                properties: z.record(z.string(), z.unknown()).describe(
                    "Nested property schemas; required for object properties.",
                ).optional(),
                items: z.record(z.string(), z.unknown()).describe(
                    "Item schema; required for array properties.",
                ).optional(),
            }),
        ).describe("Named report fields and their schemas."),
        required: z.array(z.string()).describe(
            "Required report fields; if supplied, include at least one name from properties.",
        ).optional(),
    }).nullable().describe("JSON Schema describing the structured report.")
        .optional(),
    citation_format: z.enum(["numbered", "mla", "apa", "chicago"]).describe(
        "Citation style; defaults to numbered.",
    ).optional(),
    include_domains: z.array(z.string()).max(20).describe(
        "Prefer these domains; other sources may still appear.",
    ).optional(),
    exclude_domains: z.array(z.string()).max(20).describe(
        "Exclude these domains and their subdomains.",
    ).optional(),
    output_length: z.enum(["short", "standard", "long"]).describe(
        "Target report length; not a hard cap.",
    ).optional(),
    files: z.array(z.object({
        name: z.string().describe("Filename ending in .txt, .md or .json."),
        data: z.string().describe("Base64-encoded file contents."),
        type: z.literal("base64").describe("File encoding; defaults to base64.")
            .optional(),
    })).max(5).describe("Up to 5 files; 80,000 words per file and combined.")
        .optional(),
});
