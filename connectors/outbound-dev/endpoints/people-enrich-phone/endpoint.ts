import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEnrichPersonBody } from "../../schema/person.ts";

/**
 * `POST /people/enrich` with `find: "phone"` — find one person's phone
 * number.
 *
 * The phone half of outbound.dev's enrichment route (the email half is
 * `outbound-dev#people/enrich/email`). The caller never sends `find`:
 * `toRequest` states it, so this endpoint finds phone numbers and nothing
 * else.
 *
 * ONE REQUEST under a run-stable `Idempotency-Key`, like the email lookup,
 * and BILLED PER VALUE FOUND, BY WHO FOUND IT:
 * `found.phone` holds the number the call is charged for, with `foundBy`:
 * $0.05 from the package, $0.10 from the waterfall. A miss leaves it empty
 * and counts zero.
 */
export default defineEndpoint({
    meta: {
        displayName: "Find Phone Number",
        summary:
            "Find a person's phone number from their LinkedIn URL, or their name and company.",
        description: "Find a person's phone number. Send a LinkedIn " +
            "profile URL (`linkedinUrl`), or a name (`fullName`, or " +
            "`firstName` and `lastName`) with the company's domain or name " +
            "(`companyDomain` or `companyName`). Each number comes with its " +
            "check when it has one: `valid`, `hq` (the company's main line) " +
            "or `unverified`. A miss costs nothing, and `providers: " +
            '"waterfall"` adds further providers at $0.10 per number they ' +
            "find. The answer carries `phones` (each `phoneNumber` with its " +
            "`status`), `primaryPhone` (the number to call) and " +
            "`found.phone` (the number this call found, with who found it: " +
            "what the call is charged for). For a work email, use " +
            "`outbound-dev#people/enrich/email`; for up to 100 people at " +
            "once, `outbound-dev#people/enrich/batch`.",
        docsUrl:
            "https://docs.outbound.dev/api-reference/enrichment/enrich-a-person",
        categories: ["people-enrichment"],
        notes: [
            "Charged only when a phone number is found: $0.05 from " +
            "outbound.dev's own data, $0.10 from a further provider " +
            '(`providers: "waterfall"` only).',
            "A waterfall search can take over a minute: allow two.",
            "A person who cannot be identified from what was sent answers " +
            "422 `person_not_identifiable`, and one already being enriched " +
            "409 `enrichment_in_progress`; both charge nothing.",
        ],
    },
    endpoint: "/people/enrich/phone",
    request: { method: "POST", path: "/people/enrich" },
    input: {
        schema: { body: zEnrichPersonBody },
        toRequest: ({ data, utils }) => ({
            ...data.input,
            body: utils.json.merge(data.input.body ?? {}, { find: "phone" }),
        }),
    },
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
            if (
                res.status === 409 &&
                utils.json.optionalGet(res.body, "$.error.code") ===
                    "idempotency_in_progress"
            ) {
                // An earlier attempt of this same call is still being
                // answered and may yet charge. Fail this attempt, so a
                // retry under the same key meets that answer instead of the
                // run settling at zero beside it.
                throw new Error(
                    "outbound.dev is still answering this run's earlier call",
                );
            }
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
                phone_found_package: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.05 },
                    label: "phone found by the package",
                    description: "a phone number outbound.dev's own data found",
                },
                phone_found_waterfall: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    consumes: { credit: "default", amount: 0.1 },
                    label: "phone found by the waterfall",
                    description: "a phone number a further provider found",
                },
            },
        },
        /** One number found, at the dearest line the request can reach:
         *  the waterfall's when it was asked for, else the package's. */
        estimate: ({ data }) => ({
            counts: data.input.body.providers === "waterfall"
                ? { phone_found_package: 0, phone_found_waterfall: 1 }
                : { phone_found_package: 1, phone_found_waterfall: 0 },
        }),
        evidence: ({ data, utils }) => {
            const foundBy = utils.json.optionalGet(
                data.output,
                "$.found.phone.foundBy",
            );
            return {
                counts: {
                    phone_found_package: foundBy === "package" ? 1 : 0,
                    phone_found_waterfall: foundBy === "waterfall" ? 1 : 0,
                },
            };
        },
    },
    output: {
        fromResponse: ({ data, utils }) =>
            utils.json.omit(data.output, ["personId"]),
    },
});
