import { z } from "zod";

/**
 * Fragments shared by two or more salesbook endpoints, mirrored from
 * https://mcp.maxeds.org/v1/openapi.json (v0.5.0, read 2026-10-22).
 */

/** The six ranked sector corpora. `horizontal` is cross-industry;
 *  `agentic` is agentic commerce (agent payments, identity, inboxes,
 *  tools and directories). */
export const zSalesbookSector = z.enum([
    "retail",
    "manufacturing",
    "healthcare",
    "education",
    "horizontal",
    "agentic",
]);
