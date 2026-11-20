import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zLiteRevealBody } from "./schema/inputs.ts";

const enrichment = zLiteRevealBody.shape.enrichmentType.unwrap();

/** POST /v1/contact-details/lite — low-cost email / phone reveal. */
export default defineEndpoint({
    meta: {
        displayName: "Reveal Contact Details (Lite)",
        summary: "Find a person's work email, personal email, or phone " +
            "from LinkedIn or name + company domain.",
        description: "Reveal a person's contact details from a LinkedIn " +
            "identifier (mode 'linkedin') or full name + company domain " +
            "(mode 'name-domain'). Choose what to look for with " +
            "enrichmentType — work email (on by default), personal email, " +
            "phone. Returns { output: { profile: { emails[], " +
            "phoneNumbers[], unmatchedWorkEmails[] } } }; each email " +
            "carries its type (work | personal), a validationStatus " +
            "(valid | risky | unknown | invalid), a deliverability score, " +
            "and a catch-all flag. Work emails on a domain other than the " +
            "person's current company land in unmatchedWorkEmails. Fiber's " +
            "lowest-priced reveal: cheaper, with lower yield than its full " +
            "waterfall. Charged only for what is found.",
        docsUrl: "https://api.fiber.ai/ai-docs/liteContactReveal.md",
        categories: ["people-enrichment"],
        notes: [
            "Email is charged per email TYPE found (work and personal are " +
            "one charge each, however many addresses of that type come " +
            "back); phone at most once per request.",
            "Typical latency is a few seconds; with a high `patience` the " +
            "deliverability check can take up to about two minutes.",
        ],
    },
    request: { method: "POST", path: "/contact-details/lite" },
    input: {
        schema: {
            // Fiber's documented enrichmentType defaults, materialized at
            // the binding (D25) because they select the billed lines.
            body: zLiteRevealBody.extend({
                enrichmentType: enrichment.extend({
                    getWorkEmails: enrichment.shape.getWorkEmails.unwrap()
                        .default(true),
                    getPersonalEmails: enrichment.shape.getPersonalEmails
                        .unwrap().default(false),
                    getPhoneNumbers: enrichment.shape.getPhoneNumbers.unwrap()
                        .default(false),
                }).prefault({}).describe(
                    "Which contact types to look for. Each type found is " +
                        "charged; types not requested are never charged.",
                ),
            }),
        },
    },
    usage: {
        /** Two metered lines (Fiber platform defaults):
         *  `liteEmailReveal` 1 credit per email type delivered (0-2) and
         *  `litePhoneReveal` 2 credits when a phone is delivered (0-1). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                email: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "email types found",
                    description: "work and personal email are one each",
                    consumes: { credit: "default", amount: 1 },
                },
                phone: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "phone found",
                    consumes: { credit: "default", amount: 2 },
                },
            },
        },
        /** The upfront ceiling Fiber itself holds: one email charge per
         *  requested type, one phone charge if phones were requested. */
        estimate: ({ data }) => {
            const wanted = data.input.body.enrichmentType;
            return {
                counts: {
                    email: (wanted.getWorkEmails ? 1 : 0) +
                        (wanted.getPersonalEmails ? 1 : 0),
                    phone: wanted.getPhoneNumbers ? 1 : 0,
                },
            };
        },
        /** Fiber's delivered rule: no email → 0; both types requested
         *  and both found → 2; any other hit → 1. Phone → 1 when phones
         *  were requested and one came back. */
        evidence: ({ data, utils }) => {
            const wanted = data.input.body.enrichmentType;
            const emails = utils.json.optionalGet(
                data.output,
                "$.output.profile.emails",
            );
            const phones = utils.json.optionalGet(
                data.output,
                "$.output.profile.phoneNumbers",
            );
            const types = Array.isArray(emails)
                ? emails.map((e) =>
                    e !== null && typeof e === "object" && !Array.isArray(e)
                        ? e.type
                        : undefined
                )
                : [];
            const both = wanted.getWorkEmails && wanted.getPersonalEmails &&
                types.includes("work") && types.includes("personal");
            const email = types.length === 0 ? 0 : both ? 2 : 1;
            const phoneFound = Array.isArray(phones) &&
                phones.some((p) =>
                    p !== null && typeof p === "object" && !Array.isArray(p) &&
                    typeof p.phoneNumber === "string" && p.phoneNumber !== ""
                );
            return {
                counts: {
                    email,
                    phone: wanted.getPhoneNumbers && phoneFound ? 1 : 0,
                },
            };
        },
    },
});
