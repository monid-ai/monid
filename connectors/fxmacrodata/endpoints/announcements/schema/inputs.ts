import { z } from "zod";
import { zCurrency, zDate, zIndicator } from "../../../schema/common.ts";

export const zAnnouncementsPathParams = z.object({
    currency: zCurrency,
    indicator: zIndicator,
});

/**
 * GET /v1/announcements/{currency}/{indicator} query params (published
 * OpenAPI). The series selectors accept the values listed here; which of
 * them a given series supports is in the response's `supported_options`
 * and in the catalogue entry.
 */
export const zAnnouncementsQueryParams = z.object({
    start_date: zDate.describe(
        "Start date YYYY-MM-DD. Without a key, USD is limited to the last " +
            "90 days and an earlier start is clamped (`freemium_window`).",
    ).optional(),
    end_date: zDate.describe("End date YYYY-MM-DD (default today).")
        .optional(),
    limit: z.number().int().describe(
        "Rows per page, most recent first (default 20, max 100).",
    ).optional(),
    offset: z.number().int().describe(
        "Rows to skip, for offset pagination (default 0).",
    ).optional(),
    page: z.number().int().describe(
        "One-based page number; takes precedence over offset.",
    ).optional(),
    fields: z.enum(["full", "compact"]).describe(
        "`compact` returns date, val, previous_value, " +
            "change_from_previous, announcement_datetime, " +
            "announcement_datetime_local, publication_time_status and a " +
            "revisions_summary per row; `full` (default) every field.",
    ).optional(),
    series_mode: z.enum(["raw", "canonical"]).describe(
        "`raw` (default) is the direct series; `canonical` applies remaps " +
            "that keep a series continuous across methodology changes.",
    ).optional(),
    value_mode: z.enum(["normalized", "source"]).describe(
        "`normalized` (default) or `source`: values as the publisher " +
            "printed them, without derived changes. `source` needs " +
            "series_mode `raw`.",
    ).optional(),
    seasonality: z.enum(["sa", "nsa"]).describe(
        "Seasonally adjusted or not.",
    ).optional(),
    frequency: z.enum(["level", "yoy", "qoq", "mom"]).describe(
        "Change basis of the returned values.",
    ).optional(),
    annualization: z.enum(["not_annualized", "saar"]).describe(
        "Annualization basis.",
    ).optional(),
    period_aggregation: z.enum(["monthly", "quarterly_average"]).describe(
        "Period aggregation.",
    ).optional(),
    revisions: z.enum(["latest", "first", "final", "all"]).describe(
        "Revision view (default `latest`). `first` is the value as first " +
            "released; `all` returns every retained vintage.",
    ).optional(),
    basis: z.enum(["real", "nominal"]).describe(
        "Real or nominal, on series that carry basis metadata.",
    ).optional(),
    official_only: z.boolean().describe(
        "Return only official-source rows (default true).",
    ).optional(),
    as_of: z.string().describe(
        "Point-in-time cutoff, ISO 8601 with a UTC offset: only rows " +
            "available by then are returned, as they stood then.",
    ).nullable().optional(),
    availability: z.enum(["public", "captured"]).describe(
        "Clock `as_of` is compared with: `public` (default) is when the " +
            "publisher released the figure, `captured` when FXMacroData " +
            "recorded it.",
    ).optional(),
    dataset_version: z.string().describe(
        "Content version from the first page's response. Sending it on " +
            "later pages pins the read; if the history changed the API " +
            "returns 409 and the download should restart.",
    ).nullable().optional(),
}).strict();
