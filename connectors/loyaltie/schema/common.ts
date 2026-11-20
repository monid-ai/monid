import { z } from "zod";

/** Shared fragments of Loyaltie's MCP tool arguments (faithful mirror of
 *  the server's published inputSchema, trimmed to the fields an agent
 *  needs). */

export const zUuid = z.string().regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
);

export const zProductRef = z.string().min(1).max(2048).describe(
    "Product id (UUID) or the loyaltie.com product URL exactly as a " +
        "search returned it.",
);

export const zIntent = z.string().max(500).describe(
    "The person's task in a few words, e.g. 'healthy pasta for the " +
        "family, delivered every month'. Improves ranking; never shared.",
);

export const zContext = z.object({
    intent: zIntent.optional(),
    address_country: z.string().length(2).optional().describe(
        "ISO 3166-1 alpha-2 country of the person, e.g. US.",
    ),
    address_region: z.string().min(1).optional().describe(
        "The person's US state, e.g. NC. Ranks nearby brands higher.",
    ),
}).describe(
    "Soft context: ranks and localizes, never removes a product.",
);
