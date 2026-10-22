import { z } from "zod";

/**
 * johnvc/google-local-services-api — dataset ITEM schema, scaffolded from the actor's
 * PUBLISHED storages.dataset.fields on 2026-09-22 via
 * scripts/apify-scaffold.ts. Passthrough DOCUMENTATION (design D29):
 * non-strict, every field optional ("required" stripped) — output
 * validation can never fail a paid run over vendor drift; the drift
 * suite reports field additions/removals informationally.
 */
export const zGoogleLocalServicesApiOutputItem = z.object({
    result_type: z.enum(["local_services_ad", "no_results", "error"])
        .describe(
            "Discriminator for the row kind. Use it to filter the dataset.",
        ).optional(),
    query: z.string().describe(
        "The service query this business was returned for, as you provided it.",
    ).optional(),
    normalizedQuery: z.string().describe(
        "The supported service type your query was mapped to, present only when it differs from the input (e.g. 'plumbers' maps to 'plumber').",
    ).optional(),
    location: z.string().describe(
        "The human-readable location that was searched, when one was provided.",
    ).optional(),
    dataCid: z.string().describe(
        "The decimal Google CID of the searched place. Reuse it as the dataCid input to skip location resolution on future runs.",
    ).optional(),
    businessName: z.string().describe("Name of the Local Services business.")
        .optional(),
    badge: z.string().describe(
        "Google-awarded trust badge when present, e.g. 'GOOGLE GUARANTEED' or 'GOOGLE SCREENED'.",
    ).optional(),
    googleGuaranteed: z.boolean().describe(
        "True when the business carries the Google Guaranteed badge.",
    ).optional(),
    googleScreened: z.boolean().describe(
        "True when the business carries the Google Screened badge (professional services such as lawyers).",
    ).optional(),
    rating: z.number().describe(
        "Average star rating of the business (0 to 5).",
    ).optional(),
    reviews: z.number().int().describe("Total number of reviews.").optional(),
    phone: z.string().describe(
        "Business phone number in international format.",
    ).optional(),
    businessType: z.string().describe(
        "Category of the business, e.g. 'Electrician' or 'Plumber'.",
    ).optional(),
    serviceArea: z.string().describe("Main coverage area of the business.")
        .optional(),
    yearsInBusiness: z.number().int().describe(
        "Number of years the business has been operating, when Google reports it.",
    ).optional(),
    bookingsNearby: z.number().int().describe(
        "Number of recent bookings near the searched location, when Google reports it.",
    ).optional(),
    hours: z.record(z.string(), z.any()).describe(
        "Current open status and the weekly hours table as reported by Google.",
    ).optional(),
    profileLink: z.string().describe(
        "URL of the business profile on Google Local Services.",
    ).optional(),
    thumbnail: z.string().describe("URL of the business thumbnail image.")
        .optional(),
    cid: z.string().describe(
        "Unique ID of the business inside the Local Services listing.",
    ).optional(),
    bid: z.string().describe(
        "Secondary unique ID of the business inside the Local Services listing.",
    ).optional(),
    pid: z.string().describe(
        "Tertiary unique ID of the business inside the Local Services listing.",
    ).optional(),
    summary: z.string().describe(
        "One-line human-readable summary of the business, built for AI agents.",
    ).optional(),
    note: z.string().describe(
        "Extra context on no_results rows, e.g. that Local Services Ads cover US locations only.",
    ).optional(),
    fetched_at: z.string().describe(
        "ISO-8601 timestamp of when this row was fetched.",
    ).optional(),
    error_message: z.string().describe(
        "Human-readable error description on error rows.",
    ).optional(),
    error_type: z.string().describe(
        "Machine-readable error class on error rows, e.g. MissingRequiredParameter or LocationResolutionError.",
    ).optional(),
});
/** Tolerant by construction: an item that drifts off the documented
 *  shape still passes as a plain object — validation can NEVER fail a
 *  paid run; the typed branch is the documentation. */
export const zGoogleLocalServicesApiOutput = z.array(
    zGoogleLocalServicesApiOutputItem.or(z.record(z.string(), z.unknown())),
);
