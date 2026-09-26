import { defineProvider, presets } from "@shared/core";

/**
 * Insuron's approved-application API. This connector only submits an
 * caller-attested insurance objective and reads that application's
 * public request status. It never sends phone/email contact details.
 */
export default defineProvider({
    name: "insuron",
    meta: {
        displayName: "Insuron",
        summary:
            "Submit caller-attested insurance requests and read their public status.",
        description:
            "Submit insurance objectives with a caller attestation and " +
            "permission reference, then read public status scoped to an " +
            "approved Insuron application. Consent is not independently " +
            "verified by this connector.",
        homepageUrl: "https://insuron.io",
        docsUrl: "https://insuron.io",
        categories: ["insurance-matching"],
        notes: [
            "A consumer's permission to share an insurance request does not " +
            "authorize a phone call or SMS. This connector sends no " +
            "phone or email fields and does not make calls, create quotes, " +
            "or issue policies.",
            "The bearer credential scopes to an approved Insuron application, " +
            "not a Monid agent or workspace. Hosted credential-to-app " +
            "isolation has NOT been verified. Do not use live network or " +
            "share credentials until the host confirms the mapping, " +
            "Insuron approves the application, and the caller retains " +
            "auditable consent evidence. The connector requires the " +
            "caller's attestation and reference; it does not verify consent.",
            "Free-text objective and consentReference may contain sensitive " +
            "content even though name, phone, and email fields are not accepted.",
        ],
    },
    auth: { inject: presets.auth.bearer() },
    request: {
        baseUrl: "https://insuron.io/api",
        headers: { Accept: "application/json" },
    },
});
