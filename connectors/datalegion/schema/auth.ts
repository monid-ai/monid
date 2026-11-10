import { z } from "zod";

/**
 * The credential SHAPE of the Data Legion account (design D1): Monid holds
 * six dedicated product keys — person Base / Premium, each with or without
 * PII, and company Base / Premium. The KEY selects the product: Data Legion
 * returns that product's fields and bills that product's rate. All six
 * travel together as one credential object, declared once on the provider
 * (v1 parity: `api_key_<product>`, one per product). WHICH key an endpoint
 * sends is that endpoint's own `auth.inject`: the products share two wire
 * paths, so the request alone cannot tell them apart.
 *
 * Only the SHAPE lives here — never a value.
 */
export const zDatalegionCredentials = z.object({
    personBaseNoPiiApiKey: z.string().min(1).describe(
        "The Data Legion API key of the Person Base (No PII) product.",
    ),
    personBasePiiApiKey: z.string().min(1).describe(
        "The Data Legion API key of the Person Base (PII) product.",
    ),
    personPremiumNoPiiApiKey: z.string().min(1).describe(
        "The Data Legion API key of the Person Premium (No PII) product.",
    ),
    personPremiumPiiApiKey: z.string().min(1).describe(
        "The Data Legion API key of the Person Premium (PII) product.",
    ),
    companyBaseApiKey: z.string().min(1).describe(
        "The Data Legion API key of the Company Base product.",
    ),
    companyPremiumApiKey: z.string().min(1).describe(
        "The Data Legion API key of the Company Premium product.",
    ),
});

/**
 * The credential field names, derived from the shape above so the live-test
 * gate can never drift from it: `liveSkip("datalegion", DATALEGION_KEYS)`
 * opens only when all six `DATALEGION_CREDENTIALS_*_API_KEY` are set.
 */
export const DATALEGION_KEYS: readonly string[] = Object.keys(
    zDatalegionCredentials.shape,
);
