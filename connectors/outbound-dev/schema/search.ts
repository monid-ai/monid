import { z } from "zod";

/**
 * A search's filters, as the three searches and the two counts take them:
 * an open object, filter name to value, mirroring outbound.dev's published
 * request (design D25). outbound.dev checks every name and value where the
 * search runs and refuses a bad one with 422, naming it in `param`, so the
 * mirror does not enumerate the vocabulary: the two filter-value endpoints
 * serve it.
 */
export const zSearchFilters = z.record(z.string(), z.any());

/** The `pagination.nextCursor` of the page before, sent back for the next. */
export const zSearchCursor = z.string().min(1).max(65536);
