import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zEmailVerifierQueryParams } from "./schema/inputs.ts";

/** GET /email-verifier — can an email address receive mail? */
export default defineEndpoint({
    meta: {
        displayName: "Verify Email",
        summary:
            "Check whether an email address can receive mail, with every SMTP and domain check.",
        description: "Verify one email address in real time. Returns the " +
            "outcome in data.email.status (valid, invalid, accept_all, " +
            "webmail, disposable, unknown) and data.email.result " +
            "(deliverable, undeliverable, risky), a 0-100 score, and every " +
            "individual check: MX records, SMTP server and mailbox, " +
            "catch-all, greylisting, block, gibberish, disposable, webmail, " +
            "syntax, the SMTP provider, and the domain's WHOIS; plus the " +
            "public pages the address appears on, and optionally the " +
            "person's phone numbers with enrich_mobile. Suited for cleaning " +
            "lists before a send and gating sign-ups.",
        docsUrl: "https://docs.tomba.io/api/verifier#email-verifier",
        categories: ["people-enrichment"],
        notes: [
            "Charged 1 verification credit unless the status is " +
            "`disposable` or `unknown`.",
            "Each phone number returned with enrich_mobile=true costs 5 " +
            "more credits, drawn here from the search balance (design D6).",
        ],
    },
    request: { method: "GET", path: "/email-verifier" },
    input: {
        schema: {
            queryParams: zEmailVerifierQueryParams.required({ email: true }),
        },
    },
    usage: {
        /** Two pools on one doc (design D6): the verdict draws the
         *  verification balance, each phone number the search balance. */
        model: {
            kind: UsageModelKind.COMPOSITE,
            components: {
                verification: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "verifications",
                    description: "definitive verdicts (not disposable or " +
                        "unknown)",
                    consumes: { credit: "verification", amount: 1 },
                },
                phones: {
                    kind: UsageModelKind.PER_UNIT,
                    unit: Unit.RESULT,
                    label: "phone numbers",
                    description: "phone numbers returned (enrich_mobile=true)",
                    consumes: { credit: "search", amount: 5 },
                },
            },
        },
        /** One verdict; the phone line is unbounded upstream, so the
         *  estimate states one number when the add-on is requested. */
        estimate: ({ data }) => ({
            counts: {
                verification: 1,
                phones: data.input.queryParams.enrich_mobile === true ? 1 : 0,
            },
        }),
        evidence: ({ data, utils }) => {
            const status = utils.json.optionalGet(
                data.output,
                "$.data.email.status",
            );
            const charged = typeof status === "string" && status !== "" &&
                status !== "disposable" && status !== "unknown";
            // `phone_data` may be absent, `[]`, or `null` (Tomba's own
            // disposable example) — never trust it to be an array
            const phoneData = utils.json.optionalGet(
                data.output,
                "$.data.phone_data",
            );
            const phones = Array.isArray(phoneData) ? phoneData.length : 0;
            return {
                counts: { verification: charged ? 1 : 0, phones },
            };
        },
    },
});
