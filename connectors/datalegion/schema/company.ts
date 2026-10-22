import { z } from "zod";
import { zMatchControls } from "./common.ts";

/** `POST /company/enrich` body, identical for both company products — the
 *  key, not the body, selects the product (design D1). Each endpoint binds
 *  it as a union requiring one of the six identifiers (design D4). */
export const zCompanyEnrichBody = z.object({
    domain: z.string().min(1).optional().describe(
        "Company website domain (e.g. google.com).",
    ),
    name: z.string().min(1).optional().describe(
        "Company name (fuzzy matching; pair with industry for accuracy).",
    ),
    industry: z.string().min(1).optional().describe(
        "Industry, to sharpen a name match.",
    ),
    linkedin_id: z.string().min(1).optional().describe(
        "LinkedIn company numeric id.",
    ),
    social_url: z.string().min(1).optional().describe(
        "Social profile URL (LinkedIn, Facebook, Crunchbase, X/Twitter, " +
            "GitHub).",
    ),
    ticker_symbol: z.string().min(1).optional().describe(
        "Stock ticker symbol (e.g. GOOGL).",
    ),
    legion_id: z.string().min(1).optional().describe(
        "Data Legion company id (exact match).",
    ),
    ...zMatchControls,
}).strict();
