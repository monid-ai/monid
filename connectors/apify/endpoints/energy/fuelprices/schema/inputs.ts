import { z } from "zod";

/**
 * johnvc/fuelprices — actor input schema, scaffolded from the actor's PUBLISHED
 * input schema (GET /v2/acts/johnvc~fuelprices/builds/default →
 * actorDefinition.input) on 2026-09-22 via scripts/apify-scaffold.ts; curated
 * by hand thereafter (re-run the script to refresh; the drift suite
 * flags divergence — deno task drift). Non-strict by policy: the actor
 * accepts supersets — unknown fields pass through.
 */
export const zFuelpricesBody = z.object({
    search: z.string().describe(
        "ZIP code, city name, or latitude/longitude coordinates (e.g., '11507', 'New York', '36.0816642, -115.0534345'). Coverage is primarily the United States, with some Canadian locations.",
    ),
    fuel: z.number().int().describe(
        "Fuel type to search for. 1=Regular (default), 2=Midgrade, 3=Premium, 4=Diesel, 5=E85, 12=Unleaded88.",
    ).optional(),
    lang: z.enum(["en"]).describe(
        "Language code for the search results. Currently only English is supported.",
    ).optional(),
    maxAge: z.number().int().min(0).describe(
        "Maximum age of gas station data in days. Use 0 for no age restriction (all stations returned regardless of when prices were last reported). Higher values limit results to stations with prices reported within that many days.",
    ).optional(),
    output_file: z.string().describe(
        "Optional: Custom name for the output CSV file. If not provided, a timestamped filename will be automatically generated (e.g., gas_stations_11507_2025-08-19_11-01-12_1.csv).",
    ).optional(),
});
