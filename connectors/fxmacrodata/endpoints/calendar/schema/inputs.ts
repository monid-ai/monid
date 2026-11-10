import { z } from "zod";
import { CURRENCIES, zDate, zIndicator } from "../../../schema/common.ts";

/** The calendar also takes `COMM`, the commodity release calendar. */
export const zCalendarPathParams = z.object({
    currency: z.enum([...CURRENCIES, "COMM"]).describe(
        "Three-letter currency code, upper case, or `COMM` for commodity " +
            "releases. USD works without an API key.",
    ),
});

/** GET /v1/calendar/{currency} query params (published OpenAPI). */
export const zCalendarQueryParams = z.object({
    indicator: zIndicator.describe(
        "Only releases of this indicator slug.",
    ).optional(),
    start_date: zDate.describe("Inclusive lower bound YYYY-MM-DD.")
        .optional(),
    end_date: zDate.describe("Inclusive upper bound YYYY-MM-DD.")
        .optional(),
    timezone: z.string().describe(
        "IANA timezone, for example America/New_York, for an extra " +
            "converted timestamp on every row.",
    ).optional(),
}).strict();
