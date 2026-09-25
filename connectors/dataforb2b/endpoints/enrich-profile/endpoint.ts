import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { z } from "zod";
import { zEnrichProfileBody } from "./schema/inputs.ts";

const flag = z.literal(true);

/** POST /enrich/profile — one person's full profile and contact data,
 *  each requested item charged only when found. */
export default defineEndpoint({
    meta: {
        displayName: "Enrich Profile",
        summary: "Get a person's full profile, work email, personal email, " +
            "phone and GitHub from a profile id, URL or X handle.",
        description: "Enrich one person, choosing exactly which data to " +
            "fetch: the full profile (work history with company ids, " +
            "education, skills, certifications, languages), a work email, " +
            "a personal email, a phone number, and GitHub activity. Each " +
            "item is charged only when found — a request for a phone that " +
            "finds none costs nothing for that item — so request only what " +
            "the task needs; the phone is by far the most expensive line. " +
            "Accepts the `id` returned by /search/people (most reliable), a " +
            "profile URL or public slug, or an X handle. Emails and phone " +
            "are best-effort when the person is identified from X only. " +
            "To find people first, use /search/people.",
        docsUrl: "https://docs.dataforb2b.ai/api-reference/enrich-profile",
        categories: ["people-enrichment"],
        notes: [
            "At least one enrich_* flag must be true; otherwise the API " +
            "answers 422.",
            "A profile that cannot be found answers 404 only when " +
            "enrich_profile is requested; contact-only requests answer 200 " +
            "with null fields.",
            "enrich_github implies enrich_profile and is billed as the " +
            "profile; the GitHub data itself is free.",
        ],
    },
    request: { method: "POST", path: "/enrich/profile" },
    input: {
        schema: {
            // "at least one enrich_* flag set to true" — the vendor's rule,
            // one arm per flag (the hunterio /discover pattern)
            body: z.union([
                zEnrichProfileBody.extend({ enrich_profile: flag }),
                zEnrichProfileBody.extend({ enrich_work_email: flag }),
                zEnrichProfileBody.extend({ enrich_personal_email: flag }),
                zEnrichProfileBody.extend({ enrich_phone: flag }),
                zEnrichProfileBody.extend({ enrich_github: flag }),
            ]).describe(
                "Set at least one of enrich_profile, enrich_work_email, " +
                    "enrich_personal_email, enrich_phone, enrich_github to " +
                    "true.",
            ),
        },
    },
    usage: {
        /** The published card (docs, 2026-09-23), one line per item, each
         *  counted only when found. GitHub data is free (it implies, and
         *  bills as, the profile). The `credits_used` receipt is the claim
         *  that bills (provider consolidate). */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                profile: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 1.5 },
                    label: "full profile",
                },
                work_email: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 1 },
                    label: "work email",
                },
                personal_email: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 3 },
                    label: "personal email",
                },
                phone: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 10 },
                    label: "phone",
                },
            },
        },
        /** Ceiling: every requested item, as if found. */
        estimate: ({ data }) => {
            const body = data.input.body;
            return {
                counts: {
                    ...(body.enrich_profile === true ||
                            body.enrich_github === true
                        ? { "profile": 1 }
                        : {}),
                    ...(body.enrich_work_email === true
                        ? { "work_email": 1 }
                        : {}),
                    ...(body.enrich_personal_email === true
                        ? { "personal_email": 1 }
                        : {}),
                    ...(body.enrich_phone === true ? { "phone": 1 } : {}),
                },
            };
        },
        /** The items that came back non-null. */
        evidence: ({ data, utils }) => {
            const out = data.output;
            const found = ["profile", "work_email", "personal_email", "phone"]
                .filter((key) => {
                    const value = utils.json.optionalGet(out, "$." + key);
                    return value !== undefined && value !== null &&
                        value !== "";
                });
            return {
                counts: {
                    ...(found.includes("profile") ? { "profile": 1 } : {}),
                    ...(found.includes("work_email")
                        ? { "work_email": 1 }
                        : {}),
                    ...(found.includes("personal_email")
                        ? { "personal_email": 1 }
                        : {}),
                    ...(found.includes("phone") ? { "phone": 1 } : {}),
                },
            };
        },
    },
});
