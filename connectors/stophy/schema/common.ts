import { z } from "zod";

/**
 * Request fragments several Stophy endpoints share, mirrored from the
 * vendor's endpoint catalog (https://api.stophy.dev/v1/endpoints) —
 * optionality only, no defaults (D25). Every Stophy body is
 * `additionalProperties: false`, so each endpoint's object is `.strict()`.
 */

/** ISO 3166-1 alpha-2 country code; the vendor accepts any case. */
export const zCountry = z.string().regex(/^[A-Za-z]{2}$/).describe(
    "ISO 3166-1 alpha-2 country code, e.g. us. Any case is accepted.",
);

/** Two-letter language code (the search endpoints). */
export const zLanguage2 = z.string().regex(/^[A-Za-z]{2}$/).describe(
    "Two-letter language code like en or pt. Any case is accepted.",
);

/** BCP 47 language tag (transcripts, Maps). */
export const zLanguageTag = z.string().regex(
    /^[A-Za-z]{2,3}(?:[-_][A-Za-z0-9]{2,4})?$/,
).describe("BCP 47 language tag, e.g. en or pt-BR. Any case is accepted.");

/** Domain allow/block lists on the Google search endpoints. */
export const zDomains = z.array(z.string()).max(10);

/** Google's Tools time filter. */
export const zGoogleTime = z.enum([
    "pastHour",
    "past24Hours",
    "pastWeek",
    "pastMonth",
    "pastYear",
]).describe("Google's Tools time filter. Leave out for any time.");

/** The opaque paging cursor list endpoints return. */
export const zCursor = z.string().min(1).describe(
    "The cursor from the previous response. Send it as is.",
);
