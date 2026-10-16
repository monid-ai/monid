import { z } from "zod";

export const zBody = z.strictObject({
    startDate: z.iso.date().nullable().describe(
        "Start date (YYYY-MM-DD). Use null for the start of the current month in the household's time zone.",
    ),
    endDate: z.iso.date().nullable().describe(
        "Inclusive end date (YYYY-MM-DD). Use null for today in the household's time zone.",
    ),
});
