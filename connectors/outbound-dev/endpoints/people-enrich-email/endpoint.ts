import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEnrichPersonBody } from "../../schema/person.ts";

/**
 * `POST /people/enrich` — find one person's work email.
 *
 * ONE ROUTE, TWO ENDPOINTS: outbound.dev's enrichment finds an email, a
 * phone number or both, by `find`. This endpoint is the email half (the
 * route's own default, so no `find` is sent) and
 * `outbound-dev#people/enrich/phone` is the phone half; each declares its
 * own `endpoint` because they share the native path (contactout's twins).
 *
 * ONE REQUEST: the package answers in seconds; with `providers: "waterfall"`
 * the further providers run inside the request, which can take over a
 * minute. It goes through a single-shot `lifecycle.start` so it can carry a
 * run-stable `Idempotency-Key`: a retried start gets the first answer back
 * instead of a second, charged lookup.
 *
 * BILLED PER VALUE FOUND, BY WHO FOUND IT: `found.email` holds the address
 * the call is charged for, with `foundBy`: $0.02 from the package, $0.05
 * from the waterfall. `found` is outbound.dev's own statement of the charge,
 * which `emails` is not, so the evidence reads `found` alone: a miss leaves
 * it empty and counts zero.
 *
 * `personId` names the contact in the outbound.dev workspace that holds the
 * key, never the caller's, so `fromResponse` drops it.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Work Email",
        summary:
            "Find a person's work email from their LinkedIn URL, or their name and company.",
        description: "Find a person's work email. Send a LinkedIn profile " +
            "URL (`linkedinUrl`), or a name (`fullName`, or `firstName` and " +
            "`lastName`) with the company's domain or name " +
            "(`companyDomain` or `companyName`). Returns work emails that " +
            "checked `valid` or `catch-all`, and a miss costs nothing. " +
            "Personal addresses are left out and never charged. With " +
            '`providers: "waterfall"` further providers are tried when ' +
            "outbound.dev's own data misses, at $0.05 per email they find. " +
            "The answer carries `emails` (each address with its `status`), " +
            "`primaryEmail` (the address to write to) and `found.email` " +
            "(the address this call found, with who found it: what the " +
            "call is charged for). For a phone number, use " +
            "`outbound-dev#people/enrich/phone`; for up to 100 people at " +
            "once, `outbound-dev#people/enrich/batch`; to check an address " +
            "you already have, `outbound-dev#emails/verify`.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/enrichment/enrich-a-person",
        categories: ["people-enrichment"],
        notes: [
            "Charged only when a work email is found: $0.02 from " +
            "outbound.dev's own data, $0.05 from a further provider " +
            '(`providers: "waterfall"` only).',
            "A waterfall search can take over a minute: allow two.",
            "A person who cannot be identified from what was sent answers " +
            "422 `person_not_identifiable`, and one already being enriched " +
            "409 `enrichment_in_progress`; both charge nothing.",
        ],
    },
    endpoint: "/people/enrich/email",
    request: { method: "POST", path: "/people/enrich" },
    input: { schema: { body: zEnrichPersonBody } },
    /** ONE REQUEST, under a run-stable `Idempotency-Key` (design D34):
     *  outbound.dev answers a repeat of it with the first answer instead of
     *  running, and charging, the call again. */
    lifecycle: {
        start: async ({ data, utils }) => {
            const res = await utils.request({
                headers: {
                    ...data.request.headers,
                    "Idempotency-Key": data.run.runId + ":call",
                },
            });
            return {
                kind: "COMPLETED",
                httpStatus: res.status,
                output: res.body,
            };
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                email_found_package: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.02 },
                    label: "email found by the package",
                    description: "a work email outbound.dev's own data found",
                },
                email_found_waterfall: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.05 },
                    label: "email found by the waterfall",
                    description: "a work email a further provider found",
                },
            },
        },
        /** One email found, at the dearest line the request can reach:
         *  the waterfall's when it was asked for, else the package's. */
        estimate: ({ data }) => ({
            counts: data.input.body.providers === "waterfall"
                ? { email_found_package: 0, email_found_waterfall: 1 }
                : { email_found_package: 1, email_found_waterfall: 0 },
        }),
        evidence: ({ data, utils }) => {
            const foundBy = utils.json.optionalGet(
                data.output,
                "$.found.email.foundBy",
            );
            return {
                counts: {
                    email_found_package: foundBy === "package" ? 1 : 0,
                    email_found_waterfall: foundBy === "waterfall" ? 1 : 0,
                },
            };
        },
    },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["personId"]),
    },
});
