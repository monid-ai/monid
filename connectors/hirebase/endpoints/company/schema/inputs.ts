import { z } from "zod";

export const zCompanyPathParams = z.strictObject({
    company_slug: z.string().min(1).describe(
        'The company\'s Hirebase slug, e.g. "stripe" — the company_slug ' +
            "on any job or company search result.",
    ),
});
