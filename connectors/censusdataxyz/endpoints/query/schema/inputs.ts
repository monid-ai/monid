import { z } from "zod";

/** `GET /query` query params (censusdata.xyz/skill, 2026-10-21). */
export const zQueryParams = z.object({
    q: z.string().min(1).describe(
        "A natural-language US Census question. Name the indicators, " +
            "geographies (states, counties, cities or places, metro areas, " +
            "or ZIP codes), and years in plain English. Examples: 'What is " +
            "the poverty rate in Chicago, IL?'; 'Compare the median " +
            "household income and work-from-home percentage in Seattle, WA " +
            "and Portland, OR in 2022.'; 'Which counties in Washington state " +
            "have the highest bachelor's degree percentages?'",
    ),
}).strict();
