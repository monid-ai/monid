import { defineEndpoint, Unit, UsageModelKind } from "@shared/core";
import { zWhatsappNumbersBody } from "./schema/inputs.ts";

/**
 * Mindcase `whatsapp/numbers`. Generated from the live agent schema;
 * the async job lifecycle, error digest and `usd_used` claim are inherited
 * from the provider.
 */
export default defineEndpoint({
    meta: {
        displayName: "WhatsApp Number Validator",
        summary:
            "Validate phone numbers against WhatsApp: check whether each " +
            "number is registered, whether it is a business or personal " +
            "account, and the public profile and...",
        description:
            "Validate phone numbers against WhatsApp: check whether each " +
            "number is registered, whether it is a business or personal " +
            "account, and the public profile and business details the " +
            "account shows. Returns one row per number with phone, " +
            "hasWhatsapp, accountType, checkStatus, business, profile, " +
            "identity, devices. $0.0105 per number; empty runs cost " +
            "nothing.",
        docsUrl: "https://docs.mindcase.co/apis/whatsapp/numbers",
        categories: ["people-enrichment"],
        notes: [
            "Requires Send at least one phone number.",
        ],
    },
    endpoint: "/whatsapp/numbers",
    request: { method: "POST", path: "/v1/data/whatsapp/numbers/run" },
    input: {
        schema: {
            body: zWhatsappNumbersBody,
        },
    },
    usage: {
        model: {
            kind: UsageModelKind.PER_UNIT,
            unit: Unit.RESULT,
            consumes: { credit: "default", amount: 0.0105 },
        },
        estimate: ({ data }) => {
            const body = data.input.body;
            const capped = body.phoneNumbers.length;
            const rows = capped;
            return { counts: { RESULT: rows } };
        },
    },
});
